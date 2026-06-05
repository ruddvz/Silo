# iOS PWA Manual Test Plan — Silo

Use this checklist before each release on real devices.

## Devices

- iPhone SE (375px) — Safari tab + Home Screen PWA
- Standard iPhone (390–393px) — Safari tab + Home Screen PWA
- iPhone Pro Max (430px) — Home Screen PWA
- iPad Safari (optional)
- Desktop Chrome/Safari (regression)

## Install and launch

- [ ] Open `https://<host>/Silo/` in Safari (or production URL)
- [ ] Share → Add to Home Screen
- [ ] Icon appears with correct name "Silo"
- [ ] Launch from icon — no Safari address bar
- [ ] Splash/background color matches app theme (#0f0f10)
- [ ] App loads without blank white screen

## Safe area and shell

- [ ] Header clears status bar / Dynamic Island
- [ ] Bottom navigation clears home indicator
- [ ] Content not clipped under fixed UI
- [ ] Landscape rotation acceptable (portrait-primary preferred)

## Core flows (installed PWA)

- [ ] Empty vault shows onboarding on first visit
- [ ] Import PDF — appears in list after reload
- [ ] Import photo (JPEG/HEIC if available)
- [ ] Add text note
- [ ] Search finds imported item
- [ ] Export backup ZIP
- [ ] Settings opens and closes

## Keyboard

- [ ] Search field usable with keyboard open
- [ ] Note modal not trapped under keyboard
- [ ] Bottom nav does not hide critical actions

## Offline and updates

- [ ] Airplane mode → app shell still opens from Home Screen
- [ ] After new deploy, "Reload safely" update banner appears (may require two visits)
- [ ] Reload does not delete vault data

## Share / import (where supported)

- [ ] Share sheet to Silo (Android/Chromium) queues import
- [ ] Manual file picker import works on iOS

## Screenshots

Capture and attach:

1. Home screen icon
2. Standalone launch (top safe area)
3. Bottom nav + home indicator
4. Empty vault / onboarding
5. Vault with items

## Pass criteria

All install/launch/safe-area checks pass. No data loss after update reload. No demo documents in production build unless `VITE_ENABLE_DEMO_DATA=true`.
