# Silo — Data Recovery

## Export backup (ZIP)

1. Open **Settings** → **Backup & restore**
2. Tap **Export backup (.zip)**
3. Store the file in iCloud Drive, Files, or another safe location

The ZIP includes manifest, blobs, extracted text, and embedding sidecars.

## Restore / merge

1. **Settings** → **Import / merge backup**
2. Select a Silo export `.zip`
3. Confirm merge — existing entries with the same ID are overwritten by the backup

Before merge, Silo saves a manifest snapshot under `vault/snapshots/` for rollback reference.

## Damaged vault

1. **Settings** → **Check vault health**
2. If critical issues appear, use **Export backup first** on the recovery screen
3. Run **Repair vault** to rebuild text/embeddings from blobs

## Forgot passphrase

Encrypted text cannot be decrypted without the passphrase. Original blobs may still be readable depending on encryption scope. Restore from an backup exported before enabling the passphrase if available.

## OPFS unavailable

If the browser does not support OPFS, the vault may not persist across sessions. Export backups often and use a supported browser (Safari/Chrome on HTTPS).
