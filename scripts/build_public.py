"""Build readable static content for local use and GitHub Pages.

Run: python scripts/build_public.py
Optional: python scripts/build_public.py --content my-export.json
No external packages are required.
"""

import argparse
import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


def escape(value):
    """Escape text before putting it into an HTML page."""
    return html.escape(str(value), quote=True)


def project_html(project, index):
    """Make a real card that is visible even if JavaScript does not run."""
    title = escape(project["title"])
    image = "./" + escape(project["image"].lstrip("/"))
    tags = "".join(
        '<span class="tag">' + escape(tag) + "</span>" for tag in project["tags"]
    )
    image_exists = (
        bool(project.get("image")) and (PUBLIC / project["image"].lstrip("/")).is_file()
    )
    visual = (
        f'<a class="image-button" href="{escape(project["repo"])}" target="_blank" rel="noopener"><img src="{image}" alt="{title} repository showcase" loading="lazy"></a>'
        if image_exists
        else ""
    )
    label = "PINNED / GITHUB" if project.get("pinned") else "PROJECT / SOURCE"
    return f"""
        <article class="project">
            {visual}
            <div class="project-meta">
                <div class="project-top"><span>[{index + 1:02}] {escape(project['category'].upper())}</span><span>{label}</span></div>
                <h3>{title}</h3>
                <p>{escape(project['summary'])}</p>
                <div class="tags">{tags}</div>
                <div class="project-links"><a href="{escape(project['repo'])}" target="_blank" rel="noopener">Explore project on GitHub ↗</a></div>
            </div>
        </article>
    """


def build_public(content_path=None, output=None):
    """Update bundled JS and HTML; optionally create a Pages-only directory."""
    source = Path(content_path) if content_path else ROOT / "content/portfolio.json"
    data = json.loads(source.read_text(encoding="utf-8"))

    # Reuse server validation so malformed links cannot enter generated HTML.
    import sys

    sys.path.insert(0, str(ROOT))
    from server import validate_content

    validate_content(data)

    # content.js is ordinary external JavaScript, compatible with strict CSP.
    bundled = "// GENERATED CONTENT: Edit content/portfolio.json, then run scripts/build_public.py.\n"
    bundled += "window.PORTFOLIO_STATIC_MODE = false;\n"
    bundled += (
        "window.PORTFOLIO_DATA = "
        + json.dumps(data, indent=4, ensure_ascii=False)
        + ";\n"
    )
    (PUBLIC / "content.js").write_text(bundled, encoding="utf-8")

    page = (PUBLIC / "index.html").read_text(encoding="utf-8")
    cards = "".join(
        project_html(project, index) for index, project in enumerate(data["projects"])
    )
    page = re.sub(
        r"<!-- PROJECT-CARDS-START -->.*?<!-- PROJECT-CARDS-END -->",
        lambda match: "<!-- PROJECT-CARDS-START -->"
        + cards
        + "<!-- PROJECT-CARDS-END -->",
        page,
        flags=re.S,
    )

    # Also include real profile text in HTML, so the page is useful without JS.
    fields = {
        "hero-name": "name",
        "profile-name": "name",
        "role": "role",
        "location": "location",
        "education": "education",
        "availability": "availability",
        "bio": "bio",
    }
    for element_id, field in fields.items():
        pattern = r'(<[^>]+id="' + element_id + r'"[^>]*>).*?(</[^>]+>)'
        page = re.sub(
            pattern,
            lambda match: match[1] + escape(data["profile"][field]) + match[2],
            page,
            flags=re.S,
        )
    page = re.sub(
        r'(<div(?=[^>]*id="skills")[^>]*>).*?(</div>)',
        lambda match: match[1]
        + "".join(
            '<span class="tag">' + escape(skill) + "</span>"
            for skill in data["profile"]["skills"]
        )
        + match[2],
        page,
        flags=re.S,
    )
    page = re.sub(
        r'(<span[^>]*id="project-count"[^>]*>).*?(</span>)',
        lambda match: match[1]
        + f"{len(data['projects']):02} PROJECTS / OPEN SOURCE"
        + match[2],
        page,
        flags=re.S,
    )
    (PUBLIC / "index.html").write_text(page, encoding="utf-8")

    if output:
        # Only public portfolio files go to Pages. No database/admin/server files.
        destination = Path(output)
        destination = destination.resolve()
        marker = destination / ".portfolio-export"
        if destination.exists() and any(destination.iterdir()):
            if destination != ROOT / "_site" and not marker.is_file():
                raise ValueError(
                    "Refusing to replace a non-export directory. Use _site or an empty directory."
                )
            shutil.rmtree(destination)
        destination.mkdir(parents=True, exist_ok=True)
        for filename in ["index.html", "style.css", "app.js", "content.js"]:
            shutil.copy2(PUBLIC / filename, destination / filename)
        # Publish only images referenced by currently visible public projects.
        for project in data["projects"]:
            if project.get("image"):
                relative = project["image"].lstrip("/")
                asset = PUBLIC / relative
                target = destination / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                if asset.is_file():
                    shutil.copy2(asset, target)
        static_content = bundled.replace(
            "PORTFOLIO_STATIC_MODE = false", "PORTFOLIO_STATIC_MODE = true"
        )
        (destination / "content.js").write_text(static_content, encoding="utf-8")
        (destination / ".nojekyll").touch()
        (destination / ".portfolio-export").touch()
    return len(data["projects"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--content", help="Optional exported JSON file to publish")
    parser.add_argument(
        "--output", help="Optional static output directory for GitHub Pages"
    )
    args = parser.parse_args()
    count = build_public(args.content, args.output)
    print(f"Built {count} project cards and bundled profile content.")
