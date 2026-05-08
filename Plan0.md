# 🗄 SILO — Pixel-Perfect UI/UX & PWA Improvement Plan

> **Repo:** `ruddvz/Silo` — A privacy-first, local-first document vault (Vite + React 19 + OPFS)  
> **Stack:** React 19, Framer Motion, Orama, pdf.js, Tesseract.js, @xenova/transformers, fflate  
> **Targets:** Mobile PWA (Android/iOS), Desktop PWA (Chrome/Edge/Brave), GitHub Pages deployment

---

## 0. Reading the App — What Silo Actually Does

Before touching a single pixel, know the full feature surface:

| Feature | What It Is | Current Risk |
|---|---|---|
| **OPFS Vault** | Files stored in Origin Private File System, never uploaded | Silent failures on unsupported browsers |
| **PDF ingestion** | pdf.js extracts text client-side | No visual progress, user confusion |
| **OCR** | Tesseract.js processes images in-browser | Long waits with no feedback |
| **Audio transcription** | @xenova/transformers (Whisper) runs locally | No streaming progress indicator |
| **Semantic search** | Hybrid full-text (Orama) + vector embeddings | Query feels "broken" if embeddings aren't loaded yet |
| **Categories / Smart views** | Tag-based org + built-in views (Recent, Voice, Screenshots) | No empty-state design |
| **Passphrase protection** | Encrypts indexed text at rest | Unlock flow not obvious to new users |
| **ZIP backup/restore** | Full vault export + import | Destructive action with no safeguard |
| **Share-target** | Mobile "Share to Silo" OS integration | Pending items queue needs its own UI |
| **Link from disk** | File System Access API (Chromium only) | No clear "not supported" fallback |
| **TWA / Capacitor** | Android packaging docs in `public/native/` | Build path not surfaced in dev UI |

---

## 1. Design System — Ground Truth

Everything else depends on nailing the tokens first.

### 1.1 Color Palette

```css
/* src/design/tokens.css  — import at top of index.css */

:root {
  /* Neutrals — warm off-black, not pure #000 */
  --color-bg:          #0f0f10;
  --color-surface:     #161618;
  --color-surface-2:   #1e1e21;
  --color-border:      #2a2a2f;
  --color-border-hover:#3a3a42;

  /* Text */
  --color-text-primary:   #f0eff4;
  --color-text-secondary: #8b8a94;
  --color-text-muted:     #55545e;

  /* Brand — one true accent, used sparingly */
  --color-accent:       #7f6cf5;   /* muted violet — trust + tech */
  --color-accent-dim:   #7f6cf520;
  --color-accent-hover: #9886f7;

  /* Semantic */
  --color-success:  #3ecf8e;
  --color-warning:  #f5a623;
  --color-danger:   #ef4444;
  --color-info:     #38bdf8;

  /* Category pill palette (8 colours, auto-assigned) */
  --cat-0: #7f6cf5; --cat-1: #3ecf8e; --cat-2: #f5a623;
  --cat-3: #ef4444; --cat-4: #38bdf8; --cat-5: #e879f9;
  --cat-6: #fb923c; --cat-7: #a3e635;
}
```

> **Why warm off-black?** Pure `#000` kills depth. `#0f0f10` lets surface layers pop without eye strain on OLED screens (most mobile PWA users).

### 1.2 Typography

```css
/* Load in index.html <head> */
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300..600;1,9..40,300..400&display=swap" rel="stylesheet">
```

```css
:root {
  /* Display — brand wordmark, empty states, modal titles */
  --font-display: 'Instrument Serif', Georgia, serif;

  /* Body — all prose, labels, body copy */
  --font-body:    'DM Sans', system-ui, sans-serif;

  /* Mono — file names, paths, search snippets, metadata */
  --font-mono:    'Geist Mono', 'Fira Code', monospace;

  /* Scale */
  --text-xs:   0.6875rem;  /* 11px */
  --text-sm:   0.8125rem;  /* 13px */
  --text-base: 0.9375rem;  /* 15px */
  --text-md:   1.0625rem;  /* 17px */
  --text-lg:   1.25rem;    /* 20px */
  --text-xl:   1.5rem;     /* 24px */
  --text-2xl:  2rem;       /* 32px */

  /* Line height */
  --leading-tight:  1.25;
  --leading-normal: 1.55;
  --leading-relaxed:1.75;

  /* Letter spacing */
  --tracking-tight:  -0.02em;
  --tracking-normal:  0em;
  --tracking-wide:    0.04em;
  --tracking-widest:  0.12em;
}
```

### 1.3 Spacing & Radius

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10:40px;
  --space-12:48px;
  --space-16:64px;

  --radius-sm:  6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Safe-area insets for notched phones & home-bar devices */
  --safe-top:    env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left:   env(safe-area-inset-left, 0px);
  --safe-right:  env(safe-area-inset-right, 0px);
}
```

### 1.4 Motion Presets (Framer Motion)

```js
// src/design/motion.js
export const SPRING_GENTLE = { type: 'spring', stiffness: 260, damping: 26 };
export const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 32 };
export const EASE_OUT      = { duration: 0.22, ease: [0.22, 1, 0.36, 1] };
export const EASE_IN_OUT   = { duration: 0.3,  ease: [0.4, 0, 0.2, 1] };

// Page-level transition
export const PAGE_VARIANTS = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: EASE_OUT },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

// List stagger
export const STAGGER_CONTAINER = {
  visible: { transition: { staggerChildren: 0.04 } },
};
export const STAGGER_ITEM = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: EASE_OUT },
};

// Respect reduced-motion
export const useReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

---

## 2. PWA Foundation — Make It Actually Work

### 2.1 `public/manifest.json` — Complete Overhaul

```json
{
  "name": "Silo — Private Vault",
  "short_name": "Silo",
  "description": "Your local-first, private document vault.",
  "start_url": "/Silo/",
  "scope": "/Silo/",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone"],
  "orientation": "any",
  "background_color": "#0f0f10",
  "theme_color": "#0f0f10",
  "categories": ["productivity", "utilities"],
  "dir": "ltr",
  "lang": "en",
  "icons": [
    { "src": "icons/icon-192.png",    "sizes": "192x192",   "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-192-mask.png","sizes":"192x192",   "type": "image/png", "purpose": "maskable" },
    { "src": "icons/icon-512.png",    "sizes": "512x512",   "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512-mask.png","sizes":"512x512",   "type": "image/png", "purpose": "maskable" },
    { "src": "icons/icon.svg",        "sizes": "any",       "type": "image/svg+xml" }
  ],
  "screenshots": [
    { "src": "screenshots/desktop.png", "sizes": "1280x800",  "type": "image/png", "form_factor": "wide" },
    { "src": "screenshots/mobile.png",  "sizes": "390x844",   "type": "image/png", "form_factor": "narrow" }
  ],
  "share_target": {
    "action": "/Silo/share-target",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        { "name": "files", "accept": ["application/pdf","image/*","audio/*","text/*"] }
      ]
    }
  },
  "shortcuts": [
    {
      "name": "New Note",
      "short_name": "Note",
      "url": "/Silo/?intent=note",
      "icons": [{ "src": "icons/shortcut-note.png", "sizes": "96x96" }]
    },
    {
      "name": "Search",
      "short_name": "Search",
      "url": "/Silo/?intent=search",
      "icons": [{ "src": "icons/shortcut-search.png", "sizes": "96x96" }]
    }
  ],
  "file_handlers": [
    {
      "action": "/Silo/",
      "accept": {
        "application/pdf": [".pdf"],
        "image/*": [".jpg",".jpeg",".png",".webp",".gif"],
        "audio/*": [".mp3",".m4a",".wav",".ogg"],
        "text/plain": [".txt",".md"]
      }
    }
  ],
  "handle_links": "preferred",
  "edge_side_panel": { "preferred_width": 400 }
}
```

**Action items:**
- Generate proper maskable icons (safe-zone = 80% circle) — use Maskable.app or Figma
- Add Apple-specific meta tags in `index.html` (see §2.3)
- Generate `screenshots/` for install prompt enrichment

### 2.2 Service Worker (`public/sw.js`) — Audit & Harden

```js
// public/sw.js — annotated strategy

const CACHE_VERSION = 'silo-v3';
const STATIC_ASSETS = [
  '/', '/index.html', '/manifest.json',
  // Add all hashed JS/CSS chunks at build time via workbox or vite-plugin-pwa
];

// Install: pre-cache shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: purge old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for assets, network-first for navigation
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // OPFS / IDB requests — never intercept
  if (request.url.includes('__opfs')) return;

  // Navigation: network-first → fallback to cached index.html (SPA)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/Silo/index.html'))
    );
    return;
  }

  // Transformers/WASM models — cache-first (they're huge)
  if (url.hostname.includes('huggingface') || url.pathname.endsWith('.wasm')) {
    e.respondWith(
      caches.match(request).then(r => r || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  e.respondWith(
    caches.match(request).then(cached => {
      const fetched = fetch(request).then(res => {
        caches.open(CACHE_VERSION).then(c => c.put(request, res.clone()));
        return res;
      });
      return cached || fetched;
    })
  );
});

// Share target handler
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/share-target') && e.request.method === 'POST') {
    e.respondWith((async () => {
      const formData = await e.request.formData();
      const client   = await self.clients.get(e.resultingClientId || e.clientId);
      const files    = formData.getAll('files');
      if (client) client.postMessage({ type: 'SHARE_TARGET', files, title: formData.get('title') });
      return Response.redirect('/Silo/?shared=1', 303);
    })());
  }
});
```

**Recommendation:** Switch to `vite-plugin-pwa` for automatic asset precaching + workbox strategies. Add to `vite.config.js`:

```js
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        runtimeCaching: [
          {
            urlPattern: /huggingface\.co/,
            handler: 'CacheFirst',
            options: { cacheName: 'hf-models', expiration: { maxAgeSeconds: 60*60*24*30 } }
          }
        ]
      },
      manifest: { /* inline manifest here */ }
    })
  ]
}
```

### 2.3 `index.html` — iOS PWA & Meta Tags

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

  <!-- PWA / theme -->
  <meta name="theme-color" content="#0f0f10" media="(prefers-color-scheme: dark)" />
  <meta name="theme-color" content="#f0eff4" media="(prefers-color-scheme: light)" />
  <meta name="mobile-web-app-capable" content="yes" />

  <!-- iOS -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Silo" />
  <link rel="apple-touch-icon" href="/Silo/icons/icon-192.png" />
  <link rel="apple-touch-startup-image" href="/Silo/splash/splash-1170x2532.png"
        media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />

  <!-- Manifest -->
  <link rel="manifest" href="/Silo/manifest.json" />

  <!-- SEO / OG -->
  <title>Silo — Private Vault</title>
  <meta name="description" content="Local-first document vault. PDFs, images, notes — searched, stored, yours." />
</head>
```

---

## 3. Layout Architecture — Shell & Navigation

### 3.1 Overall Shell Structure

```
┌─────────────────────────────────────────────────────┐
│  DESKTOP (≥ 900px)                                  │
│  ┌──────────┬──────────────────────┬──────────────┐ │
│  │ Sidebar  │  Document List       │  Preview     │ │
│  │ 220px    │  flex-grow           │  380px       │ │
│  │          │                      │              │ │
│  │ Logo     │  Search Bar          │  [Doc view]  │ │
│  │ ----     │  [Filter chips]      │              │ │
│  │ Smart    │  [Item cards...]     │              │ │
│  │ Views    │                      │              │ │
│  │ ----     │                      │              │ │
│  │ Cats     │                      │              │ │
│  │ ----     │                      │              │ │
│  │ Settings │                      │              │ │
│  └──────────┴──────────────────────┴──────────────┘ │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│  MOBILE (< 900px)               │
│  ┌─────────────────────────────┐│
│  │  Top Bar: Logo + Search Btn ││
│  ├─────────────────────────────┤│
│  │  [Filter pills — H scroll]  ││
│  ├─────────────────────────────┤│
│  │                             ││
│  │  Document Cards (full width)││
│  │                             ││
│  │                             ││
│  ├─────────────────────────────┤│
│  │  Bottom Nav (5 tabs)        ││
│  │  Home Vault Search + Settings││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### 3.2 Responsive Breakpoints

```css
/* Mobile-first */
/* xs: 0–599px   (phones portrait) */
/* sm: 600–899px (phones landscape / small tablets) */
/* md: 900–1199px (tablets, small laptops) */
/* lg: 1200px+   (desktop) */

.app-shell {
  display: grid;
  grid-template-columns: 1fr;
  height: 100dvh;          /* dynamic viewport height — critical for mobile */
  overflow: hidden;
}

@media (min-width: 900px) {
  .app-shell {
    grid-template-columns: 220px 1fr 380px;
  }
}

@media (min-width: 1400px) {
  .app-shell {
    grid-template-columns: 260px 1fr 420px;
  }
}
```

> **Critical:** Use `100dvh` not `100vh`. On mobile Chrome, `100vh` includes the browser chrome bar height — `100dvh` is the actual visible height and prevents the bottom nav from being hidden.

---

## 4. Component-Level Improvements

### 4.1 Search Bar

**Problems to fix:**
- Needs debounce (300ms) — never fire on every keystroke when embeddings are involved
- No visual state for "searching…" vs "results ready"
- No keyboard shortcut hint

**Implementation:**

```jsx
// src/components/SearchBar.jsx
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function SearchBar({ onSearch, isSearching }) {
  const [query, setQuery]       = useState('');
  const [focused, setFocused]   = useState(false);
  const debounceRef             = useRef(null);
  const inputRef                = useRef(null);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(val), 300);
  }, [onSearch]);

  // Global keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <motion.div
      className={`search-bar ${focused ? 'search-bar--focused' : ''}`}
      animate={{ boxShadow: focused ? '0 0 0 2px var(--color-accent)' : '0 0 0 1px var(--color-border)' }}
      transition={{ duration: 0.15 }}
    >
      <SearchIcon />
      <input
        ref={inputRef}
        value={query}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search vault…"
        aria-label="Search documents"
        autoComplete="off"
        spellCheck="false"
      />
      <AnimatePresence>
        {isSearching && (
          <motion.div
            className="search-spinner"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          />
        )}
        {query && !isSearching && (
          <motion.button
            className="search-clear"
            onClick={() => { setQuery(''); onSearch(''); inputRef.current?.focus(); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-label="Clear search"
          >
            ✕
          </motion.button>
        )}
      </AnimatePresence>
      {!focused && !query && (
        <kbd className="search-shortcut">⌘K</kbd>
      )}
    </motion.div>
  );
}
```

```css
/* SearchBar styles */
.search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-2);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  transition: border-color 0.15s;
}
.search-bar input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-text-primary);
  caret-color: var(--color-accent);
}
.search-bar input::placeholder { color: var(--color-text-muted); }
.search-shortcut {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 2px 5px;
}
.search-spinner {
  width: 14px; height: 14px;
  border: 2px solid var(--color-accent-dim);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

### 4.2 Document Card

```jsx
// src/components/DocumentCard.jsx
import { motion } from 'framer-motion';
import { STAGGER_ITEM } from '../design/motion';

const TYPE_ICONS = {
  pdf:   '📄',
  image: '🖼',
  audio: '🎙',
  note:  '📝',
  link:  '🔗',
};
const TYPE_LABELS = { pdf:'PDF', image:'Image', audio:'Voice', note:'Note', link:'Link' };

export function DocumentCard({ doc, isSelected, onClick }) {
  return (
    <motion.article
      variants={STAGGER_ITEM}
      layout
      className={`doc-card ${isSelected ? 'doc-card--selected' : ''}`}
      onClick={() => onClick(doc)}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(doc)}
      aria-selected={isSelected}
      aria-label={`Open ${doc.name}`}
    >
      {/* Type indicator bar */}
      <div className="doc-card__type-bar" data-type={doc.type} />

      <div className="doc-card__body">
        <div className="doc-card__header">
          <span className="doc-card__icon">{TYPE_ICONS[doc.type] ?? '📁'}</span>
          <span className="doc-card__type-label">{TYPE_LABELS[doc.type]}</span>
          <span className="doc-card__date">{formatRelativeDate(doc.createdAt)}</span>
        </div>

        <h3 className="doc-card__name">{doc.name}</h3>

        {doc.snippet && (
          <p className="doc-card__snippet"
             dangerouslySetInnerHTML={{ __html: highlightQuery(doc.snippet) }} />
        )}

        {doc.categories?.length > 0 && (
          <div className="doc-card__cats">
            {doc.categories.map(cat => (
              <CategoryPill key={cat.id} cat={cat} small />
            ))}
          </div>
        )}
      </div>

      {/* Vault storage indicator */}
      {doc.isLinked && (
        <div className="doc-card__badge doc-card__badge--linked" title="Linked from disk">
          🔗
        </div>
      )}
    </motion.article>
  );
}
```

```css
.doc-card {
  position: relative;
  display: flex;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s, background 0.15s;
}
.doc-card:hover       { border-color: var(--color-border-hover); }
.doc-card--selected   {
  border-color: var(--color-accent);
  background: var(--color-accent-dim);
}
.doc-card__type-bar {
  width: 3px;
  background: var(--cat-0);
  flex-shrink: 0;
}
.doc-card__type-bar[data-type="pdf"]   { background: var(--cat-3); }
.doc-card__type-bar[data-type="image"] { background: var(--cat-4); }
.doc-card__type-bar[data-type="audio"] { background: var(--cat-2); }
.doc-card__type-bar[data-type="note"]  { background: var(--cat-1); }

.doc-card__body   { flex: 1; padding: var(--space-3) var(--space-4); min-width: 0; }
.doc-card__header { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1); }
.doc-card__icon   { font-size: 14px; }
.doc-card__type-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--tracking-widest);
}
.doc-card__date {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.doc-card__name {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 var(--space-1) 0;
}
.doc-card__snippet {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}
.doc-card__snippet mark {
  background: var(--color-accent-dim);
  color: var(--color-accent-hover);
  border-radius: 2px;
  padding: 0 2px;
}
.doc-card__cats { display: flex; flex-wrap: wrap; gap: var(--space-1); margin-top: var(--space-2); }

.doc-card__badge {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  font-size: 10px;
  opacity: 0.7;
}
```

### 4.3 Progress / Ingestion Feedback

Critical for OCR, transcription, embedding generation — all of which can take 10–60 seconds.

```jsx
// src/components/IngestProgress.jsx
import { motion, AnimatePresence } from 'framer-motion';

const STAGES = [
  { id: 'reading',   label: 'Reading file…'       },
  { id: 'ocr',       label: 'Running OCR…'         },
  { id: 'transcribe',label: 'Transcribing audio…'  },
  { id: 'embed',     label: 'Building index…'      },
  { id: 'store',     label: 'Saving to vault…'     },
];

export function IngestProgress({ stage, progress, fileName, error }) {
  const stageIndex = STAGES.findIndex(s => s.id === stage);

  return (
    <AnimatePresence>
      {stage && (
        <motion.div
          className="ingest-overlay"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <div className="ingest-panel">
            <p className="ingest-filename">{fileName}</p>

            {/* Stage trail */}
            <div className="ingest-stages">
              {STAGES.map((s, i) => (
                <div
                  key={s.id}
                  className={`ingest-stage
                    ${i < stageIndex ? 'ingest-stage--done' : ''}
                    ${i === stageIndex ? 'ingest-stage--active' : ''}
                  `}
                >
                  <span className="ingest-stage__dot" />
                  <span className="ingest-stage__label">{s.label}</span>
                  {i === stageIndex && typeof progress === 'number' && (
                    <span className="ingest-stage__pct">{Math.round(progress)}%</span>
                  )}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {typeof progress === 'number' && (
              <div className="ingest-bar">
                <motion.div
                  className="ingest-bar__fill"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'linear', duration: 0.3 }}
                />
              </div>
            )}

            {error && <p className="ingest-error">{error}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 4.4 Empty States

Every list / smart view needs a real empty state — not a blank white rectangle.

```jsx
// src/components/EmptyState.jsx
const EMPTY_CONFIGS = {
  vault: {
    icon: '🗄',
    title: 'Your vault is empty',
    body: 'Add PDFs, images, voice memos, or notes. Everything stays on your device.',
    cta: 'Add your first file',
    action: 'ingest',
  },
  search: {
    icon: '🔍',
    title: 'Nothing found',
    body: 'Try different keywords, or check the category filters.',
    cta: null,
  },
  category: {
    icon: '🏷',
    title: 'No documents in this category',
    body: 'Tag documents to organise them here.',
    cta: null,
  },
  voice: {
    icon: '🎙',
    title: 'No voice memos yet',
    body: 'Record or import audio files — Silo transcribes them locally.',
    cta: 'Add audio',
    action: 'ingest-audio',
  },
};

export function EmptyState({ variant = 'vault', onAction }) {
  const cfg = EMPTY_CONFIGS[variant];
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="empty-state__icon">{cfg.icon}</span>
      <h3 className="empty-state__title">{cfg.title}</h3>
      <p className="empty-state__body">{cfg.body}</p>
      {cfg.cta && (
        <button className="btn btn--accent" onClick={() => onAction?.(cfg.action)}>
          {cfg.cta}
        </button>
      )}
    </motion.div>
  );
}
```

### 4.5 Passphrase Unlock Screen

```jsx
// src/components/UnlockScreen.jsx
export function UnlockScreen({ onUnlock, onSkip, error }) {
  const [passphrase, setPassphrase] = useState('');
  const [show, setShow] = useState(false);

  return (
    <motion.div
      className="unlock-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="unlock-card">
        <div className="unlock-icon">🔐</div>
        <h1 className="unlock-title">Unlock Vault</h1>
        <p className="unlock-body">
          Your vault index is protected. Enter your passphrase to decrypt and search.
        </p>

        <div className="unlock-field">
          <input
            type={show ? 'text' : 'password'}
            placeholder="Passphrase"
            value={passphrase}
            onChange={e => setPassphrase(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onUnlock(passphrase)}
            autoFocus
            autoComplete="current-password"
          />
          <button
            className="unlock-toggle"
            onClick={() => setShow(s => !s)}
            aria-label={show ? 'Hide passphrase' : 'Show passphrase'}
          >
            {show ? '🙈' : '👁'}
          </button>
        </div>

        {error && (
          <motion.p
            className="unlock-error"
            initial={{ x: -4 }}
            animate={{ x: [0, -6, 6, -4, 4, 0] }}
            transition={{ duration: 0.4 }}
          >
            {error}
          </motion.p>
        )}

        <div className="unlock-actions">
          <button className="btn btn--accent" onClick={() => onUnlock(passphrase)}>
            Unlock
          </button>
          <button className="btn btn--ghost" onClick={onSkip}>
            Browse without search
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

### 4.6 Bottom Navigation (Mobile)

```jsx
// src/components/BottomNav.jsx
const TABS = [
  { id: 'vault',    icon: '🗄', label: 'Vault'    },
  { id: 'search',   icon: '🔍', label: 'Search'   },
  { id: 'add',      icon: '+',  label: 'Add',   isAction: true },
  { id: 'browse',   icon: '🗂', label: 'Browse'   },
  { id: 'settings', icon: '⚙', label: 'Settings' },
];

export function BottomNav({ activeTab, onTabChange, onAdd }) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`bottom-nav__item ${tab.isAction ? 'bottom-nav__item--action' : ''} ${activeTab === tab.id ? 'bottom-nav__item--active' : ''}`}
          onClick={() => tab.isAction ? onAdd() : onTabChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          aria-label={tab.label}
        >
          <span className="bottom-nav__icon">{tab.icon}</span>
          {!tab.isAction && <span className="bottom-nav__label">{tab.label}</span>}
        </button>
      ))}
    </nav>
  );
}
```

```css
.bottom-nav {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: var(--space-2) var(--safe-left);
  padding-bottom: calc(var(--space-2) + var(--safe-bottom));  /* home bar */
  position: fixed;
  bottom: 0;
  left: 0; right: 0;
  z-index: 100;
  /* iOS translucent blur effect */
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  background: color-mix(in srgb, var(--color-surface) 85%, transparent);
}
.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-1) 0;
  color: var(--color-text-muted);
  transition: color 0.15s;
  min-width: 44px; min-height: 44px;  /* accessibility tap target */
}
.bottom-nav__item--active { color: var(--color-accent); }
.bottom-nav__item--action {
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-full);
  width: 52px; height: 52px;
  font-size: 24px;
  margin-top: -12px;
  box-shadow: 0 4px 16px var(--color-accent-dim);
}
.bottom-nav__icon  { font-size: 20px; }
.bottom-nav__label { font-size: var(--text-xs); font-family: var(--font-body); }

/* HIDE bottom nav on desktop */
@media (min-width: 900px) { .bottom-nav { display: none; } }
```

### 4.7 Sidebar (Desktop)

```css
.sidebar {
  display: none;   /* hidden on mobile */
  flex-direction: column;
  height: 100%;
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: var(--space-4) 0;
  gap: 0;
  background: var(--color-surface);
}

@media (min-width: 900px) { .sidebar { display: flex; } }

.sidebar__logo {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--color-text-primary);
  padding: 0 var(--space-4) var(--space-6);
  letter-spacing: var(--tracking-tight);
}
.sidebar__logo span { color: var(--color-accent); }

.sidebar__section-label {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: var(--tracking-widest);
  color: var(--color-text-muted);
  padding: var(--space-4) var(--space-4) var(--space-1);
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 0;
  transition: background 0.1s, color 0.1s;
  position: relative;
}
.sidebar__item:hover       { background: var(--color-surface-2); color: var(--color-text-primary); }
.sidebar__item--active {
  color: var(--color-accent);
  background: var(--color-accent-dim);
}
.sidebar__item--active::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px;
  background: var(--color-accent);
  border-radius: 0 2px 2px 0;
}
```

### 4.8 Document Preview Panel (Desktop)

```jsx
// src/components/PreviewPanel.jsx
export function PreviewPanel({ doc, onClose }) {
  if (!doc) return <PreviewPanelEmpty />;

  return (
    <motion.aside
      className="preview-panel"
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={EASE_OUT}
    >
      <div className="preview-panel__header">
        <div>
          <span className="preview-panel__type">{TYPE_LABELS[doc.type]}</span>
          <h2 className="preview-panel__name">{doc.name}</h2>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close preview">✕</button>
      </div>

      <div className="preview-panel__meta">
        <MetaRow icon="📅" label="Added"  value={formatDate(doc.createdAt)} />
        <MetaRow icon="📦" label="Size"   value={formatBytes(doc.size)} />
        <MetaRow icon="🏷" label="Tags"   value={<CatPills cats={doc.categories} />} />
        <MetaRow icon="💾" label="Storage" value={doc.isLinked ? 'Linked from disk' : 'In vault (OPFS)'} />
      </div>

      <div className="preview-panel__content">
        {doc.type === 'pdf'   && <PDFPreview   doc={doc} />}
        {doc.type === 'image' && <ImagePreview doc={doc} />}
        {doc.type === 'audio' && <AudioPreview doc={doc} />}
        {doc.type === 'note'  && <NotePreview  doc={doc} />}
      </div>

      <div className="preview-panel__actions">
        <ActionButton icon="⬇" label="Export" onClick={() => exportDoc(doc)} />
        <ActionButton icon="✏" label="Rename" onClick={() => renameDoc(doc)} />
        <ActionButton icon="🗑" label="Delete" variant="danger" onClick={() => deleteDoc(doc)} />
      </div>
    </motion.aside>
  );
}
```

### 4.9 Add / Ingest Sheet (Mobile) & Modal (Desktop)

On mobile: slide-up sheet (bottom sheet) with drag handle.
On desktop: centered modal with backdrop blur.

```jsx
// src/components/IngestDialog.jsx
export function IngestDialog({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="sheet"   /* becomes modal on desktop via CSS */
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={SPRING_GENTLE}
            drag="y"
            dragConstraints={{ top: 0 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }}
          >
            <div className="sheet__handle" />
            <h2 className="sheet__title">Add to Vault</h2>

            <div className="ingest-options">
              <IngestOption icon="📄" label="PDF"         sublabel="Text extracted locally"  accept=".pdf"                   />
              <IngestOption icon="🖼" label="Image"       sublabel="OCR runs on device"       accept="image/*"                />
              <IngestOption icon="🎙" label="Voice memo"  sublabel="Transcribed with Whisper"  accept="audio/*"                />
              <IngestOption icon="📝" label="Text note"   sublabel="Type or paste"             action="note"                   />
              <IngestOption icon="🔗" label="Link file"   sublabel="Chromium only"             action="link"                   />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

```css
/* Mobile: bottom sheet */
.sheet {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--color-surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--space-2) var(--space-5) calc(var(--space-6) + var(--safe-bottom));
  z-index: 200;
  max-height: 85dvh;
  overflow-y: auto;
}
.sheet__handle {
  width: 40px; height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  margin: 0 auto var(--space-4);
}

/* Desktop: modal */
@media (min-width: 900px) {
  .sheet {
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    bottom: auto; right: auto;
    width: 420px;
    border-radius: var(--radius-xl);
    max-height: 80vh;
  }
}
```

---

## 5. Critical UX Bugs to Fix

### 5.1 OPFS Availability Check — Graceful Degradation

```js
// src/vault/storage.js
export async function detectStorageMode() {
  try {
    const root = await navigator.storage?.getDirectory?.();
    if (root) return 'opfs';
  } catch {}
  try {
    localStorage.setItem('__silo_test', '1');
    localStorage.removeItem('__silo_test');
    return 'localstorage-fallback';
  } catch {}
  return 'memory-only';
}
```

Show a persistent banner when not in OPFS mode:
```jsx
{storageMode !== 'opfs' && (
  <Banner variant="warning">
    ⚠ Running in demo mode — data won't persist between sessions.
    {storageMode === 'localstorage-fallback' && ' Use Chrome/Edge for full OPFS storage.'}
  </Banner>
)}
```

### 5.2 Embedding / Model Loading — Don't Block UI

```js
// src/vault/embeddings.js
let modelLoadPromise = null;

export function warmUpEmbeddingModel() {
  // Fire in background, don't await in app startup
  modelLoadPromise = loadModel().catch(() => null);
}

export async function getEmbedding(text) {
  if (!modelLoadPromise) warmUpEmbeddingModel();
  const model = await modelLoadPromise;
  if (!model) return null;  // graceful: search falls back to full-text only
  return model.embed(text);
}
```

Show model status in search:
```jsx
<SearchBar
  onSearch={handleSearch}
  isSearching={isSearching}
  semanticReady={embeddingModelReady}
  semanticLabel={embeddingModelReady ? 'Semantic ✓' : 'Loading AI…'}
/>
```

### 5.3 Share Target Queue

When user shares content to Silo from OS share sheet, it lands in a queue. This queue **must** have its own UI:

```jsx
// src/components/ShareQueue.jsx
export function ShareQueue({ items, onProcess, onDismiss }) {
  if (!items?.length) return null;

  return (
    <motion.div className="share-queue" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <div className="share-queue__header">
        <span>📥 {items.length} item{items.length > 1 ? 's' : ''} shared to Silo</span>
        <button onClick={onDismiss}>Dismiss</button>
      </div>
      {items.map(item => (
        <div key={item.id} className="share-queue__item">
          <span>{item.name || item.url || '(text)'}</span>
          <button className="btn btn--accent btn--sm" onClick={() => onProcess(item)}>
            Add to vault
          </button>
        </div>
      ))}
    </motion.div>
  );
}
```

### 5.4 ZIP Backup — Confirm Before Destructive Restore

```jsx
function handleRestore(file) {
  const confirmed = await showConfirmDialog({
    title: 'Restore from backup?',
    body: 'This will REPLACE your current vault. This cannot be undone. Make sure you have a current backup.',
    confirmLabel: 'Yes, replace vault',
    confirmVariant: 'danger',
  });
  if (!confirmed) return;
  // proceed
}
```

### 5.5 File System Access API — Feature Detection + Fallback

```js
export function canLinkFromDisk() {
  return 'showOpenFilePicker' in window;
}

// In UI:
{!canLinkFromDisk() && (
  <Tooltip content="Requires Chrome, Edge, or Brave desktop">
    <span className="feature-unavailable">Link from disk (unavailable)</span>
  </Tooltip>
)}
```

### 5.6 Scroll Performance — Virtualise Long Lists

For vaults with hundreds of documents, use a windowed list:

```bash
npm install @tanstack/react-virtual
```

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function DocumentList({ docs }) {
  const parentRef = useRef();
  const virtualizer = useVirtualizer({
    count: docs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88, // card height in px
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="doc-list">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(vItem => (
          <div
            key={vItem.key}
            style={{ position: 'absolute', top: vItem.start, width: '100%' }}
          >
            <DocumentCard doc={docs[vItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 6. Accessibility (a11y)

| Item | Requirement |
|---|---|
| Focus ring | `outline: 2px solid var(--color-accent); outline-offset: 2px;` on `:focus-visible` everywhere |
| Keyboard nav | Tab order: sidebar → search → filter chips → document list → preview |
| ARIA | `role="listbox"` on doc list, `role="option"` on cards, `aria-selected`, `aria-label` on all icon buttons |
| Reduced motion | Wrap all Framer Motion with `useReducedMotion()` guard |
| Touch targets | All interactive elements ≥ 44×44px |
| Colour contrast | Text/bg ratios: primary ≥ 7:1, secondary ≥ 4.5:1 |
| Screen reader | Test with VoiceOver (iOS) and TalkBack (Android) |

```css
/* Global focus ring */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
/* Remove focus ring for mouse users */
:focus:not(:focus-visible) { outline: none; }
```

---

## 7. Pixel-Perfect Polish Checklist

### Typography
- [ ] No orphaned words on single-line headings — use `text-wrap: balance`
- [ ] Snippets use `font-feature-settings: "liga" 1, "kern" 1`
- [ ] File names: `font-family: var(--font-mono)` — always monospace
- [ ] Dates: use `Intl.RelativeTimeFormat` for friendly output ("2 hours ago", "yesterday")

### Spacing
- [ ] 8px base grid — all paddings/margins are multiples of 4px
- [ ] Card list: `gap: var(--space-2)` between cards (8px)
- [ ] Section separators: `var(--space-6)` (24px)
- [ ] Safe-area insets applied to: top bar, bottom nav, sidebar

### Interactions
- [ ] All buttons: `cursor: pointer` + `user-select: none`
- [ ] Drag-and-drop file drop zone: full-screen overlay on `dragover`, border pulse animation
- [ ] Long-press on mobile card: trigger context menu (rename/delete/share)
- [ ] Swipe left on mobile card: reveal delete action
- [ ] Pull-to-refresh: trigger vault rescan (if File System Access API active)

### Loading States
- [ ] App startup: skeleton cards (animated shimmer) — not a spinner
- [ ] OCR: indeterminate progress bar + stage label
- [ ] Search: spinner inside search bar + result count badge
- [ ] Model loading: subtle "AI loading…" pill in corner — non-blocking

### Error States
- [ ] OPFS write failure → toast + retry button
- [ ] Passphrase wrong → shake animation + error message (not an alert())
- [ ] File too large → friendly message with size limit
- [ ] Audio transcription failure → fallback to manual text entry prompt

---

## 8. Performance Targets

| Metric | Target |
|---|---|
| First Contentful Paint (PWA installed) | < 1.0s |
| Time to Interactive (cold, OPFS data) | < 2.5s |
| Full-text search response | < 100ms |
| Semantic search (embeddings warm) | < 500ms |
| Card render (100 items) | < 16ms frame |
| Service worker install | < 3s on 4G |

### Bundle Optimisation
```js
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'framer':       ['framer-motion'],
          'orama':        ['@orama/orama'],
          'pdf':          ['pdfjs-dist'],
          'ocr':          ['tesseract.js'],
          // @xenova/transformers: lazy-load only when needed
        }
      }
    }
  }
};
```

Lazy-load heavy modules:
```js
// Only load Transformers.js when semantic search is triggered
const { pipeline } = await import('@xenova/transformers');
```

---

## 9. Mobile PWA — Platform-Specific Issues

### iOS Safari
- `dvh` units: `height: 100dvh` — supported iOS 15.4+
- Bottom navigation: always use `padding-bottom: calc(Xpx + env(safe-area-inset-bottom))` 
- `backdrop-filter`: supported, use it for frosted glass nav
- File input: `<input type="file" accept="...">` — the only reliable file pick method (no File System Access API)
- No `beforeinstallprompt` — cannot show custom install prompts; link to "Add to Home Screen" instructions
- Audio recording: `MediaRecorder` supported — works for voice memos

### Android Chrome
- Full OPFS support (fastest experience)
- `beforeinstallprompt` fires — show custom install banner after 2 meaningful interactions
- `share_target` works — test with native Android share sheet
- File System Access API available — "Link from disk" works
- TWA: see `public/native/TWA.md` for packaging

### Desktop Chrome/Edge
- Window Controls Overlay: `display_override: ['window-controls-overlay']` gives a custom title bar area
- Edge Side Panel: `"edge_side_panel": { "preferred_width": 400 }` — Silo can run as sidebar

---

## 10. Install Prompt Flow

```jsx
// src/hooks/usePWAInstall.js
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner]         = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show after user has performed 2+ meaningful actions
      const interactions = parseInt(sessionStorage.getItem('silo_interactions') || '0');
      if (interactions >= 2) setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setDeferredPrompt(null);
  };

  return { showBanner, install, dismiss: () => setShowBanner(false) };
}
```

```jsx
// Install Banner component
{showBanner && (
  <motion.div className="install-banner" initial={{ y: -48 }} animate={{ y: 0 }}>
    <span>Install Silo for offline access</span>
    <button className="btn btn--accent btn--sm" onClick={install}>Install</button>
    <button className="btn btn--ghost btn--sm" onClick={dismiss}>Not now</button>
  </motion.div>
)}
```

---

## 11. Settings Panel

Settings need to actually function — not just look good.

```
Settings
├── Vault
│   ├── Storage info  (used / available — navigator.storage.estimate())
│   ├── Change passphrase
│   ├── Remove passphrase
│   ├── Integrity check  → runs vault.repair()
│   └── Reset vault  (DANGER — delete all OPFS data)
│
├── Search
│   ├── Semantic search toggle  (enables/disables @xenova loading)
│   ├── Re-index vault
│   └── Clear search index
│
├── Backup
│   ├── Export vault (ZIP)
│   └── Import from ZIP
│
├── Appearance
│   ├── Dark / Light / System theme
│   └── Compact / Comfortable density
│
└── About
    ├── Version
    ├── OPFS / Storage mode indicator
    ├── Browser compatibility table
    └── Privacy policy (local — no telemetry)
```

---

## 12. Implementation Order (Prioritised)

Work in this sequence — ship value at each step:

### Phase 1 — Foundation (Week 1)
1. Design tokens CSS file (`src/design/tokens.css`)
2. Typography import in `index.html`
3. Motion presets (`src/design/motion.js`)
4. Fix `100dvh` → `100dvh` / `dvh` throughout
5. Safe-area insets applied to layout shell
6. PWA manifest complete overhaul
7. iOS meta tags in `index.html`

### Phase 2 — Core Components (Week 1–2)
8. SearchBar with debounce, keyboard shortcut, loading state
9. DocumentCard pixel-perfect redesign
10. Empty states for all views
11. IngestProgress with stages + progress bar
12. Bottom navigation (mobile)
13. Sidebar (desktop)

### Phase 3 — UX Bugs (Week 2)
14. OPFS availability detection + banner
15. Embedding model warm-up in background
16. Share target queue UI
17. Destructive action confirmations (restore, delete, reset)
18. File System Access API feature detection

### Phase 4 — Polish (Week 3)
19. Virtual list for performance
20. Skeleton loading states
21. Install prompt banner
22. UnlockScreen redesign
23. Settings panel — all items functional
24. Swipe-to-delete on mobile cards
25. Drag-and-drop file drop overlay

### Phase 5 — QA (Week 3–4)
26. Test on Chrome Android (OPFS, share target, install)
27. Test on Safari iOS (fallback storage, no File System Access)
28. Test on Edge desktop (Window Controls Overlay)
29. Lighthouse PWA audit — target 100 score
30. Accessibility audit (axe-core, VoiceOver, TalkBack)

---

## 13. File/Folder Changes Summary

```
src/
├── design/
│   ├── tokens.css          ← NEW: all CSS custom properties
│   └── motion.js           ← NEW: Framer Motion presets
│
├── components/
│   ├── SearchBar.jsx        ← REWRITE: debounce, ⌘K, spinner
│   ├── DocumentCard.jsx     ← REWRITE: type bar, snippets, badges
│   ├── DocumentList.jsx     ← NEW: virtualised list
│   ├── EmptyState.jsx       ← NEW: per-view empty states
│   ├── IngestDialog.jsx     ← REWRITE: bottom sheet + modal
│   ├── IngestProgress.jsx   ← NEW: staged progress
│   ├── PreviewPanel.jsx     ← REWRITE: meta + actions
│   ├── UnlockScreen.jsx     ← REWRITE: passphrase UX
│   ├── BottomNav.jsx        ← NEW: mobile navigation
│   ├── Sidebar.jsx          ← NEW: desktop navigation
│   ├── ShareQueue.jsx       ← NEW: share-target queue
│   ├── InstallBanner.jsx    ← NEW: PWA install prompt
│   ├── ConfirmDialog.jsx    ← NEW: destructive action guard
│   ├── Banner.jsx           ← NEW: storage mode warning
│   └── Settings.jsx         ← REWRITE: fully functional
│
├── hooks/
│   ├── usePWAInstall.js     ← NEW
│   ├── useStorageMode.js    ← NEW
│   └── useShareQueue.js     ← NEW
│
├── vault/
│   └── storage.js           ← PATCH: detectStorageMode()
│
└── index.css                ← PATCH: import tokens, global focus ring, dvh

public/
├── manifest.json            ← REWRITE: complete
├── sw.js                    ← PATCH: WASM cache, share target
├── icons/
│   ├── icon-192.png         ← NEW (generate with Maskable.app)
│   ├── icon-192-mask.png    ← NEW (maskable)
│   ├── icon-512.png         ← NEW
│   ├── icon-512-mask.png    ← NEW
│   └── icon.svg             ← NEW
└── screenshots/
    ├── desktop.png          ← NEW (for install prompt)
    └── mobile.png           ← NEW

index.html                   ← PATCH: Apple meta, fonts, viewport-fit=cover

vite.config.js               ← PATCH: vite-plugin-pwa, manualChunks
package.json                 ← ADD: vite-plugin-pwa, @tanstack/react-virtual
```

---

## 14. Quick Commands

```bash
# Install new deps
npm install vite-plugin-pwa @tanstack/react-virtual

# Dev with proper HTTPS (needed for OPFS + SW on localhost)
npm run dev  # Vite already serves on localhost — OPFS works on localhost

# Verify manifest + SW
npx lighthouse http://localhost:5173/Silo/ --preset=desktop
npx lighthouse http://localhost:5173/Silo/ --emulated-form-factor=mobile

# Build + preview as GitHub Pages would serve it
VITE_BASE_URL=/Silo/ npm run build
mkdir -p _pages/Silo && cp -r dist/* _pages/Silo/
npx serve _pages

# Lint
npm run lint
```

---

> **North Star:** Silo should feel like a native app — instant, offline, yours. Every interaction should have feedback. Every loading operation should have a progress indicator. Every destructive action should have a confirmation. Every unsupported feature should have a graceful fallback. The UI should feel premium and intentional — not like a demo project.
