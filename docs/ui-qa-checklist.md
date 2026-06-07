# Silo UI QA Checklist

## iOS PWA

- [ ] Add to Home Screen
- [ ] Status bar / safe area correct
- [ ] Bottom nav clears Home indicator
- [ ] Keyboard does not trap search/capture/note UI
- [ ] Install banner hides in standalone mode

## Mobile widths

- [ ] 375px — no horizontal scroll, labels fit
- [ ] 390px — comfortable spacing
- [ ] 430px — uses extra width

## Flows

- [ ] Home → Capture in one tap
- [ ] Home → Search in one tap
- [ ] Search shows match reasons
- [ ] Vault scrolls smoothly with 100+ items
- [ ] Backup export/import from Settings
- [ ] Onboarding skippable
- [ ] Unlock screen clear copy

## Accessibility

- [ ] Tab targets ≥ 44px
- [ ] Icon buttons have aria-labels
- [ ] Focus visible on keyboard nav
- [ ] Reduced motion respected

## Automated (CI)

- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [x] Render check (`scripts/check-render.mjs`)
- [x] Visual QA at 8 viewports (`scripts/visual-qa.mjs`, Playwright)
- [x] Axe scan (quality workflow)
