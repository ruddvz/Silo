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

### Try the same build locally (subpath)

Replace `Silo` with your repo name if different:

```bash
npm ci
VITE_BASE_URL=/Silo/ npm run build
mkdir -p _pages/Silo && cp -r dist/* _pages/Silo/
npx --yes serve _pages
```

Then open `http://localhost:3000/Silo/` (port from `serve` output).
