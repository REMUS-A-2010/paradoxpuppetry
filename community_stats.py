"""Local community metrics and optional public social-platform counts."""

from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterator
from urllib.parse import urlencode
from urllib.request import Request, urlopen


COMMUNITY_DB_PATH = Path(
    os.environ.get(
        "PP_COMMUNITY_STATS_FILE",
        str(Path.home() / ".paradox-puppetry-community.sqlite3"),
    )
).expanduser()
YOUTUBE_HANDLE = os.environ.get("PP_YOUTUBE_HANDLE", "@ParadoxPuppetryOfficials").strip()
YOUTUBE_API_KEY = os.environ.get("PP_YOUTUBE_API_KEY", "").strip()
DISCORD_INVITE_CODE = os.environ.get("PP_DISCORD_INVITE_CODE", "zvnVQHQ87").strip()
INSTAGRAM_HANDLE = os.environ.get("PP_INSTAGRAM_HANDLE", "").strip().lstrip("@")
INSTAGRAM_USER_ID = os.environ.get("PP_INSTAGRAM_USER_ID", "").strip()
INSTAGRAM_ACCESS_TOKEN = os.environ.get("PP_INSTAGRAM_ACCESS_TOKEN", "").strip()
INSTAGRAM_GRAPH_VERSION = os.environ.get("PP_INSTAGRAM_GRAPH_VERSION", "v22.0").strip()

SOCIAL_CACHE_SECONDS = 300
SOCIAL_SAMPLE_SECONDS = 6 * 60 * 60
VISITOR_RETENTION_DAYS = 90
_SOCIAL_CACHE: dict | None = None
_SOCIAL_CACHE_AT = 0.0
_SOCIAL_CACHE_LOCK = threading.Lock()


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    COMMUNITY_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(COMMUNITY_DB_PATH, timeout=5)
    try:
        connection.row_factory = sqlite3.Row
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS daily_page_views (
                day TEXT PRIMARY KEY,
                page_views INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS daily_unique_visitors (
                day TEXT NOT NULL,
                visitor_hash TEXT NOT NULL,
                PRIMARY KEY (day, visitor_hash)
            );
            CREATE TABLE IF NOT EXISTS social_snapshots (
                platform TEXT NOT NULL,
                collected_at INTEGER NOT NULL,
                count INTEGER NOT NULL,
                PRIMARY KEY (platform, collected_at)
            );
            """
        )
        yield connection
    except BaseException:
        connection.rollback()
        raise
    else:
        connection.commit()
    finally:
        connection.close()
    return connection


def record_page_view(visitor_id: str) -> None:
    if not re.fullmatch(r"[A-Za-z0-9-]{16,64}", visitor_id):
        raise ValueError("A valid anonymous browser identifier is required.")
    visitor_hash = hashlib.sha256(visitor_id.encode("utf-8")).hexdigest()
    today = datetime.now(timezone.utc).date()
    day = today.isoformat()
    retention_start = (today - timedelta(days=VISITOR_RETENTION_DAYS - 1)).isoformat()
    with _connect() as connection:
        connection.execute(
            """
            INSERT INTO daily_page_views(day, page_views) VALUES (?, 1)
            ON CONFLICT(day) DO UPDATE SET page_views = page_views + 1
            """,
            (day,),
        )
        connection.execute(
            "INSERT OR IGNORE INTO daily_unique_visitors(day, visitor_hash) VALUES (?, ?)",
            (day, visitor_hash),
        )
        connection.execute("DELETE FROM daily_unique_visitors WHERE day < ?", (retention_start,))


def _read_json(url: str, *, headers: dict[str, str] | None = None) -> dict:
    request_headers = {"User-Agent": "ParadoxPuppetry-LocalDemo/1.0"}
    request_headers.update(headers or {})
    request = Request(url, headers=request_headers)
    with urlopen(request, timeout=3) as response:
        payload = json.loads(response.read(65_537).decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("The metrics provider returned an invalid response.")
    return payload


def _youtube_url() -> str:
    if not re.fullmatch(r"@?[A-Za-z0-9._-]{1,100}", YOUTUBE_HANDLE):
        return "https://www.youtube.com/"
    return f"https://www.youtube.com/{YOUTUBE_HANDLE}"


def _fetch_youtube() -> dict:
    result = {
        "platform": "YouTube",
        "status": "not_configured",
        "url": _youtube_url(),
        "handle": YOUTUBE_HANDLE,
        "count": None,
        "growth": None,
        "growthLabel": "Waiting for the first live reading",
        "message": "Add a YouTube Data API key to the local server to show subscribers.",
    }
    if not YOUTUBE_API_KEY:
        return result
    if not re.fullmatch(r"@?[A-Za-z0-9._-]{1,100}", YOUTUBE_HANDLE):
        result.update(status="unavailable", message="The YouTube handle is not valid.")
        return result
    query = urlencode({
        "part": "statistics",
        "forHandle": YOUTUBE_HANDLE.lstrip("@"),
        "key": YOUTUBE_API_KEY,
    })
    try:
        payload = _read_json(f"https://www.googleapis.com/youtube/v3/channels?{query}")
        items = payload.get("items")
        if not isinstance(items, list) or not items or not isinstance(items[0], dict):
            result.update(status="unavailable", message="The YouTube channel could not be found.")
            return result
        statistics = items[0].get("statistics")
        if not isinstance(statistics, dict):
            result.update(status="unavailable", message="YouTube did not return channel statistics.")
            return result
        subscriber_count = statistics.get("subscriberCount")
        if subscriber_count is None:
            result.update(status="hidden", message="The channel does not publish its subscriber count.")
            return result
        count = int(subscriber_count)
        if count < 0:
            raise ValueError("The subscriber count was invalid.")
        result.update(status="live", count=count, message="Live public subscriber count.")
        return result
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError, TypeError):
        result.update(status="unavailable", message="YouTube stats could not be fetched. Check the API key and quota.")
        return result


def _fetch_discord() -> dict:
    result = {
        "platform": "Discord",
        "status": "unavailable",
        "url": f"https://discord.gg/{DISCORD_INVITE_CODE}",
        "count": None,
        "online": None,
        "growth": None,
        "growthLabel": "Waiting for the first live reading",
        "message": "Discord member counts are currently unavailable.",
    }
    if not re.fullmatch(r"[A-Za-z0-9-]{2,64}", DISCORD_INVITE_CODE):
        result.update(message="The Discord invite code is not valid.")
        return result
    try:
        url = f"https://discord.com/api/v10/invites/{DISCORD_INVITE_CODE}?with_counts=true"
        payload = _read_json(url)
        member_count = payload.get("approximate_member_count")
        online_count = payload.get("approximate_presence_count")
        if not isinstance(member_count, int) or member_count < 0:
            result.update(message="Discord did not provide a public member count.")
            return result
        result.update(
            status="live",
            count=member_count,
            online=online_count if isinstance(online_count, int) and online_count >= 0 else None,
            message="Approximate live count from the Discord invite.",
        )
        return result
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError, TypeError):
        return result


def _fetch_instagram() -> dict:
    profile_url = f"https://www.instagram.com/{INSTAGRAM_HANDLE}/" if INSTAGRAM_HANDLE else None
    result = {
        "platform": "Instagram",
        "status": "not_connected",
        "url": profile_url,
        "count": None,
        "growth": None,
        "growthLabel": "Waiting for the first live reading",
        "message": "Create the Instagram account, then connect its professional-account API credentials locally.",
    }
    if not INSTAGRAM_HANDLE and not (INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN):
        return result
    if not INSTAGRAM_USER_ID or not INSTAGRAM_ACCESS_TOKEN:
        result.update(status="not_configured", message="Instagram exists, but its API connection is not configured.")
        return result
    if not re.fullmatch(r"[0-9]{1,32}", INSTAGRAM_USER_ID):
        result.update(status="unavailable", message="The Instagram Graph API user ID is not valid.")
        return result
    if not re.fullmatch(r"[A-Za-z0-9._]{1,30}", INSTAGRAM_HANDLE) and INSTAGRAM_HANDLE:
        result.update(status="unavailable", message="The Instagram handle is not valid.")
        return result
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,32}", INSTAGRAM_GRAPH_VERSION):
        result.update(status="unavailable", message="The Instagram Graph API version is not valid.")
        return result
    query = urlencode({
        "fields": "username,followers_count",
        "access_token": INSTAGRAM_ACCESS_TOKEN,
    })
    try:
        payload = _read_json(
            f"https://graph.facebook.com/{INSTAGRAM_GRAPH_VERSION}/{INSTAGRAM_USER_ID}?{query}"
        )
        count = payload.get("followers_count")
        if not isinstance(count, int) or count < 0:
            result.update(status="unavailable", message="Instagram did not provide a follower count.")
            return result
        username = payload.get("username")
        if isinstance(username, str) and re.fullmatch(r"[A-Za-z0-9._]{1,30}", username):
            result["url"] = f"https://www.instagram.com/{username}/"
        result.update(
            status="live",
            count=count,
            message="Live follower count from the connected Instagram professional account.",
        )
        return result
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError, TypeError):
        result.update(status="unavailable", message="Instagram stats could not be fetched. Check the local API setup.")
        return result


def _add_growth(platform: str, metrics: dict, collected_at: int) -> dict:
    count = metrics.get("count")
    if not isinstance(count, int):
        return metrics
    with _connect() as connection:
        previous = connection.execute(
            "SELECT count, collected_at FROM social_snapshots WHERE platform = ? ORDER BY collected_at DESC LIMIT 1",
            (platform,),
        ).fetchone()
        if previous is None:
            growth = None
        else:
            growth = count - previous["count"]
        if previous is None or collected_at - previous["collected_at"] >= SOCIAL_SAMPLE_SECONDS:
            connection.execute(
                "INSERT INTO social_snapshots(platform, collected_at, count) VALUES (?, ?, ?)",
                (platform, collected_at, count),
            )
    metrics["growth"] = growth
    metrics["growthLabel"] = "Since the previous snapshot" if growth is not None else "Building a growth baseline"
    return metrics


def _fetch_social_metrics() -> dict:
    now = int(time.time())
    return {
        "youtube": _add_growth("youtube", _fetch_youtube(), now),
        "discord": _add_growth("discord", _fetch_discord(), now),
        "instagram": _add_growth("instagram", _fetch_instagram(), now),
        "checkedAt": datetime.fromtimestamp(now, timezone.utc).isoformat(),
    }


def _social_metrics() -> dict:
    global _SOCIAL_CACHE, _SOCIAL_CACHE_AT
    now = time.time()
    with _SOCIAL_CACHE_LOCK:
        if _SOCIAL_CACHE is not None and now - _SOCIAL_CACHE_AT < SOCIAL_CACHE_SECONDS:
            return json.loads(json.dumps(_SOCIAL_CACHE))
        metrics = _fetch_social_metrics()
        _SOCIAL_CACHE = metrics
        _SOCIAL_CACHE_AT = now
        return json.loads(json.dumps(metrics))


def build_community_stats(active_website_members: int) -> dict:
    now = datetime.now(timezone.utc).date()
    today = now.isoformat()
    first_day = now - timedelta(days=13)
    month_start = now - timedelta(days=29)
    with _connect() as connection:
        page_views_today = connection.execute(
            "SELECT page_views FROM daily_page_views WHERE day = ?", (today,)
        ).fetchone()
        page_views_all_time = connection.execute(
            "SELECT COALESCE(SUM(page_views), 0) AS total FROM daily_page_views"
        ).fetchone()["total"]
        unique_today = connection.execute(
            "SELECT COUNT(*) AS total FROM daily_unique_visitors WHERE day = ?", (today,)
        ).fetchone()["total"]
        unique_30_days = connection.execute(
            "SELECT COUNT(DISTINCT visitor_hash) AS total FROM daily_unique_visitors WHERE day >= ?",
            (month_start.isoformat(),),
        ).fetchone()["total"]
        history_rows = connection.execute(
            "SELECT day, page_views FROM daily_page_views WHERE day >= ? AND day <= ?",
            (first_day.isoformat(), today),
        ).fetchall()
    page_views_by_day = {row["day"]: row["page_views"] for row in history_rows}
    history = [
        {
            "date": (first_day + timedelta(days=offset)).isoformat(),
            "pageViews": page_views_by_day.get((first_day + timedelta(days=offset)).isoformat(), 0),
        }
        for offset in range(14)
    ]
    return {
        "local": {
            "pageViewsToday": page_views_today["page_views"] if page_views_today else 0,
            "uniqueVisitorsToday": unique_today,
            "pageViewsAllTime": page_views_all_time,
            "uniqueVisitors30Days": unique_30_days,
            "activeWebsiteMembers": max(0, active_website_members),
            "history": history,
            "timezone": "UTC",
        },
        "social": _social_metrics(),
    }


def clear_social_cache() -> None:
    global _SOCIAL_CACHE, _SOCIAL_CACHE_AT
    with _SOCIAL_CACHE_LOCK:
        _SOCIAL_CACHE = None
        _SOCIAL_CACHE_AT = 0.0
