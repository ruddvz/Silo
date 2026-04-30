# Silo native shell (Capacitor)

This PWA runs in the browser. For **share extensions**, **biometrics**, and **richer file APIs**, wrap the same web build in [Capacitor](https://capacitorjs.com/).

## Quick scaffold (run on your machine)

```bash
npm i -g @capacitor/cli
npx cap init Silo com.example.silo --web-dir dist
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

Then open Xcode / Android Studio from `npx cap open ios` / `android`, add a **Share Extension** target (iOS) or **intent filters** (Android), and bridge shared files into the WebView (e.g. postMessage to the app URL with base64 or temp file paths).

Point `server.url` in `capacitor.config` to your hosted Silo origin, or bundle static `dist/` for offline-first.
