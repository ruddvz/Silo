# Silo — Privacy & Security

## Local-first model

Silo stores your vault on this device by default. Original files, extracted text, and search indexes live in the browser (OPFS when supported). Nothing is uploaded to Silo-operated servers.

## What is stored where

| Data | Location |
|------|----------|
| File blobs | OPFS `vault/files/` |
| Extracted text | OPFS `vault/text/*.txt` |
| Semantic embeddings | OPFS `vault/text/*.emb.json` (optional) |
| Manifest | OPFS `vault/manifest.json` |
| Passphrase | Session only (unless you choose to persist — not recommended) |
| Shared lists | Supabase (optional, separate from vault) |

## Passphrase

When enabled, the passphrase encrypts **indexed/extracted text** at rest. Original file blobs are **not** fully encrypted in the current release. If you forget the passphrase, encrypted text cannot be recovered except from an unencrypted backup.

## Shared lists

Silo Lists is optional. It requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Only shared checklist data uses Supabase — your private vault files are never uploaded as part of Lists.

## Backups

Export ZIP backups regularly. Browser storage can be cleared by the user, browser updates, or low disk space.

## Third-party requests

Semantic search, OCR, and transcription may download open-source models to your browser from public CDNs (e.g. Hugging Face). This traffic goes directly from your device to those hosts.
