# Silo device QA checklist

Use this list before a major release. Automated checks in GitHub Actions cover lint, build, Axe, and Lighthouse on a static preview; the items below still need real devices and OS integration.

## Android (Chrome PWA)

- [ ] Install from browser menu; icon and name match manifest.
- [ ] Cold start offline: vault shell loads from cache; errors are understandable if OPFS was cleared.
- [ ] Share → Silo (PDF, image, URL, plain text): payload appears in the share queue and imports cleanly.
- [ ] Background: leave app, share again; queue processes when you return (Background Sync where supported).
- [ ] Add file (PDF, photo, short audio); progress overlay; search finds new content.
- [ ] Semantic search: first query after cold start behaves predictably while the embedding model loads.

## iOS (Safari, Add to Home Screen)

- [ ] Home screen icon (PNG) and title; status bar / safe areas look correct in standalone.
- [ ] OPFS / private mode: confirm whether the vault persists across restarts for your test profile.
- [ ] Share extension (if applicable): same queue behaviour as Android where the OS allows it.
- [ ] Pull-to-refresh on the vault list reloads the manifest view without breaking scroll position badly.

## Desktop (Chrome / Edge / Brave)

- [ ] Install PWA; window controls and minimum size are usable.
- [ ] **Link from disk** (File System Access): grant permission, open linked file, handle revocation or moved files.
- [ ] Drag-and-drop onto the vault area; keyboard focus order through sidebar, list, preview, search, settings.
- [ ] Theme: system / dark / light; density comfortable vs compact.

## Cross-cutting

- [ ] **Lighthouse (optional, local):** after `npm run build && npx vite preview`, run  
  `npx lighthouse "http://localhost:4173/<RepoName>/" --view`  
  Some headless CI environments report NO_FCP for SPAs; Chrome desktop “headful” is more reliable.
- [ ] Passphrase: set, lock, unlock, skip session; encrypted index still searchable after unlock.
- [ ] Reset vault and clear semantic index (settings): confirmations and post-state empty vault.
- [ ] ZIP export and merge backup: round-trip on a small vault.
- [ ] GitHub Pages URL with repo base path (`/RepoName/`): assets, manifest, service worker scope, and share_target action all resolve.

Record browser versions, OS versions, and any failures with steps to reproduce.
