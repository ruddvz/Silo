# Silo

**Silo** is a private, local-first document vault for the web. Keep PDFs, images, audio, and text notes on your device, search them with keywords and on-device semantic embeddings, and optionally encrypt indexed text with a passphrase. No server stores your files—data lives in the browser’s **Origin Private File System (OPFS)** when the environment supports it.

Built with **Vite**, **React 19**, and a small vault layer under `src/vault/`.

---

## Features

| Area | What you get |
|------|----------------|
| **Storage** | OPFS-backed vault on supported browsers; demo dataset when OPFS is unavailable |
| **Ingest** | PDFs (text extraction), images (OCR), audio (transcription), plain text notes, optional **link from disk** (File System Access API on Chromium) |
| **Search** | Full-text index (Orama) plus hybrid **semantic** search where embeddings run locally |
| **Organization** | Categories (tags), smart views (e.g. recent, voice, screenshots), filters |
| **Security & tools** | Optional vault passphrase for index text, integrity checks, repair, export/import **`.zip`** backups |
| **PWA** | Web app manifest, service worker, share-target flow for importing shared content into the queue |

For **Android TWA**, **Capacitor**, and related notes, see `public/native/README.md` and `public/native/TWA.md`.

---

## Requirements

- **Node.js** 20+ (CI uses 22)
- **npm** (or compatible client)

For **OPFS** and full vault behavior, open the app from **`localhost`** or **HTTPS**. Plain `file://` or insecure origins may limit storage APIs.

---

## Quick start

```bash
git clone https://github.com/ruddvz/Silo.git
cd Silo
npm install
npm run dev
```

Open the URL Vite prints in a supported browser.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build + GitHub Pages post-build step |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

---

## Configuration

### Base path (GitHub Pages)

Project sites are served under `https://<user>.github.io/<repo>/`. The build uses `VITE_BASE_URL` so asset URLs resolve correctly.

- **CI**: `.github/workflows/deploy-pages.yml` sets `VITE_BASE_URL=/<repository-name>/`.
- **Local check** (replace `Silo` with your repo name if different):

```bash
npm ci
VITE_BASE_URL=/Silo/ npm run build
mkdir -p _pages/Silo && cp -r dist/* _pages/Silo/
npx --yes serve _pages
```

Then open `http://localhost:<port>/Silo/` (port is printed by `serve`).

---

## Deploying to GitHub Pages

1. Ensure **Deploy to GitHub Pages** exists on your default branch (see `.github/workflows/deploy-pages.yml`).
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions** (not “Deploy from a branch”).
3. Push to `main` or run **Actions → Deploy to GitHub Pages → Run workflow**.

After a successful run, the site URL appears on the workflow summary and under **Settings → Pages**.

### If deploy fails with `HttpError: Not Found`

That usually means **Pages is not set to GitHub Actions** yet (or the setting is still saving).

1. **Settings → Pages → Build and deployment → Source** must be **GitHub Actions**.
2. Save, wait a few seconds, then **re-run** the failed workflow (or push an empty commit).

The **build** job can succeed while **deploy** fails until that setting is correct.

---

## Project layout

```
├── public/           # Static assets, manifest, service worker, native docs
├── scripts/          # Build helpers (e.g. GitHub Pages post-build)
├── src/
│   ├── assets/       # Brand assets (e.g. header logo)
│   ├── vault/        # OPFS, crypto, search, OCR, transcribe, backup, etc.
│   ├── Silo.jsx      # Main app UI
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

---

## Privacy model

- **Local-first**: Vault blobs and manifest live in OPFS when available; processing (OCR, transcription, embeddings) runs in the browser.
- **Passphrase** (optional): Can wrap indexed text at rest; choose a strong passphrase and keep backups—loss of passphrase means loss of readable index text for encrypted entries.
- **Linked files**: “Link from disk” indexes metadata/text while reading the original file from disk when permitted by the browser.

Review `src/vault/` and browser permissions for your threat model before storing highly sensitive material.

---

## Contributing

Issues and pull requests are welcome. Please run `npm run lint` and `npm run build` before submitting when you change application code.

---

## Acknowledgments

Uses **Orama** for search, **pdf.js** for PDFs, **Tesseract.js** for OCR, **Transformers.js** / related stacks for on-device embeddings and transcription where configured, and **fflate** for zip backup handling. See `package.json` for exact packages and versions.
