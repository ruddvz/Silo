# Silo

Private, local-first document vault (Vite + React). OPFS storage, search, PWA share target, backups, and more.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (needs a secure context for OPFS: `localhost` or HTTPS).

## GitHub Pages

The repo includes **Deploy to GitHub Pages** (`.github/workflows/deploy-pages.yml`). It builds with `VITE_BASE_URL=/<repository-name>/` so assets work on a **project site** at `https://<user>.github.io/<repo>/`.

1. Merge this workflow into your **default branch** (`main`).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or use **Actions → Deploy to GitHub Pages → Run workflow**).

The site URL is shown on the successful workflow run (and under **Settings → Pages**).

### If the workflow fails on “Deploy to GitHub Pages”

A **`HttpError: Not Found`** (or “Creating Pages deployment failed”) almost always means **Pages is not wired to Actions yet** (or was still saving). Fix:

1. **Settings → Pages → Build and deployment → Source** must be **GitHub Actions** (not “Deploy from a branch”).
2. Save, wait a few seconds, then **re-run the failed workflow** (or push an empty commit).

The **build** job can succeed while **deploy** fails until that setting is correct.

### Try the same build locally (subpath)

Replace `Silo` with your repo name if different:

```bash
npm ci
VITE_BASE_URL=/Silo/ npm run build
mkdir -p _pages/Silo && cp -r dist/* _pages/Silo/
npx --yes serve _pages
```

Then open `http://localhost:3000/Silo/` (port from `serve` output).
