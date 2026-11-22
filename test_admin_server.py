import http.client
import json
import os
import sqlite3
import sys
import tempfile
import threading
import time
from contextlib import closing
import unittest
from pathlib import Path
from unittest.mock import patch


TEMP_ACCOUNTS = tempfile.TemporaryDirectory(prefix="pp-admin-tests-")
ACCOUNTS_FILE = str(Path(TEMP_ACCOUNTS.name) / "accounts.json")
TEMP_COMMUNITY = tempfile.TemporaryDirectory(prefix="pp-community-tests-")
COMMUNITY_FILE = str(Path(TEMP_COMMUNITY.name) / "community.sqlite3")
PREVIOUS_ACCOUNTS_FILE = os.environ.get("PP_ADMIN_ACCOUNTS_FILE")
PREVIOUS_COMMUNITY_FILE = os.environ.get("PP_COMMUNITY_STATS_FILE")
os.environ["PP_ADMIN_ACCOUNTS_FILE"] = ACCOUNTS_FILE
os.environ["PP_COMMUNITY_STATS_FILE"] = COMMUNITY_FILE
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import admin_server
import community_stats

if PREVIOUS_ACCOUNTS_FILE is None:
    os.environ.pop("PP_ADMIN_ACCOUNTS_FILE", None)
else:
    os.environ["PP_ADMIN_ACCOUNTS_FILE"] = PREVIOUS_ACCOUNTS_FILE
if PREVIOUS_COMMUNITY_FILE is None:
    os.environ.pop("PP_COMMUNITY_STATS_FILE", None)
else:
    os.environ["PP_COMMUNITY_STATS_FILE"] = PREVIOUS_COMMUNITY_FILE


class AdminOAuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = admin_server.ThreadingHTTPServer(("127.0.0.1", 0), admin_server.DemoHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.port = cls.server.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)
        TEMP_ACCOUNTS.cleanup()
        TEMP_COMMUNITY.cleanup()

    def setUp(self):
        self.module_patches = [
            patch.object(admin_server, "GOOGLE_CLIENT_ID", "test-client-id"),
            patch.object(admin_server, "GOOGLE_CLIENT_SECRET", "test-client-secret"),
            patch.object(admin_server, "GOOGLE_REDIRECT_URI", f"http://127.0.0.1:{admin_server.PORT}/auth/google/callback"),
            patch.object(admin_server, "ADMIN_ACCOUNTS", {
                "admin": {"username": "Admin", **admin_server._hash_password("test-password")}
            }),
            patch.object(admin_server, "OAUTH_STATES", {}),
            patch.object(admin_server, "SESSIONS", {}),
        ]
        for module_patch in self.module_patches:
            module_patch.start()
            self.addCleanup(module_patch.stop)

    def request(self, method, path, body=None, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        payload = json.dumps(body).encode("utf-8") if body is not None else None
        request_headers = dict(headers or {})
        if payload is not None:
            request_headers["Content-Type"] = "application/json"
        connection.request(method, path, body=payload, headers=request_headers)
        response = connection.getresponse()
        content = response.read()
        result = (response.status, response.getheaders(), content)
        connection.close()
        return result

    @staticmethod
    def header(headers, name):
        return next(value for key, value in headers if key.lower() == name.lower())

    def test_only_local_google_callback_is_accepted(self):
        local_uri = f"http://127.0.0.1:{admin_server.PORT}/auth/google/callback"
        self.assertTrue(admin_server._is_local_redirect_uri(local_uri))
        self.assertFalse(admin_server._is_local_redirect_uri("https://example.com/auth/google/callback"))
        self.assertFalse(admin_server._is_local_redirect_uri("http://127.0.0.1:8001/auth/google/callback"))

    def test_provider_status_and_google_authorization_redirect(self):
        status, _headers, content = self.request("GET", "/api/customer/providers")
        providers = json.loads(content)
        self.assertEqual(status, 200)
        self.assertTrue(providers["google"])
        self.assertFalse(providers["apple"])

        status, headers, _content = self.request("GET", "/auth/google/start")
        self.assertEqual(status, 302)
        self.assertTrue(self.header(headers, "Location").startswith("https://accounts.google.com/o/oauth2/v2/auth?"))
        self.assertIn("pp_google_oauth_state=", self.header(headers, "Set-Cookie"))

    def test_google_sign_in_creates_a_customer_not_an_admin_session(self):
        state = "customer-state"
        admin_server.OAUTH_STATES[state] = time.time() + admin_server.OAUTH_STATE_SECONDS
        admin_server.SESSIONS["existing-admin-session"] = (
            "admin",
            "Admin",
            time.time() + admin_server.SESSION_SECONDS,
        )
        with patch.object(admin_server.DemoHandler, "_google_identity", lambda _handler, _code: "owner@example.com"):
            status, headers, _content = self.request(
                "GET",
                f"/auth/google/callback?state={state}&code=single-use",
                headers={
                    "Cookie": (
                        f"{admin_server.OAUTH_STATE_COOKIE}={state}; "
                        f"{admin_server.SESSION_COOKIE}=existing-admin-session"
                    )
                },
            )
        self.assertEqual(status, 303)
        self.assertEqual(self.header(headers, "Location"), "/account.html?signin=success")
        session_cookie = next(
            value.split(";", 1)[0]
            for name, value in headers
            if name.lower() == "set-cookie" and value.startswith(f"{admin_server.CUSTOMER_SESSION_COOKIE}=")
        )
        status, _headers, content = self.request("GET", "/api/customer/session", headers={"Cookie": session_cookie})
        session = json.loads(content)
        self.assertEqual(status, 200)
        self.assertTrue(session["authenticated"])
        self.assertEqual(session["email"], "owner@example.com")

        status, _headers, content = self.request("GET", "/api/admin/session", headers={"Cookie": session_cookie})
        admin_session = json.loads(content)
        self.assertEqual(status, 200)
        self.assertFalse(admin_session["authenticated"])
        self.assertIsNone(admin_session["role"])

        status, headers, _content = self.request(
            "GET",
            "/admin/dashboard.html",
            headers={"Cookie": session_cookie},
        )
        self.assertEqual(status, 303)
        self.assertEqual(self.header(headers, "Location"), "/admin/login.html")

        status, _headers, content = self.request(
            "GET",
            "/api/admin/session",
            headers={"Cookie": f"{admin_server.SESSION_COOKIE}=existing-admin-session"},
        )
        self.assertTrue(json.loads(content)["authenticated"])

    def test_admin_login_remains_password_based(self):
        status, headers, content = self.request(
            "POST",
            "/api/admin/login",
            body={"username": "Admin", "password": "test-password"},
            headers={"Origin": f"http://127.0.0.1:{self.port}"},
        )
        result = json.loads(content)
        self.assertEqual(status, 200)
        self.assertEqual(result["role"], "admin")
        self.assertEqual(result["redirect"], "/admin/dashboard.html")
        self.assertIn(f"{admin_server.SESSION_COOKIE}=", self.header(headers, "Set-Cookie"))

    def test_oauth_state_mismatch_is_rejected(self):
        state = "expected-state"
        admin_server.OAUTH_STATES[state] = time.time() + admin_server.OAUTH_STATE_SECONDS
        status, headers, _content = self.request(
            "GET",
            "/auth/google/callback?state=other-state&code=single-use",
            headers={"Cookie": f"{admin_server.OAUTH_STATE_COOKIE}={state}"},
        )
        self.assertEqual(status, 303)
        self.assertIn("signinError=google-state", self.header(headers, "Location"))

    def test_owner_grants_password_only_admin_account(self):
        admin_server.SESSIONS["owner-session"] = (
            "owner",
            "Owner",
            time.time() + admin_server.SESSION_SECONDS,
        )
        status, _headers, content = self.request(
            "POST",
            "/api/admin/accounts",
            body={
                "username": "Animator",
                "password": "temporary-password",
            },
            headers={
                "Cookie": f"{admin_server.SESSION_COOKIE}=owner-session",
                "Origin": f"http://127.0.0.1:{self.port}",
            },
        )
        result = json.loads(content)
        self.assertEqual(status, 201)
        self.assertEqual(result["account"]["username"], "Animator")
        self.assertNotIn("googleEmail", admin_server.ADMIN_ACCOUNTS["animator"])

    def test_customer_can_sign_out_without_changing_admin_session(self):
        admin_server.SESSIONS["customer-session"] = (
            "customer",
            "visitor@example.com",
            time.time() + admin_server.SESSION_SECONDS,
        )
        admin_server.SESSIONS["admin-session"] = (
            "admin",
            "Admin",
            time.time() + admin_server.SESSION_SECONDS,
        )
        status, headers, _content = self.request(
            "POST",
            "/api/customer/logout",
            body={},
            headers={
                "Cookie": f"{admin_server.CUSTOMER_SESSION_COOKIE}=customer-session",
                "Origin": f"http://127.0.0.1:{self.port}",
            },
        )
        self.assertEqual(status, 200)
        self.assertIn(f"{admin_server.CUSTOMER_SESSION_COOKIE}=", self.header(headers, "Set-Cookie"))
        self.assertNotIn("customer-session", admin_server.SESSIONS)
        self.assertIn("admin-session", admin_server.SESSIONS)

    def test_community_stats_counts_distinct_active_customer_sessions(self):
        expires = time.time() + admin_server.SESSION_SECONDS
        admin_server.SESSIONS["customer-one"] = ("customer", "visitor@example.com", expires)
        admin_server.SESSIONS["customer-two"] = ("customer", "visitor@example.com", expires)
        admin_server.SESSIONS["expired-customer"] = ("customer", "old@example.com", time.time() - 1)
        with patch.object(admin_server, "build_community_stats", return_value={"local": {}, "social": {}}) as build:
            status, _headers, content = self.request("GET", "/api/community/stats")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(content), {"local": {}, "social": {}})
        build.assert_called_once_with(1)

    def test_community_visit_endpoint_counts_views_and_deduplicates_anonymous_ids(self):
        with tempfile.TemporaryDirectory(prefix="pp-community-route-") as directory:
            database = Path(directory) / "community.sqlite3"
            with patch.object(community_stats, "COMMUNITY_DB_PATH", database):
                origin = f"http://127.0.0.1:{self.port}"
                for _ in range(2):
                    status, _headers, content = self.request(
                        "POST",
                        "/api/community/visit",
                        body={"visitorId": "browser-test-visitor-01"},
                        headers={"Origin": origin},
                    )
                    self.assertEqual(status, 200)
                    self.assertTrue(json.loads(content)["recorded"])
                with patch.object(community_stats, "_social_metrics", return_value={}):
                    metrics = community_stats.build_community_stats(0)["local"]
                self.assertEqual(metrics["pageViewsToday"], 2)
                self.assertEqual(metrics["uniqueVisitorsToday"], 1)
                with closing(sqlite3.connect(database)) as connection:
                    stored_hash = connection.execute(
                        "SELECT visitor_hash FROM daily_unique_visitors"
                    ).fetchone()[0]
                self.assertNotEqual(stored_hash, "browser-test-visitor-01")

    def test_community_visit_rejects_invalid_identifiers_and_cross_origin_posts(self):
        status, _headers, _content = self.request(
            "POST",
            "/api/community/visit",
            body={"visitorId": "../../invalid"},
            headers={"Origin": f"http://127.0.0.1:{self.port}"},
        )
        self.assertEqual(status, 400)
        status, _headers, _content = self.request(
            "POST",
            "/api/community/visit",
            body={"visitorId": "browser-test-visitor-02"},
            headers={"Origin": "https://example.com"},
        )
        self.assertEqual(status, 403)

    def test_instagram_rejects_invalid_graph_user_ids_before_network_requests(self):
        with (
            patch.object(community_stats, "INSTAGRAM_HANDLE", "paradoxpuppetry"),
            patch.object(community_stats, "INSTAGRAM_USER_ID", "invalid/id"),
            patch.object(community_stats, "INSTAGRAM_ACCESS_TOKEN", "test-token"),
            patch.object(community_stats, "_read_json") as read_json,
        ):
            result = community_stats._fetch_instagram()
        self.assertEqual(result["status"], "unavailable")
        self.assertIn("user ID is not valid", result["message"])
        read_json.assert_not_called()


if __name__ == "__main__":
    unittest.main()
