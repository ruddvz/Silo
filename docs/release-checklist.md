# Silo Release Checklist

## Build quality

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`

## PWA

- [ ] Manifest `id`, `start_url`, `scope` correct for deployment base path
- [ ] Icons and Apple touch icons present
- [ ] Service worker update banner works
- [ ] Offline shell loads (airplane mode)

## Data safety

- [ ] Fresh profile starts empty (no demo unless `VITE_ENABLE_DEMO_DATA=true`)
- [ ] Import 10 files → reload → all visible
- [ ] Export backup → import merge roundtrip
- [ ] Invalid ZIP rejected with clear error
- [ ] Pre-import snapshot created

## iOS manual (`docs/ios-pwa-test-plan.md`)

- [ ] Add to Home Screen
- [ ] Standalone launch, safe areas
- [ ] Import photo/PDF/note
- [ ] Search works

## Shared lists (if Supabase configured)

- [ ] User A cannot read User B lists
- [ ] Vault files not uploaded to Supabase

## Docs

- [ ] README accurate
- [ ] `docs/privacy-security.md` reviewed
- [ ] `docs/agent-progress.md` updated
