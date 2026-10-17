# Publish your portfolio with GitHub Pages

The package contains a ready-to-use GitHub Actions workflow. These instructions publish the portfolio frontend. GitHub Pages cannot execute Python or SQLite; on Pages the contact form creates an email draft, and local admin/inbox features stay on your Python server.

## 1. Create a repository

Sign in at https://github.com and create a new public repository named `ankit-portfolio`. Leave README, license, and .gitignore initialization off if following the commands below.

## 2. Upload the extracted source

Extract the ZIP. Open Git Bash inside the inner `ankit-portfolio` folder — the folder that directly contains `server.py`, `public`, and `.github`.

```sh
# Confirm that you are inside the project folder before running git init.
pwd
ls

# Create a local repository and add this project's files.
git init
git add .
git commit -m "Add portfolio with GitHub Pages support"
git branch -M main

# Connect to the empty repository you created, then upload.
git remote add origin https://github.com/Ankit-ku-panda/ankit-portfolio.git
git push -u origin main
```

If you chose another repository name, change the remote URL to match. If `origin` already exists, check `git remote -v`; use `git remote set-url origin YOUR-REPOSITORY-URL` only when it is the correct project repository.

Do not initialize Git from your whole D: drive or Downloads folder. The supplied `.gitignore` excludes `.env`, SQLite data, and temporary output. Check `git status` before committing.

## 3. Enable Pages

1. Open the repository on GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Open **Actions → Publish portfolio to GitHub Pages**.
5. If the first run failed because Pages was not enabled yet, select **Run workflow** or rerun that job.
6. When the job succeeds, use the site URL shown in **Settings → Pages**.

For the suggested repository, the expected URL is:

https://ankit-ku-panda.github.io/ankit-portfolio/

This is an expected address, not a site deployed by this delivery. If you use a different repository name, the path changes. Relative asset paths make either form work.

## 4. Update published content

New public repositories and README changes are discovered automatically every six hours, on portfolio pushes, or on a manual workflow run. The workflow publishes a generated snapshot; it does not commit it back to your source repository.

Edit the profile in `content/portfolio.json`. For persistent project descriptions, images, categories, and ordering, edit `content/github-sync.json` under `overrides` and `featured_repos`. You can add another public repository in `additional_repos`; private repositories and `ptcg-agent` remain excluded.

If you use the local admin editor, export JSON to back up your profile changes. Copy the profile section into `content/portfolio.json`, and copy persistent project customizations into the corresponding override entries. The next sync intentionally rebuilds the project list from current public GitHub repositories.

```sh
git add .
git commit -m "Update portfolio settings"
git push
```

The phone and email are visible publicly as requested: +91 73279 83649 and kumarpanda1403@gmail.com. Read **GITHUB-SYNC.md** for examples and local syncing instructions.

## What works in each mode?

| Feature | Local Python server | GitHub Pages |
| --- | --- | --- |
| Profile, projects and repository images | Yes | Yes |
| Project filters and detail dialogs | Yes | Yes |
| Direct phone and email links | Yes | Yes |
| Contact form | Saves message to SQLite | Opens a draft in visitor's email app |
| SQLite inbox and admin editing | Yes, open admin | No server available |

## Full Python backend hosting

A Python-capable host can connect to the same GitHub repository and run `python server.py`. Configure `HOST=0.0.0.0` and the host's required `PORT`. SQLite needs a persistent writable disk; set `DATABASE_PATH` to that disk's absolute path. The public frontend and API should share the same origin in this mode. Static-only hosts cannot execute this backend.

Admin access is intentionally open as you requested. A publicly accessible Python deployment also makes editing and inbox access public. The GitHub Pages workflow excludes admin and database files entirely.

The bundled HTTP server is for local/trusted use. For a production backend, use an appropriate production server/reverse proxy and HTTPS. This package does not deploy the backend or claim to configure a particular provider.

## Official references

- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Automatic repository discovery

Before every Pages deployment, the workflow runs `scripts/sync_github.py`. It also runs every six hours. New public repositories and new README content appear on the next successful run; private repositories and `ptcg-agent` are excluded. Read GITHUB-SYNC.md for exclusions, manual additions, persistent overrides, and local syncing.
