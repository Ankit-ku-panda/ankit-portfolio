"""Local portfolio API and static server. Python 3.10+, standard library only."""

import os, json, sqlite3, re, time, mimetypes, threading
import argparse
import webbrowser
from pathlib import Path
from urllib.parse import urlsplit, unquote
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

# SECTION 1: Read settings from .env. Shell settings take priority.
ROOT = Path(__file__).resolve().parent
for line in (
    (ROOT / ".env").read_text(encoding="utf-8-sig").splitlines()
    if (ROOT / ".env").exists()
    else []
):
    if "=" in line and not line.strip().startswith("#"):
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DB = Path(os.getenv("DATABASE_PATH", str(ROOT / "data/portfolio.db"))).resolve()
PUBLIC = ROOT / "public"
lock = threading.Lock()


# SECTION 2: SQLite stores the active content and contact messages.
def connect():
    db = sqlite3.connect(DB, timeout=10)
    db.row_factory = sqlite3.Row
    return db


def init_db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute(
            "CREATE TABLE IF NOT EXISTS content (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL)"
        )
        db.execute(
            "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, name TEXT, email TEXT, message TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP)"
        )
        db.execute(
            "CREATE TABLE IF NOT EXISTS rate_limits (ip TEXT PRIMARY KEY, last_sent REAL)"
        )
        db.execute(
            "INSERT OR IGNORE INTO content VALUES (1, ?)",
            ((ROOT / "content/portfolio.json").read_text(encoding="utf-8"),),
        )


# SECTION 3: Check content types and URLs before saving admin changes.
def validate_content(data):
    if not isinstance(data, dict) or set(data) != {"profile", "projects"}:
        raise ValueError("Use profile and projects keys.")
    p = data["profile"]
    if not isinstance(p, dict):
        raise ValueError("Profile must be an object.")
    for key in ["name", "role", "location", "bio", "availability", "education"]:
        if not isinstance(p.get(key), str) or not 1 <= len(p[key]) <= 2000:
            raise ValueError("Invalid profile field: " + key)
    if (
        not isinstance(p.get("skills"), list)
        or len(p["skills"]) > 40
        or any(not isinstance(v, str) or len(v) > 80 for v in p["skills"])
    ):
        raise ValueError("Invalid skills.")
    projects = data["projects"]
    if not isinstance(projects, list) or not 0 <= len(projects) <= 1000:
        raise ValueError("Provide 0–1000 projects.")
    ids = set()
    for project in projects:
        if not isinstance(project, dict):
            raise ValueError("Invalid project.")
        for key in [
            "id",
            "title",
            "category",
            "summary",
            "details",
            "limitation",
            "repo",
        ]:
            if (
                not isinstance(project.get(key), str)
                or not 1 <= len(project[key]) <= 6000
            ):
                raise ValueError("Invalid project field: " + key)
        if not re.fullmatch(r"[a-z0-9-]+", project["id"]) or project["id"] in ids:
            raise ValueError("Project ids must be unique slugs.")
        ids.add(project["id"])
        if not re.fullmatch(
            r"https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", project["repo"]
        ):
            raise ValueError("Use a GitHub repository URL.")
        image = project.get("image", "")
        if not isinstance(image, str):
            raise ValueError("Image must be a path or an empty string.")
        if image and (
            not image.startswith("/assets/")
            or ".." in image
            or not (PUBLIC / image.lstrip("/"))
            .resolve()
            .is_relative_to(PUBLIC.resolve())
        ):
            raise ValueError("Use a local /assets/ image.")
        if (
            not isinstance(project.get("tags"), list)
            or len(project["tags"]) > 15
            or any(not isinstance(v, str) or len(v) > 80 for v in project["tags"])
        ):
            raise ValueError("Invalid tags.")
    return data


# SECTION 4: HTTP routes. Each do_* method handles one HTTP verb.
class Handler(BaseHTTPRequestHandler):
    server_version = "PortfolioLocal/1.0"

    # Security headers apply to every response, including static files.
    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        )
        super().end_headers()

    # Convert Python data into a JSON response for frontend JavaScript.
    def reply(self, code, body):
        raw = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    # Read a bounded JSON request body from a form or admin save.
    def body(self):
        if self.headers.get_content_type() != "application/json":
            raise ValueError("Send application/json.")
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 5000000:
            raise ValueError("Request size must be 1–5000000 bytes.")
        return json.loads(self.rfile.read(length))

    # GET reads portfolio data, inbox data, or a public asset.
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/health":
            return self.reply(200, {"status": "ok"})
        if path in ["/api/portfolio", "/api/admin/messages"]:
            with connect() as db:
                result = (
                    json.loads(
                        db.execute("SELECT body FROM content WHERE id=1").fetchone()[0]
                    )
                    if path.endswith("portfolio")
                    else [
                        dict(row)
                        for row in db.execute(
                            "SELECT * FROM messages ORDER BY id DESC LIMIT 500"
                        )
                    ]
                )
            return self.reply(200, result)
        if path.startswith("/api/"):
            return self.reply(404, {"error": "Not found."})
        name = {"/": "index.html", "/admin": "admin.html"}.get(
            path, unquote(path).lstrip("/")
        )
        target = (PUBLIC / name).resolve()
        if not target.is_relative_to(PUBLIC.resolve()) or not target.is_file():
            return self.reply(404, {"error": "Not found."})
        raw = target.read_bytes()
        # Windows registry MIME settings can label .js as text/plain.
        # Explicit types let browsers execute scripts with nosniff enabled.
        content_types = {
            ".js": "text/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".html": "text/html; charset=utf-8",
            ".json": "application/json; charset=utf-8",
        }
        content_type = content_types.get(
            target.suffix.lower(),
            mimetypes.guess_type(target)[0] or "application/octet-stream",
        )
        self.send_response(200)
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    # POST validates a visitor message and stores it in SQLite.
    def do_POST(self):
        if urlsplit(self.path).path != "/api/contact":
            return self.reply(404, {"error": "Not found."})
        origin = self.headers.get("Origin")
        if origin and (
            urlsplit(origin).scheme not in ("http", "https")
            or urlsplit(origin).netloc != self.headers.get("Host", "")
        ):
            return self.reply(403, {"error": "Origin rejected."})
        try:
            data = self.body()
            if not isinstance(data, dict):
                raise ValueError("Invalid form.")
            fields = {k: data.get(k, "") for k in ["name", "email", "message"]}
            if any(not isinstance(v, str) for v in fields.values()):
                raise ValueError("Invalid form fields.")
            fields = {k: v.strip() for k, v in fields.items()}
            if (
                not 2 <= len(fields["name"]) <= 100
                or not 10 <= len(fields["message"]) <= 5000
                or len(fields["email"]) > 254
                or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", fields["email"])
            ):
                raise ValueError(
                    "Check your name, email, and message (10–5000 characters)."
                )
            if data.get("website"):
                return self.reply(400, {"error": "Form rejected."})
            with lock, connect() as db:
                ip = self.client_address[0]
                now = time.time()
                last = db.execute(
                    "SELECT last_sent FROM rate_limits WHERE ip=?", (ip,)
                ).fetchone()
                if last and now - last[0] < 30:
                    return self.reply(
                        429, {"error": "Please wait 30 seconds before sending again."}
                    )
                db.execute(
                    "INSERT INTO messages(name,email,message) VALUES(?,?,?)",
                    tuple(fields.values()),
                )
                db.execute("INSERT OR REPLACE INTO rate_limits VALUES(?,?)", (ip, now))
            return self.reply(
                201, {"message": "Message saved. Thank you for reaching out."}
            )
        except (ValueError, TypeError, UnicodeError) as e:
            return self.reply(400, {"error": str(e)})

    # PUT replaces portfolio content after validating the complete JSON.
    def do_PUT(self):
        if urlsplit(self.path).path != "/api/admin/portfolio":
            return self.reply(404, {"error": "Not found."})
        try:
            data = validate_content(self.body())
            with connect() as db:
                db.execute("UPDATE content SET body=? WHERE id=1", (json.dumps(data),))
            self.reply(200, {"message": "Portfolio saved."})
        except (ValueError, TypeError, UnicodeError) as e:
            self.reply(400, {"error": str(e)})

    # DELETE removes one contact message selected in the admin inbox.
    def do_DELETE(self):
        match = re.fullmatch(r"/api/admin/messages/(\d+)", urlsplit(self.path).path)
        if not match:
            return self.reply(404, {"error": "Not found."})
        with connect() as db:
            count = db.execute(
                "DELETE FROM messages WHERE id=?", (int(match[1]),)
            ).rowcount
        self.reply(
            200 if count else 404,
            {"message": "Deleted."} if count else {"error": "Not found."},
        )


# SECTION 5: Prepare files, start the server, and show a usable browser address.
def run(open_browser=False):
    from scripts.build_public import build_public

    build_public()
    init_db()
    local_host = "127.0.0.1" if HOST in ("0.0.0.0", "::") else HOST
    browser_url = f"http://{local_host}:{PORT}"
    try:
        http_server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError as error:
        print(f"Could not start on port {PORT}: {error}", flush=True)
        print(
            "Stop the older server window, or change PORT in .env and try again.",
            flush=True,
        )
        return 1

    print(f"Portfolio: {browser_url}\nAdmin: {browser_url}/admin", flush=True)
    print(
        f"Listening on {HOST}:{PORT}. Keep this window open. Press Ctrl+C to stop.",
        flush=True,
    )
    print("Admin access is open to everyone who can reach this server.", flush=True)
    if open_browser:
        # The socket is already listening. A short timer lets serve_forever start.
        timer = threading.Timer(0.5, webbrowser.open, args=(browser_url,))
        timer.daemon = True
        timer.start()
    try:
        http_server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.", flush=True)
    finally:
        http_server.server_close()
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the local portfolio and backend.")
    parser.add_argument(
        "--open", action="store_true", help="Open the website in your browser"
    )
    arguments = parser.parse_args()
    raise SystemExit(run(open_browser=arguments.open))
