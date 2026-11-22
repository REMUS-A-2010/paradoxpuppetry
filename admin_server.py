#!/usr/bin/env python3
"""Loopback-only demo server for admin access and public visitor sign-in."""

from __future__ import annotations

import hmac
import hashlib
import json
import os
import re
import secrets
import sqlite3
import tempfile
import threading
import time
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request, urlopen

from community_stats import build_community_stats, record_page_view


ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = int(os.environ.get("PP_PORT", "8000"))
ADMIN_USER = os.environ.get("PP_ADMIN_USER", "Admin").strip()
ADMIN_PASSWORD = os.environ.get("PP_ADMIN_PASSWORD", "2010")
OWNER_USER = os.environ.get("PP_OWNER_USER", "Owner").strip()
OWNER_PASSWORD = os.environ.get("PP_OWNER_PASSWORD", "3004")
GOOGLE_CLIENT_ID = os.environ.get("PP_GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.environ.get("PP_GOOGLE_CLIENT_SECRET", "").strip()
GOOGLE_REDIRECT_URI = os.environ.get(
    "PP_GOOGLE_REDIRECT_URI", f"http://127.0.0.1:{PORT}/auth/google/callback"
).strip()
SESSION_COOKIE = "pp_demo_session"
CUSTOMER_SESSION_COOKIE = "pp_customer_session"
OAUTH_STATE_COOKIE = "pp_google_oauth_state"
SESSION_SECONDS = 4 * 60 * 60
PASSWORD_HASH_ITERATIONS = 310_000
OAUTH_STATE_SECONDS = 5 * 60
ADMIN_ACCOUNTS_PATH = Path(
    os.environ.get("PP_ADMIN_ACCOUNTS_FILE", str(Path.home() / ".paradox-puppetry-admins.json"))
).expanduser()
ADMIN_ACCOUNTS_LOCK = threading.RLock()
SESSION_LOCK = threading.RLock()
OAUTH_STATE_LOCK = threading.RLock()
SESSIONS: dict[str, tuple[str, str, float]] = {}
OAUTH_STATES: dict[str, float] = {}


def _is_local_redirect_uri(uri: str) -> bool:
    parsed = urlsplit(uri)
    return (
        parsed.scheme == "http"
        and parsed.hostname in ("127.0.0.1", "localhost", "::1")
        and parsed.path == "/auth/google/callback"
        and parsed.port == PORT
        and bool(parsed.netloc)
    )


if not _is_local_redirect_uri(GOOGLE_REDIRECT_URI):
    raise SystemExit("Google sign-in is local-only and requires an HTTP loopback callback URL.")

if os.environ.get("PP_ENV", "development").lower() == "production":
    raise SystemExit("This server is a local demo only and cannot run in production.")
if ADMIN_USER.casefold() == OWNER_USER.casefold():
    raise SystemExit("Admin and owner demo usernames must be different.")


def _admin_key(username: str) -> str:
    return username.strip().casefold()


def _valid_email(email: str) -> bool:
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email))


def _hash_password(password: str, salt: bytes | None = None) -> dict[str, str]:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS)
    return {
        "salt": salt.hex(),
        "passwordHash": digest.hex(),
        "createdAt": time.strftime("%Y-%m-%d", time.gmtime()),
    }


def _verify_password(password: str, record: dict[str, str]) -> bool:
    try:
        salt = bytes.fromhex(record["salt"])
        expected = bytes.fromhex(record["passwordHash"])
    except (KeyError, ValueError):
        return False
    if len(salt) != 16 or len(expected) != 32:
        return False
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS)
    return hmac.compare_digest(actual, expected)


def _save_admin_accounts(accounts: dict[str, dict[str, str]]) -> None:
    temp_path: Path | None = None
    try:
        ADMIN_ACCOUNTS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=ADMIN_ACCOUNTS_PATH.parent,
            prefix=f"{ADMIN_ACCOUNTS_PATH.name}.",
            suffix=".tmp",
            delete=False,
        ) as temp_file:
            temp_path = Path(temp_file.name)
            json.dump({"accounts": accounts}, temp_file, indent=2)
            temp_file.write("\n")
        os.replace(temp_path, ADMIN_ACCOUNTS_PATH)
    except OSError as error:
        raise RuntimeError(f"Could not save local admin access accounts: {error}") from error
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()


def _load_admin_accounts() -> dict[str, dict[str, str]]:
    if not ADMIN_ACCOUNTS_PATH.exists():
        if _admin_key(ADMIN_USER) == _admin_key(OWNER_USER):
            raise SystemExit("The default admin username conflicts with the owner username.")
        initial = {_admin_key(ADMIN_USER): {"username": ADMIN_USER, **_hash_password(ADMIN_PASSWORD)}}
        try:
            _save_admin_accounts(initial)
        except RuntimeError as error:
            raise SystemExit(f"Could not initialize local admin access accounts: {error}") from error
        return initial

    try:
        payload = json.loads(ADMIN_ACCOUNTS_PATH.read_text(encoding="utf-8"))
        raw_accounts = payload["accounts"]
        if not isinstance(raw_accounts, dict):
            raise ValueError("the accounts value must be an object")
        accounts = {}
        for key, record in raw_accounts.items():
            if (
                not isinstance(key, str)
                or not isinstance(record, dict)
                or not isinstance(record.get("username"), str)
                or not isinstance(record.get("salt"), str)
                or not isinstance(record.get("passwordHash"), str)
                or _admin_key(record["username"]) != key
                or key == _admin_key(OWNER_USER)
            ):
                raise ValueError("an admin access record is invalid")
            if len(bytes.fromhex(record["salt"])) != 16 or len(bytes.fromhex(record["passwordHash"])) != 32:
                raise ValueError("an admin password hash has an invalid length")
            accounts[key] = record
        return accounts
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise SystemExit(f"Could not load local admin access accounts from {ADMIN_ACCOUNTS_PATH}: {error}") from error


ADMIN_ACCOUNTS = _load_admin_accounts()


class DemoHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        if (
            self.path.startswith("/admin/")
            or self.path.startswith("/api/admin/")
            or self.path.startswith("/api/customer/")
            or self.path.startswith("/api/community/")
            or self.path.startswith("/auth/")
            or self.path.startswith("/account.html")
        ):
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "same-origin")
        super().end_headers()

    def _session_token(self, cookie_name: str = SESSION_COOKIE) -> str:
        cookie = SimpleCookie()
        cookie.load(self.headers.get("Cookie", ""))
        morsel = cookie.get(cookie_name)
        return morsel.value if morsel else ""

    def _session_role(self) -> str | None:
        token = self._session_token()
        with SESSION_LOCK:
            session = SESSIONS.get(token)
            if session is None:
                return None
            role, username, expires_at = session
        if expires_at <= time.time():
            with SESSION_LOCK:
                SESSIONS.pop(token, None)
            return None
        if role == "admin":
            with ADMIN_ACCOUNTS_LOCK:
                if _admin_key(username) not in ADMIN_ACCOUNTS:
                    with SESSION_LOCK:
                        SESSIONS.pop(token, None)
                    return None
        with SESSION_LOCK:
            SESSIONS[token] = (role, username, time.time() + SESSION_SECONDS)
        return role

    def _customer_email(self) -> str:
        token = self._session_token(CUSTOMER_SESSION_COOKIE)
        with SESSION_LOCK:
            session = SESSIONS.get(token)
            if session is None:
                return ""
            role, email, expires_at = session
        if role != "customer" or expires_at <= time.time():
            with SESSION_LOCK:
                SESSIONS.pop(token, None)
            return ""
        with SESSION_LOCK:
            SESSIONS[token] = ("customer", email, time.time() + SESSION_SECONDS)
        return email

    def _owner_required(self) -> bool:
        if self._session_role() != "owner":
            self._json(403, {"error": "Only the owner can manage admin access."})
            return False
        return True

    def _same_origin_required(self) -> bool:
        if not self._same_origin():
            self._json(403, {"error": "Request origin was not accepted."})
            return False
        return True

    def _json(self, status: int, payload: dict, headers: dict | None = None):
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(encoded)

    def _redirect_to_account(self, error: str):
        self.send_response(303)
        self.send_header("Location", f"/account.html?signinError={error}")
        self.send_header(
            "Set-Cookie",
            f"{OAUTH_STATE_COOKIE}=; Path=/auth/google/callback; HttpOnly; SameSite=Lax; Max-Age=0",
        )
        self.end_headers()

    def _start_google_sign_in(self):
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
            self._redirect_to_account("google-not-configured")
            return
        state = secrets.token_urlsafe(32)
        now = time.time()
        with OAUTH_STATE_LOCK:
            for old_state, expires_at in list(OAUTH_STATES.items()):
                if expires_at <= now:
                    OAUTH_STATES.pop(old_state, None)
            OAUTH_STATES[state] = now + OAUTH_STATE_SECONDS
        query = urlencode({
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
        })
        self.send_response(302)
        self.send_header("Location", f"https://accounts.google.com/o/oauth2/v2/auth?{query}")
        self.send_header(
            "Set-Cookie",
            f"{OAUTH_STATE_COOKIE}={state}; Path=/auth/google/callback; HttpOnly; SameSite=Lax; Max-Age={OAUTH_STATE_SECONDS}",
        )
        self.end_headers()

    def _google_identity(self, code: str) -> str:
        token_request = Request(
            "https://oauth2.googleapis.com/token",
            data=urlencode({
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }).encode("utf-8"),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        with urlopen(token_request, timeout=10) as response:
            token_payload = json.loads(response.read(16_385).decode("utf-8"))
        access_token = token_payload.get("access_token")
        if not isinstance(access_token, str) or not access_token or len(access_token) > 8192:
            raise ValueError("Google did not return a valid access token.")

        identity_request = Request(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        with urlopen(identity_request, timeout=10) as response:
            identity = json.loads(response.read(16_385).decode("utf-8"))
        email = identity.get("email")
        if identity.get("email_verified") is not True or not isinstance(email, str) or not _valid_email(email):
            raise ValueError("Google did not verify an email address for this account.")
        return email.strip().casefold()

    def _complete_google_sign_in(self, query: dict[str, list[str]]):
        cookie = SimpleCookie()
        cookie.load(self.headers.get("Cookie", ""))
        state_cookie = cookie.get(OAUTH_STATE_COOKIE)
        returned_state = query.get("state", [""])[0]
        if not state_cookie or not returned_state or not hmac.compare_digest(state_cookie.value, returned_state):
            self._redirect_to_account("google-state")
            return
        with OAUTH_STATE_LOCK:
            expires_at = OAUTH_STATES.pop(returned_state, 0)
        if expires_at <= time.time():
            self._redirect_to_account("google-state")
            return
        if query.get("error"):
            self._redirect_to_account("google-cancelled")
            return
        code = query.get("code", [""])[0]
        if not code or len(code) > 4096:
            self._redirect_to_account("google-failed")
            return
        try:
            email = self._google_identity(code)
        except (OSError, ValueError, KeyError, json.JSONDecodeError):
            self._redirect_to_account("google-failed")
            return

        token = secrets.token_urlsafe(32)
        with SESSION_LOCK:
            SESSIONS[token] = ("customer", email, time.time() + SESSION_SECONDS)
        self.send_response(303)
        self.send_header("Location", "/account.html?signin=success")
        self.send_header(
            "Set-Cookie",
            f"{CUSTOMER_SESSION_COOKIE}={token}; Path=/; HttpOnly; SameSite=Strict",
        )
        self.send_header(
            "Set-Cookie",
            f"{OAUTH_STATE_COOKIE}=; Path=/auth/google/callback; HttpOnly; SameSite=Lax; Max-Age=0",
        )
        self.end_headers()

    def _body(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if length < 1 or length > 16_384:
            return None
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None

    def _same_origin(self) -> bool:
        origin = self.headers.get("Origin")
        if not origin:
            return True
        origin_host = urlsplit(origin).netloc
        return bool(origin_host) and hmac.compare_digest(
            origin_host.lower(), self.headers.get("Host", "").lower()
        )

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/community/stats":
            now = time.time()
            with SESSION_LOCK:
                active_members = len({
                    identity
                    for role, identity, expires_at in SESSIONS.values()
                    if role == "customer" and expires_at > now
                })
            try:
                self._json(200, build_community_stats(active_members))
            except (OSError, sqlite3.Error) as error:
                print(f"Could not load local community statistics: {error}")
                self._json(503, {"error": "Local community statistics are temporarily unavailable."})
            return
        if path == "/api/customer/providers":
            self._json(200, {
                "google": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
                "apple": False,
                "appleMessage": "Apple sign-in requires a registered domain callback and is unavailable in this localhost-only demo.",
            })
            return
        if path == "/auth/google/start":
            self._start_google_sign_in()
            return
        if path == "/auth/google/callback":
            self._complete_google_sign_in(parse_qs(urlsplit(self.path).query, keep_blank_values=True))
            return
        if path == "/api/admin/session":
            role = self._session_role()
            self._json(200, {"authenticated": role in ("admin", "owner"), "role": role})
            return
        if path == "/api/customer/session":
            email = self._customer_email()
            self._json(200, {
                "authenticated": bool(email),
                "email": email,
            })
            return
        if path == "/api/admin/accounts":
            if not self._owner_required():
                return
            with ADMIN_ACCOUNTS_LOCK:
                accounts = [
                    {
                        "username": record["username"],
                        "createdAt": record.get("createdAt", ""),
                    }
                    for record in sorted(ADMIN_ACCOUNTS.values(), key=lambda item: item["username"].casefold())
                ]
            self._json(200, {"accounts": accounts})
            return
        if path in ("/admin/dashboard.html", "/admin/owner.html"):
            role = self._session_role()
            if role not in ("admin", "owner"):
                self.send_response(303)
                self.send_header("Location", "/admin/login.html")
                self.end_headers()
                return
            if path == "/admin/owner.html" and role != "owner":
                self.send_response(303)
                self.send_header("Location", "/admin/dashboard.html")
                self.end_headers()
                return
            if path == "/admin/dashboard.html" and role == "owner":
                self.send_response(303)
                self.send_header("Location", "/admin/owner.html")
                self.end_headers()
                return
            if path == "/admin/owner.html":
                self.path = "/admin/dashboard.html"
        super().do_GET()

    def do_POST(self):
        path = urlsplit(self.path).path
        if path == "/api/community/visit":
            if not self._same_origin_required():
                return
            payload = self._body()
            visitor_id = payload.get("visitorId") if isinstance(payload, dict) else None
            if not isinstance(visitor_id, str):
                self._json(400, {"error": "An anonymous visitor identifier is required."})
                return
            try:
                record_page_view(visitor_id)
            except ValueError as error:
                self._json(400, {"error": str(error)})
                return
            except (OSError, sqlite3.Error) as error:
                print(f"Could not record a local community visit: {error}")
                self._json(503, {"error": "Local visit analytics are temporarily unavailable."})
                return
            self._json(200, {"recorded": True})
            return
        if path == "/api/admin/accounts":
            if not self._same_origin_required() or not self._owner_required():
                return
            payload = self._body()
            if not isinstance(payload, dict):
                self._json(400, {"error": "A valid JSON request is required."})
                return
            username = payload.get("username")
            password = payload.get("password")
            if not isinstance(username, str) or not isinstance(password, str):
                self._json(400, {"error": "Enter an admin username and password."})
                return
            username = username.strip()
            key = _admin_key(username)
            if not username or len(username) > 80:
                self._json(400, {"error": "Admin usernames must be between 1 and 80 characters."})
                return
            if len(password) < 8 or len(password) > 200:
                self._json(400, {"error": "Admin passwords must be between 8 and 200 characters."})
                return
            if key == _admin_key(OWNER_USER):
                self._json(400, {"error": "That username is reserved for the owner account."})
                return
            with ADMIN_ACCOUNTS_LOCK:
                if key in ADMIN_ACCOUNTS:
                    self._json(409, {"error": "That admin account already exists. Revoke it before granting it again."})
                    return
                updated_accounts = {
                    **ADMIN_ACCOUNTS,
                    key: {"username": username, **_hash_password(password)},
                }
                try:
                    _save_admin_accounts(updated_accounts)
                except RuntimeError as error:
                    self._json(500, {"error": str(error)})
                    return
                ADMIN_ACCOUNTS.clear()
                ADMIN_ACCOUNTS.update(updated_accounts)
            self._json(201, {
                "account": {
                    "username": username,
                    "createdAt": updated_accounts[key]["createdAt"],
                }
            })
            return
        if path not in ("/api/admin/login", "/api/admin/logout", "/api/customer/logout"):
            self._json(404, {"error": "Not found"})
            return
        if not self._same_origin_required():
            return

        payload = self._body()
        if not isinstance(payload, dict):
            self._json(400, {"error": "A valid JSON request is required."})
            return

        if path == "/api/admin/login":
            username = payload.get("username")
            password = payload.get("password")
            if not isinstance(username, str) or not isinstance(password, str):
                self._json(400, {"error": "Enter a username and password."})
                return
            if len(username) > 80 or len(password) > 200:
                self._json(400, {"error": "The username or password is too long."})
                return
            clean_username = username.strip()
            is_owner_name = hmac.compare_digest(
                _admin_key(clean_username).encode("utf-8"),
                _admin_key(OWNER_USER).encode("utf-8"),
            )
            valid_owner = is_owner_name and hmac.compare_digest(
                password.encode("utf-8"), OWNER_PASSWORD.encode("utf-8")
            )
            with ADMIN_ACCOUNTS_LOCK:
                admin_record = ADMIN_ACCOUNTS.get(_admin_key(clean_username))
            valid_admin = (
                admin_record is not None
                and _verify_password(password, admin_record)
                and not is_owner_name
            )
            if not valid_admin and not valid_owner:
                self._json(401, {"error": "The username or password is incorrect."})
                return
            role = "owner" if valid_owner else "admin"
            token = secrets.token_urlsafe(32)
            with SESSION_LOCK:
                SESSIONS[token] = (role, clean_username, time.time() + SESSION_SECONDS)
            self._json(
                200,
                {
                    "authenticated": True,
                    "role": role,
                    "redirect": "/admin/owner.html" if role == "owner" else "/admin/dashboard.html",
                },
                {"Set-Cookie": f"{SESSION_COOKIE}={token}; Path=/; HttpOnly; SameSite=Strict"},
            )
            return

        if path == "/api/customer/logout":
            token = self._session_token(CUSTOMER_SESSION_COOKIE)
            if not self._customer_email():
                self._json(401, {"error": "Your customer demo session has expired."})
                return
            with SESSION_LOCK:
                SESSIONS.pop(token, None)
            self._json(
                200,
                {"authenticated": False},
                {"Set-Cookie": f"{CUSTOMER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"},
            )
            return

        token = self._session_token()
        role = self._session_role()
        if path == "/api/admin/logout" and role not in ("admin", "owner"):
            self._json(401, {"error": "Your local demo session has expired."})
            return
        with SESSION_LOCK:
            SESSIONS.pop(token, None)
        self._json(
            200,
            {"authenticated": False},
            {"Set-Cookie": f"{SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"},
        )

    def do_DELETE(self):
        if urlsplit(self.path).path != "/api/admin/accounts":
            self._json(404, {"error": "Not found"})
            return
        if not self._same_origin_required() or not self._owner_required():
            return
        payload = self._body()
        username = payload.get("username") if isinstance(payload, dict) else None
        if not isinstance(username, str) or not username.strip():
            self._json(400, {"error": "Choose a valid admin account to revoke."})
            return
        key = _admin_key(username)
        with ADMIN_ACCOUNTS_LOCK:
            if key not in ADMIN_ACCOUNTS:
                self._json(404, {"error": "That admin account no longer exists."})
                return
            updated_accounts = {account_key: value for account_key, value in ADMIN_ACCOUNTS.items() if account_key != key}
            try:
                _save_admin_accounts(updated_accounts)
            except RuntimeError as error:
                self._json(500, {"error": str(error)})
                return
            ADMIN_ACCOUNTS.clear()
            ADMIN_ACCOUNTS.update(updated_accounts)
        with SESSION_LOCK:
            for token, (role, session_username, _expires_at) in list(SESSIONS.items()):
                if role == "admin" and _admin_key(session_username) == key:
                    SESSIONS.pop(token, None)
        self._json(200, {"revoked": True, "username": username.strip()})


if __name__ == "__main__":
    print(f"Paradox Puppetry local demo: http://{HOST}:{PORT}/")
    print("Owner-managed admin access is stored locally with salted password hashes.")
    print("Admin and owner demo credentials are validated only by this local server.")
    print("Google visitor sign-in is optional and does not grant admin access.")
    ThreadingHTTPServer((HOST, PORT), DemoHandler).serve_forever()
