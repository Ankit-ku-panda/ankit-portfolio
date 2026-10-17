"""API regression checks: use a temporary database and an ephemeral server."""

import unittest, tempfile, threading, json, urllib.request, urllib.error, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server


class API(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        server.DB = Path(cls.temp.name) / "test.db"
        server.init_db()
        cls.http = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.url = "http://127.0.0.1:" + str(cls.http.server_port)
        threading.Thread(target=cls.http.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.temp.cleanup()

    def request(self, path, method="GET", body=None, admin=False):
        headers = {"Content-Type": "application/json"}
        if admin:
            headers["Authorization"] = "Bearer test-token"
        req = urllib.request.Request(
            self.url + path,
            data=json.dumps(body).encode() if body is not None else None,
            headers=headers,
            method=method,
        )
        try:
            r = urllib.request.urlopen(req)
        except urllib.error.HTTPError as e:
            r = e
        with r:
            return r.status, r.read()

    def test_content_assets_and_traversal(self):
        status, raw = self.request("/api/portfolio")
        self.assertEqual(status, 200)
        data = json.loads(raw)
        self.assertGreaterEqual(len(data["projects"]), 23)
        for p in data["projects"]:
            if not p["image"]:
                continue
            status, raw = self.request(p["image"])
            self.assertEqual(status, 200)
            self.assertGreater(len(raw), 1000)
        self.assertEqual(self.request("/%2e%2e/server.py")[0], 404)
        self.assertEqual(self.request("/.env")[0], 404)

    def test_open_admin_and_updates(self):
        self.assertEqual(self.request("/api/admin/messages")[0], 200)
        data = json.loads(self.request("/api/portfolio")[1])
        data["profile"]["name"] = "Edited Name"
        self.assertEqual(self.request("/api/admin/portfolio", "PUT", data)[0], 200)
        self.assertEqual(
            self.request("/api/admin/portfolio", "PUT", data, True)[0], 200
        )
        self.assertEqual(
            json.loads(self.request("/api/portfolio")[1])["profile"]["name"],
            "Edited Name",
        )
        data["projects"][0]["repo"] = "javascript:alert(1)"
        self.assertEqual(
            self.request("/api/admin/portfolio", "PUT", data, True)[0], 400
        )

    def test_script_mime_and_prerendered_content(self):
        # Regression: Windows must not label JavaScript as text/plain.
        for path in ["/app.js", "/content.js", "/admin.js"]:
            with urllib.request.urlopen(self.url + path) as response:
                self.assertIn("javascript", response.headers["Content-Type"])
                self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        html = self.request("/")[1].decode("utf-8")
        self.assertEqual(
            html.count('class="project"'),
            len(json.loads(self.request("/api/portfolio")[1])["projects"]),
        )
        self.assertIn("kumarpanda1403@gmail.com", html)
        self.assertIn("tel:+917327983649", html)
        self.assertNotIn("Loading projects", html)

    def test_contact_persistence_rate_limit_delete(self):
        self.assertEqual(self.request("/api/contact", "POST", {"name": "x"})[0], 400)
        msg = {
            "name": "Tester",
            "email": "tester@example.com",
            "message": "A test inquiry saved locally.",
        }
        self.assertEqual(self.request("/api/contact", "POST", msg)[0], 201)
        self.assertEqual(self.request("/api/contact", "POST", msg)[0], 429)
        messages = json.loads(self.request("/api/admin/messages", admin=True)[1])
        self.assertEqual(messages[0]["message"], msg["message"])
        server.init_db()
        self.assertEqual(
            len(json.loads(self.request("/api/admin/messages", admin=True)[1])), 1
        )
        self.assertEqual(
            self.request(
                "/api/admin/messages/" + str(messages[0]["id"]), "DELETE", admin=True
            )[0],
            200,
        )
        self.assertEqual(
            json.loads(self.request("/api/admin/messages", admin=True)[1]), []
        )


if __name__ == "__main__":
    unittest.main()
