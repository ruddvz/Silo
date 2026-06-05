# Silo

**Silo** is a privacy-minded, **local-first** document vault that runs in the browser. Store PDFs, images, audio recordings, and text notes on your device; organize them with categories and smart views; and search with **full-text** and **on-device semantic** retrieval. Optional passphrase protection wraps indexed text at rest. Your files are not uploaded to an application server—when the browser supports it, data lives in the **Origin Private File System (OPFS)**.

This repository contains the web application: **Vite** + **React 19**, with vault logic under [`src/vault/`](src/vault/).

[![Deploy to GitHub Pages](https://github.com/ruddvz/Silo/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ruddvz/Silo/actions/workflows/deploy-pages.yml)

---

## Who it is for

Silo suits anyone who wants a **personal archive** of documents and snippets **without** handing originals to a cloud backend: receipts, IDs, leases, notes, voice memos, and screenshots—indexed and searchable **where you open the app**.

---

## Highlights

| Domain | Capabilities |
|--------|----------------|
| **Storage** | OPFS-backed vault on supported browsers; empty vault in production (demo gated by env) |
| **Mobile shell** | Capture-first home screen, bottom nav (Home / Search / Capture / Vault / Settings) |
| **Ingest** | PDF text extraction, image OCR, audio transcription, plain notes, clipboard paste; optional **link from disk** (Chromium); HEIC guidance on iOS |
| **Search** | Full-text index ([Orama](https://oramajs.org/)) plus optional **hybrid semantic** search with on-device embeddings; “why matched” hints |
| **Organization** | Categories (tags), smart views (e.g. recent, voice, screenshots), filters |
| **Trust & recovery** | Vault migrations with pre-run snapshots, health checks, repair tools, **ZIP** export/import with validation and pre-import snapshots |
| **Installable web app** | Web app manifest, service worker with update banner, share-target import queue, iOS safe-area layout |
| **Shared lists** | Optional Silo Lists module (`/#lists`) — separate from vault; syncs via Supabase when configured, local-only otherwise |

Packaging notes for **Android TWA**, **Capacitor**, and related setups live in [`public/native/README.md`](public/native/README.md) and [`public/native/TWA.md`](public/native/TWA.md).

---

## Stack

| Layer | Choices |
|-------|---------|
| UI | React 19, Framer Motion |
| Build | Vite 6 |
| Search | Orama (full-text), hybrid + vector helpers in-repo |
| Documents | pdf.js (PDF), Tesseract.js (OCR), Transformers.js family (embeddings / transcription where enabled) |
| Compression | fflate (ZIP backups) |

Exact versions are pinned in [`package.json`](package.json).

---

## Requirements

- **Node.js** 20 or newer (continuous integration uses Node **22**)
- **npm** or a compatible client

Use **`localhost`** or **HTTPS** so OPFS and related APIs behave as intended. Opening the build from **`file://`** or other restricted origins may limit storage and capabilities.

---

## Quick start

```bash
git clone https://github.com/ruddvz/Silo.git
cd Silo
npm install
npm run dev
```

Open the URL printed by Vite in a supported desktop or mobile browser.

### npm scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Production build plus GitHub Pages post-processing ([`scripts/gh-pages-postbuild.mjs`](scripts/gh-pages-postbuild.mjs)) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests (vault migrations, backup validation, file types) |
| `npm run analyze` | Production build with chunk size summary |
| `npm run a11y` | Preview build and run axe accessibility scan (requires build first) |

---

## Configuration

### Demo data (development only)

Production builds start with an **empty vault**. To seed demo documents locally:

```bash
# .env.local
VITE_ENABLE_DEMO_DATA=true
```

### Silo Lists (optional)

Shared checklists live at `/#lists`. Without Supabase credentials the module runs in **local mode** on this device. See [`docs/SILO_LISTS.md`](docs/SILO_LISTS.md).

### Base URL (GitHub Pages project sites)

GitHub Pages serves project sites at `https://<user>.github.io/<repository>/`. Assets and the PWA manifest must use that base path.

- **CI**: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) sets `VITE_BASE_URL=/<repository-name>/`. If that variable is ever omitted, **`GITHUB_REPOSITORY`** (always present in Actions) is used to infer the same path in `vite.config.js` and in [`scripts/gh-pages-postbuild.mjs`](scripts/gh-pages-postbuild.mjs).
- **Local verification** (replace `Silo` if your fork uses another name):

```bash
npm ci
VITE_BASE_URL=/Silo/ npm run build
mkdir -p _pages/Silo && cp -r dist/* _pages/Silo/
npx --yes serve _pages
```

Then open `http://localhost:<port>/Silo/` (the CLI prints the port).

---

## Deploying to GitHub Pages

1. Ensure the workflow **Deploy to GitHub Pages** exists on your default branch ([`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)).
2. In the repository: **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).
3. Push to `main` or run **Actions → Deploy to GitHub Pages → Run workflow**.

After a successful run, the published URL appears in the workflow summary and under **Settings → Pages**.

### Site loads as a blank (often black) page

Almost always the browser failed to load the JavaScript bundle. Open **Developer Tools → Network**, reload, and check the main `index-*.js` request.

- **404 on `/assets/...`** while the site URL is `https://<user>.github.io/<repo>/`: the build used root base path `/` instead of `/<repo>/`. Fix: use the **Deploy to GitHub Pages** workflow (it sets `VITE_BASE_URL`), or build with `VITE_BASE_URL=/<repository-name>/ npm run build`. On GitHub Actions, `GITHUB_REPOSITORY` is now used automatically when `VITE_BASE_URL` is omitted.
- **Pages source is “Deploy from a branch”** with only source files (no `npm run build` output): GitHub is not serving a Vite build; switch **Source** to **GitHub Actions** as above.

### Deploy fails with `HttpError: Not Found`

Usually **Pages** is not yet set to **GitHub Actions**, or the setting has not finished saving.

1. Confirm **Settings → Pages → Build and deployment → Source** is **GitHub Actions**.
2. Wait a few seconds, then **re-run** the failed workflow or push an empty commit.

The **build** job can succeed while **deploy** fails until that setting is correct.

---

## Repository layout

```
├── docs/                Agent progress, privacy, recovery, release checklist, iOS PWA plan
├── public/              Static assets, manifest, service worker, native/TWA docs
├── scripts/             Build helpers (e.g. GitHub Pages manifest / SPA fallback)
├── src/
│   ├── components/      UI modules (home screen, backup panel, modals, …)
│   ├── hooks/           React hooks (search, PWA lifecycle, …)
│   ├── lib/             Shared helpers (vault tags, file types, search explain, …)
│   ├── lists/           Optional Silo Lists app (Supabase or local mode)
│   ├── vault/           OPFS, crypto, search, OCR, transcription, backup, migrations
│   ├── Silo.jsx         Main vault application UI
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

---

## Privacy and security

- **Local-first**: Vault blobs and the manifest live in OPFS when the browser allows it; OCR, transcription, and embedding work run in the page.
- **Optional passphrase**: Can protect indexed text at rest. Use a strong passphrase and keep backups—losing it can make encrypted index content unrecoverable.
- **Linked files**: “Link from disk” keeps indexing metadata and text while reading originals from disk when the browser permits.
- **Backups**: Export ZIP backups regularly; import validates archives and saves a manifest snapshot before merge.
- **Silo Lists**: Checklist sync is separate from the vault. Vault documents are never uploaded to Lists. See [`docs/privacy-security.md`](docs/privacy-security.md) and [`docs/data-recovery.md`](docs/data-recovery.md).

Treat `src/vault/` and your browser’s permission model as part of your threat assessment before storing highly sensitive material.

---

## Contributing

Issues and pull requests are welcome. For application changes, please run `npm run lint`, `npm run test`, and `npm run build` before submitting.

---

## Acknowledgments

Silo builds on **Orama**, **pdf.js**, **Tesseract.js**, **Transformers.js** (and related runtimes for on-device ML), **fflate**, and other dependencies listed in [`package.json`](package.json).
