# Ankit Panda — Development Lab

A complete portfolio inspired by the supplied Traceframe Lab reference. It includes a Python/SQLite backend for local use and a standalone version for GitHub Pages. All currently public repositories except `ptcg-agent` are included; screenshots come from the repositories where available; no new showcase images were generated.

## Run on Windows

1. Install Python 3.10 or newer with **Add Python to PATH** enabled.
2. Extract the ZIP into a new folder. Open the inner `ankit-portfolio` folder.
3. Double-click **START-WINDOWS.bat**. It checks Python, starts the server, and opens the correct browser URL automatically.
4. Keep that terminal window open. Press Ctrl+C to stop.

Website: http://127.0.0.1:8000

Admin: http://127.0.0.1:8000/admin

No token, npm packages, pip packages, or paid APIs are required. The launcher keeps error messages visible if startup fails. If another server is already using the port, stop its window or choose another PORT in `.env`.

If you are replacing an earlier version, stop its terminal first and extract into a new folder. Open the new address and press **Ctrl+F5** once to discard old cached files. To keep existing messages and local admin edits, stop both servers and copy the old `data` directory into the new project before starting it.

Manual start:

```sh
python server.py --open
```

On macOS/Linux use `python3 server.py --open` or `sh start.sh`. Do not use `0.0.0.0` as a browser URL; use `127.0.0.1` locally or the computer's actual LAN address from another device.

## What changed in this revision

- Corrected script MIME types explicitly, including on Windows.
- Embedded public project cards and profile text in HTML, so the page never depends on an API to display them.
- Added immediate bundled data, API timeout/fallback, relative URLs, and cache refresh handling.
- Added Projects, Work, Profile, and Contact navigation; Work describes personal project practice, not employment claims.
- Added clickable contact link
 **kumarpanda1403@gmail.com**.
- Added readable indentation, numbered section comments, and **CODE-GUIDE.md**.
- Added an automatic GitHub Pages workflow and **GITHUB-HOSTING.md**.

## Host with GitHub

Follow **[GITHUB-HOSTING.md](GITHUB-HOSTING.md)** for the exact upload commands and Settings → Pages steps. The supplied `.github/workflows/pages.yml` builds and publishes the static portfolio when you push to `main` after enabling Pages. Nothing has been published by creating this ZIP.

GitHub Pages runs the frontend; it does not execute Python or SQLite. On Pages, the form opens an email draft for the visitor to send, and the local admin/inbox is not published. Full Python hosting needs a Python-capable server and persistent storage.

## Edit your profile and projects

Open `/admin` on the local Python server. Edit the JSON and save. Admin access is intentionally open as requested: anyone who can reach the Python server can edit content and read/delete contact messages.

`content/portfolio.json` is the seed for the first database run and the source for static hosting. Existing local databases keep admin changes. For Pages, export your admin JSON and copy it over `content/portfolio.json` before committing and pushing.

Images live in `public/assets/`; use `/assets/filename.png` in project JSON. See **ASSET-SOURCES.md** for the original repository paths and commit references.

## Configuration is optional

Copy `.env.example` to `.env` only if you need custom settings:

```env
HOST=0.0.0.0
PORT=8000
# DATABASE_PATH=D:/PortfolioData/portfolio.db
```

HOST=0.0.0.0 listens on available network interfaces. Other devices need your computer's actual LAN address and network/firewall access. It does not publish the site to the internet. Old ADMIN_TOKEN entries are ignored. Shell environment variables take priority over `.env`.

## Learn the code

Read **[CODE-GUIDE.md](CODE-GUIDE.md)** for a file-by-file explanation and the frontend/backend data flow. The code uses standard HTML, CSS, JavaScript, Python and SQLite.

## Check the project

Run from this project folder:

```sh
python -m unittest discover -s tests -v
node tests/test_frontend.cjs
```

Node is only needed for the optional frontend checks, not for running the website. Checks cover API updates, messages, validation, persistence, script MIME types, image serving, real HTML cards, initial JS rendering, search, filters, dialogs, Pages mode, and API fallback. Frontend checks use a small DOM substitute; they are not a full browser visual test. The Windows BAT was reviewed but could not be executed in the Linux build environment.

Build a Pages package locally:

```sh
python scripts/build_public.py --output _site
```

Only public portfolio files are copied to `_site`; no backend, SQLite data, .env, or admin page is included. The workflow runs this build automatically on GitHub.

## Public repository syncing

Read **GITHUB-SYNC.md**. The Pages workflow now checks for new public repositories every six hours and on portfolio pushes/manual runs. Use **SYNC-GITHUB.bat** to update local projects. Customize `content/github-sync.json` to exclude, feature, override, or manually include public repositories. Private repositories and `ptcg-agent` are omitted.

## Pinned order and repository photos

GitHub profile pins appear first and keep their public profile order. Screenshot discovery now searches repository folders as well as README links. Projects without an available image show only their title and content. Run SYNC-GITHUB.bat after changing pins or to update an older local database.
