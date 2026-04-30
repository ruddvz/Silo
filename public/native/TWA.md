# Android Trusted Web Activity (TWA)

A **TWA** is a thin Android app that full-screens your **HTTPS** PWA in Chrome Custom Tabs, with optional **Digital Asset Links** so the Play Store listing can own your domain’s links.

## Outline

1. Host Silo on **HTTPS** with a valid `manifest.webmanifest` and `/sw.js`.
2. Use [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) or Android Studio’s TWA template to generate an APK/AAB that points to your origin.
3. Publish on **Google Play**; configure **assetlinks.json** on your site for verified links.

This repo does not ship a signed AAB; use Bubblewrap’s wizard with your production URL.
