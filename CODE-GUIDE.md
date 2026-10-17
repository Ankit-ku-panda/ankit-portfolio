# Beginner's guide to the source

Start with `public/index.html`, then read `public/style.css` and `public/app.js`. Each code file has comments marking the main sections and explaining their purpose. No minification is used.

| File | What it does | What you might change |
| --- | --- | --- |
| `START-WINDOWS.bat` | Finds Python 3.10+, starts the server, keeps errors visible | Usually nothing |
| `server.py` | Serves HTML/images/scripts and exposes API routes | Host settings, validation, database logic |
| `content/portfolio.json` | Stores the initial profile and project descriptions | Names, descriptions, skills |
| `public/index.html` | Defines the page sections and navigation | Headings, section order, links |
| `public/style.css` | Defines colors, typography, cards and mobile layouts | Appearance |
| `public/app.js` | Displays and filters cards, opens details, handles contact | Frontend behavior |
| `public/content.js` | Generated snapshot used without the backend | Regenerate it instead of editing it |
| `public/admin.html` | Defines the local editor and inbox layout | Admin labels and layout |
| `public/admin.js` | Loads/saves JSON and reads/deletes messages | Admin behavior |
| `scripts/build_public.py` | Creates HTML project cards and bundled content | Static build logic |
| `.github/workflows/pages.yml` | Builds and publishes the static portfolio after a push | GitHub deployment |
| `tests/` | Checks API, assets, and frontend rendering logic | Regression checks |

## What happens when the website opens?

1. HTML already contains the public project cards, profile, and contact links.
2. `content.js` provides the same data to JavaScript.
3. `app.js` makes the cards searchable and adds detail dialogs.
4. On the Python server, JavaScript fetches the latest saved content from `/api/portfolio`.
5. On Pages, the bundled content remains active, with no API request needed.

## What happens when someone sends a message?

With Python running, the form sends JSON to `/api/contact`. The server validates it and saves it to SQLite. The admin inbox reads saved messages.

On GitHub Pages, the form creates a `mailto:` link containing a draft. The visitor must review and send the email in their email application. The website does not claim an email was sent.

## What fixed project loading?

The Python server now explicitly marks `.js` responses as `text/javascript`. Some Windows MIME settings may return `text/plain`, which browsers refuse when `nosniff` is enabled. Files now use relative URLs for GitHub repository paths. Project cards and profile content are also present in HTML before JavaScript runs, and API requests have a timeout and a bundled fallback. Query versions and no-cache headers help avoid stale scripts after an update.

The original screenshot did not show the browser console, so the exact browser-side failure was not directly confirmed. These fixes address the observed blank content and the Windows MIME risk.

## A few basic concepts

- **HTML** defines the page's content and structure.
- **CSS** defines appearance and screen-size adjustments.
- **JavaScript** responds to clicks and communicates with the server.
- **Python** handles HTTP requests and stores data.
- **SQLite** is a database kept in one file.
- **JSON** is structured text for exchanging profile and project data.
- **GET** reads data, **POST** creates a message, **PUT** saves content, and **DELETE** removes a message.

To edit live local content, use `/admin`. The seed JSON is imported only when the database is first created. To publish local edits to Pages, export JSON and replace `content/portfolio.json` before pushing.

## GitHub discovery

`scripts/sync_github.py` contains four commented sections: public HTTP access, README/image parsing, project creation, and saving the result. Settings live in `content/github-sync.json`. `SYNC-GITHUB.bat` also applies synced projects to the local SQLite database without changing profile or inbox data. Scheduled Pages builds run the sync before generating static output. See GITHUB-SYNC.md.
