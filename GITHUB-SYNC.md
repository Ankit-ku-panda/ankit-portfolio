# Automatically add public projects

The included snapshot contains all public repositories found for `Ankit-ku-panda`, except `ptcg-agent`. Private repositories are never requested with account credentials. The sync uses the unauthenticated public API and checks visibility before reading a README or image. It handles multiple repository-list pages.

## Automatic updates after hosting on Pages

Upload this source to your portfolio repository and enable **Settings → Pages → GitHub Actions**, as explained in GITHUB-HOSTING.md. The workflow syncs repositories before each deployment:

- Whenever you push to the portfolio repository's `main` branch.
- Every six hours through a scheduled workflow.
- Whenever you click **Actions → Publish portfolio to GitHub Pages → Run workflow**.

Creating or pushing to another project repository does not itself trigger the portfolio repository's workflow. That change appears on the next scheduled run, or run the workflow manually for an earlier refresh. Schedule timing is not exact: GitHub can delay runs, and scheduled workflows in public repositories may be disabled after 60 days without repository activity. Re-enable the workflow in Actions if necessary. The workflow must exist on the default branch.

No personal access token, paid API, or backend is needed for Pages syncing. GitHub API rate limits still apply. A listing failure stops the workflow before deployment; it does not replace the portfolio with an incomplete repository list. README/image failures keep the public project card with metadata without an image area.

## Pinned projects first

Each sync reads your public GitHub profile and matches pinned repository links against the permitted public inventory. They appear first in GitHub's displayed order, marked PINNED / GITHUB. Re-pin or reorder projects on GitHub, then run SYNC-GITHUB.bat locally or wait for the next Pages sync. Private and excluded repositories never gain visibility through pinning.

This public-profile parser requires no token. If GitHub's profile page cannot be read or its markup changes, the last successfully read pin order from content/github-pins.json is used. It does not claim to have fetched a new order in that case.

## What is imported?

- Repository name, description, primary language, topics, and source link.
- A bounded plain-text excerpt from a root README.
- An eligible screenshot found in the README or repository file tree, with real image bytes checked before saving. Git LFS images are resolved through GitHub’s media host when available.
- Existing curated descriptions and images for the original featured projects.

This is an automated repository summary, not an AI rewrite or a guarantee that every README detail is extracted. External images, badges, SVGs, missing images, and Git LFS pointer files are skipped. No new images are generated. Projects without a suitable image show only project content, with no image area or placeholder. `content/github-sync-report.json` records image sources and retrieval notes.

## Add a new repository

Create a public repository under `Ankit-ku-panda` and add a README plus a relative PNG/JPG/GIF/WebP screenshot link. It will be discovered automatically. For example:

```markdown
# My new project

A short description of what it does.

![Application screenshot](docs/screenshot.png)
```

To include another owner's public repository, add its `owner/repository` string to `additional_repos` in `content/github-sync.json`. It is still checked through an unauthenticated lookup; private/inaccessible repos are skipped. Always describe your own contribution accurately when showcasing someone else's repository.

## Customize or exclude entries

Edit `content/github-sync.json`. Its `exclude_repos` list accepts a repository name or full `owner/name`. `ptcg-agent` is also always blocked in code. Public GitHub pins always come first in their displayed profile order. `featured_repos` controls the order after pinned projects. `overrides` keeps your preferred title, category, summary, details, local image path, tags, or other project fields when sync runs.

Example override entry (add it inside the existing `overrides` object):

```json
"Ankit-ku-panda/My-New-Project": {
    "title": "My New Project",
    "category": "Web tools",
    "summary": "A short, accurate introduction.",
    "tags": ["Python", "JavaScript"]
}
```

Use the exact repository capitalization returned by GitHub for override keys. Adding an override cannot publish a private or excluded repository. Paths for custom existing images must start with `/assets/` and refer to a file you put in `public/assets/`.

## Update your local copy

Double-click **SYNC-GITHUB.bat**, then refresh the website. Internet is required. Or run:

```sh
python scripts/sync_github.py --update-db
```

This updates the seed content, bundled files, and the project list in an existing SQLite database. The existing local profile and contact messages are preserved. The server does not poll GitHub in the background. You choose when to sync locally; the scheduled workflow handles the published Pages site.

Admin JSON editing still works. For persistent project edits across future syncs, also record those edits under `overrides`; a sync replaces the project list with the current public repository inventory. You can manually add a public project through admin, but automatic syncing will keep it only if GitHub discovery or `additional_repos` includes it. Seed JSON and scheduled Actions builds do not change your checked-in files automatically; the workflow deploys the freshly generated snapshot without committing it back.

Do not edit generated `public/content.js` directly. The source settings are `content/github-sync.json`, and the profile remains in `content/portfolio.json`.

## Images and missing files

Actual repository images are saved locally under public/assets/github and copied to the Pages output. A missing custom image path triggers discovery again. If no usable bitmap can be downloaded, the image path is empty and both the static page and interactive card omit the visual block. A browser image-load error removes its image area instead of leaving a broken picture. The full assets folders must be uploaded with the source.
