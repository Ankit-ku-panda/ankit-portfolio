"""Sync public GitHub projects without downloading or publishing private repos.

Run: python scripts/sync_github.py
For an existing local database: python scripts/sync_github.py --update-db
Only Python's standard library is used. No personal access token is required.
"""

import argparse
import concurrent.futures
import html
import json
import re
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 5 * 1024 * 1024


# SECTION 1: Public-only HTTP helpers. Never send a token with these requests.
def download(url, maximum=MAX_BYTES):
    request = urllib.request.Request(
        url, headers={"User-Agent": "Ankit-Portfolio-Sync/1.0"}
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        content = response.read(maximum + 1)
    if len(content) > maximum:
        raise ValueError("File is too large for a showcase asset.")
    return content


def api(path):
    return json.loads(download("https://api.github.com/" + path, 10 * MAX_BYTES))


def list_public_repos(owner):
    """Fetch every page; the public user endpoint never requires private access."""
    result = []
    page = 1
    while True:
        batch = api(
            f"users/{urllib.parse.quote(owner)}/repos?per_page=100&type=owner&page={page}"
        )
        if not isinstance(batch, list):
            raise ValueError("GitHub did not return a repository list.")
        result.extend(batch)
        if len(batch) < 100:
            return result
        page += 1


class PinnedRepoParser(HTMLParser):
    """Read public pin links in their displayed GitHub profile order."""

    def __init__(self):
        super().__init__()
        self.names = []

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag != "a":
            return
        try:
            event = json.loads(attributes.get("data-hydro-click", "{}"))
        except ValueError:
            return
        if not isinstance(event, dict):
            return
        name = attributes.get("href", "").strip("/")
        if (
            event.get("payload", {}).get("target") == "PINNED_REPO"
            and re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", name)
            and name not in self.names
        ):
            self.names.append(name)


def public_pins(owner):
    page = download(
        "https://github.com/" + urllib.parse.quote(owner), 5 * MAX_BYTES
    ).decode("utf-8")
    if not re.search(r"<h2[^>]*>\s*Pinned\b", page, re.I):
        if re.search(r"<h2[^>]*>\s*Popular repositories", page, re.I):
            return []
        raise ValueError("Could not identify the public pinned section.")
    parser = PinnedRepoParser()
    parser.feed(page)
    return parser.names


def sorted_repositories(repos, pins, featured):
    pinned_order = {name.lower(): index for index, name in enumerate(pins)}
    featured_order = {name.lower(): index for index, name in enumerate(featured)}

    def key(repo):
        name = repo["full_name"].lower()
        if name in pinned_order:
            return (0, pinned_order[name], "")
        return (1, featured_order.get(name, 10000), name)

    return sorted(repos, key=key)


def permitted(repo, config):
    """This check runs before overrides and before any README/image fetch."""
    blocked = {name.lower() for name in config["exclude_repos"]}
    normalized = re.sub(r"[^a-z]", "", repo.get("name", "").lower())
    return (
        repo.get("private") is False
        and repo.get("visibility", "public") == "public"
        and repo["name"].lower() not in blocked
        and repo["full_name"].lower() not in blocked
        and normalized != "ptcgagent"
        and (config.get("include_forks", True) or not repo.get("fork"))
    )


# SECTION 2: Read README text and locate real image files in that repository.
def plain_text(markdown):
    markdown = re.sub(r"```.*?```", "", markdown, flags=re.S)
    markdown = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", markdown)
    markdown = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", markdown)
    markdown = re.sub(r"<[^>]+>", "", markdown)
    markdown = re.sub(r"^[#>\-*\s]+", "", markdown, flags=re.M)
    return re.sub(r"\s+", " ", html.unescape(markdown)).strip()


def readme(repo):
    base = f"https://raw.githubusercontent.com/{repo['full_name']}/{urllib.parse.quote(repo['default_branch'], safe='')}/"
    for filename in ["README.md", "readme.md", "README.MD", "README.rst", "README"]:
        try:
            return download(base + filename, 300000).decode("utf-8"), base
        except urllib.error.HTTPError as error:
            if error.code == 404:
                continue
            raise
    return "", base


def image_candidate(repo, markdown):
    """Return only a path inside this exact public repo; reject external images."""
    candidates = re.findall(r"!\[[^\]]*\]\(<?([^\s)>]+)", markdown)
    candidates += re.findall(r"<img[^>]+src=[\"\']([^\"\']+)", markdown, flags=re.I)
    for candidate in candidates:
        candidate = urllib.parse.unquote(candidate)
        if candidate.startswith("https://"):
            raw_prefix = f"https://raw.githubusercontent.com/{repo['full_name']}/{repo['default_branch']}/"
            blob_prefix = (
                f"https://github.com/{repo['full_name']}/blob/{repo['default_branch']}/"
            )
            prefix = next(
                (
                    prefix
                    for prefix in [raw_prefix, blob_prefix]
                    if candidate.startswith(prefix)
                ),
                None,
            )
            if not prefix:
                continue
            candidate = candidate[len(prefix) :]
        candidate = candidate.removeprefix("./").split("?")[0]
        if (
            candidate.startswith("/")
            or ".." in candidate.split("/")
            or "://" in candidate
        ):
            continue
        if re.search(r"\.(png|jpe?g|gif|webp)$", candidate, re.I) and not re.search(
            r"badge|shield|icon|logo", candidate, re.I
        ):
            return candidate
    return ""


def repository_image_paths(repo, markdown):
    """Try README images first, then actual files anywhere in the repo tree."""
    preferred = image_candidate(repo, markdown)
    paths = [preferred] if preferred else []
    # A screenshot need not be linked in the README to be discoverable.
    try:
        branch = urllib.parse.quote(repo["default_branch"], safe="")
        tree = api(f"repos/{repo['full_name']}/git/trees/{branch}?recursive=1")
        images = [
            item["path"]
            for item in tree.get("tree", [])
            if item.get("type") == "blob"
            and re.search(r"\.(png|jpe?g|gif|webp)$", item["path"], re.I)
            and not re.search(
                r"(^|/)(node_modules|vendor|build|\.git|datasets?|models?|weights)(/|$)",
                item["path"],
                re.I,
            )
        ]

        def rank(path):
            lowered = path.lower()
            score = 0
            for keyword in [
                "screenshot",
                "preview",
                "dashboard",
                "demo",
                "screen",
                "docs/",
                "images/",
                "assets/",
            ]:
                if keyword in lowered:
                    score += 10
            if re.search(r"icon|logo|badge|favicon|sprite|texture", lowered):
                score -= 100
            return (-score, lowered)

        paths.extend(sorted(images, key=rank))
    except Exception:
        # README discovery can still work when the tree endpoint is unavailable.
        pass
    return list(dict.fromkeys(paths))


def save_image(repo, path, base):
    """Verify bytes; resolve LFS through GitHub's media host when necessary."""
    url = base + urllib.parse.quote(path, safe="/")
    raw = download(url)
    if raw.startswith(b"version https://git-lfs.github.com/spec/v1"):
        url = (
            f"https://media.githubusercontent.com/media/{repo['full_name']}/{urllib.parse.quote(repo['default_branch'], safe='')}/"
            + urllib.parse.quote(path, safe="/")
        )
        raw = download(url)
    extension = ""
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        extension = ".png"
    elif raw.startswith(b"\xff\xd8\xff"):
        extension = ".jpg"
    elif raw.startswith((b"GIF87a", b"GIF89a")):
        extension = ".gif"
    elif raw.startswith(b"RIFF") and raw[8:12] == b"WEBP":
        extension = ".webp"
    if not extension:
        raise ValueError("Not a supported bitmap.")
    name = re.sub(r"[^a-z0-9-]", "-", repo["full_name"].lower()) + extension
    destination = ROOT / "public/assets/github" / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(raw)
    return "/assets/github/" + name, url


# SECTION 3: Assemble a project from public metadata and bounded README excerpts.
def make_project(repo, config):
    full_name = repo["full_name"]
    override = config.get("overrides", {}).get(full_name, {})
    notes = []
    try:
        markdown, base = readme(repo)
    except Exception as error:
        markdown = ""
        base = ""
        notes.append("README unavailable; repository metadata used.")
    text = plain_text(markdown)
    description = (
        repo.get("description") or text[:260] or f"Explore {repo['name']} on GitHub."
    )
    title = repo["name"].replace("-", " ").replace("_", " ")
    project = {
        "id": re.sub(r"[^a-z0-9-]", "-", full_name.lower()),
        "title": title,
        "category": "GitHub projects",
        "summary": description[:500],
        "details": text[:4500] or description,
        "limitation": "Repository content is shown as documented by its author. Open the source for current setup instructions and project status.",
        "repo": repo["html_url"],
        "image": "",
        "tags": list(
            dict.fromkeys(
                ([repo["language"]] if repo.get("language") else [])
                + repo.get("topics", [])
            )
        )[:8],
        "github_synced": True,
        "readme_url": repo["html_url"]
        + "/blob/"
        + repo["default_branch"]
        + "/README.md",
        "pushed_at": repo.get("pushed_at"),
    }
    # Curated titles, descriptions and bundled images always win over discovery.
    project.update(
        {
            key: value
            for key, value in override.items()
            if key in project and key not in ["repo", "github_synced"]
        }
    )
    image_source = ""
    # Ignore stale local image paths: never publish a missing file as a picture.
    if (
        project["image"]
        and not (ROOT / "public" / project["image"].lstrip("/")).is_file()
    ):
        project["image"] = ""
    if not project["image"]:
        base = (
            base
            or f"https://raw.githubusercontent.com/{full_name}/{urllib.parse.quote(repo['default_branch'], safe='')}/"
        )
        for candidate in repository_image_paths(repo, markdown)[:8]:
            try:
                project["image"], image_source = save_image(repo, candidate, base)
                break
            except Exception:
                continue
        if not project["image"]:
            notes.append("No usable repository image found; content-only card.")
    return project, {
        "repo": full_name,
        "readme": project["readme_url"],
        "image_source": image_source,
        "image": project["image"],
        "notes": notes,
    }


# SECTION 4: Sync atomically. A failed repository listing cannot empty the site.
def sync(update_db=False):
    config = json.loads((ROOT / "content/github-sync.json").read_text(encoding="utf-8"))
    owner = config["owner"]
    repos = list_public_repos(owner)
    known = {repo["full_name"].lower() for repo in repos}
    for name in config.get("additional_repos", []):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", name):
            raise ValueError("Additional repos must use owner/repository format.")
        if name.lower() not in known:
            # Unauthenticated lookup also rejects inaccessible private repositories.
            try:
                repos.append(api("repos/" + name))
            except urllib.error.HTTPError as error:
                if error.code == 404:
                    print(f"Skipped unavailable/private repository: {name}")
                    continue
                raise
    repos = [repo for repo in repos if permitted(repo, config)]
    try:
        pins = public_pins(owner)
    except Exception:
        # Preserve the last successfully read order if GitHub changes its markup.
        cache = ROOT / "content/github-pins.json"
        pins = (
            json.loads(cache.read_text(encoding="utf-8")).get("pins", [])
            if cache.exists()
            else []
        )
        print("Pinned profile lookup unavailable; using last known public pin order.")
    # Only permitted public repos may receive pinned priority.
    visible = {repo["full_name"].lower() for repo in repos}
    pins = [name for name in pins if name.lower() in visible]
    (ROOT / "content/github-pins.json").write_text(
        json.dumps({"pins": pins}, indent=4), encoding="utf-8"
    )
    repos = sorted_repositories(repos, pins, config.get("featured_repos", []))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda repo: make_project(repo, config), repos))
    content_path = ROOT / "content/portfolio.json"
    content = json.loads(content_path.read_text(encoding="utf-8"))
    pin_names = {name.lower() for name in pins}
    for project, source in results:
        project["pinned"] = (
            project["repo"].removeprefix("https://github.com/").lower() in pin_names
        )
    content["projects"] = [project for project, source in results]
    sys.path.insert(0, str(ROOT))
    from server import validate_content, connect, init_db

    validate_content(content)
    temporary = content_path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(content, indent=4, ensure_ascii=False), encoding="utf-8"
    )
    temporary.replace(content_path)
    report = {
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "owner": owner,
        "count": len(results),
        "pinned_repos": pins,
        "sources": [source for project, source in results],
    }
    (ROOT / "content/github-sync-report.json").write_text(
        json.dumps(report, indent=4), encoding="utf-8"
    )
    if update_db:
        init_db()
        with connect() as database:
            saved = json.loads(
                database.execute("SELECT body FROM content WHERE id=1").fetchone()[0]
            )
            saved["projects"] = content["projects"]
            database.execute(
                "UPDATE content SET body=? WHERE id=1", (json.dumps(saved),)
            )
        print("Updated local database projects; existing profile and inbox kept.")
    from scripts.build_public import build_public

    build_public()
    print(
        f"Synced {len(results)} public projects. Private and excluded repositories were omitted."
    )
    return len(results)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--update-db",
        action="store_true",
        help="Replace local database projects too; preserve profile/inbox",
    )
    arguments = parser.parse_args()
    try:
        sync(update_db=arguments.update_db)
    except Exception as error:
        print(f"GitHub sync failed: {error}", file=sys.stderr)
        raise SystemExit(1)
