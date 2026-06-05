import { formatBytes } from "../lib/vaultFormat.js";

/**
 * @param {{
 *   itemCount: number,
 *   vaultSizeBytes: number,
 *   lastBackupHint?: string,
 *   busy?: boolean,
 *   onExport: () => void,
 *   onImport: () => void,
 *   onCheckHealth: () => void,
 * }} props
 */
export function BackupRestorePanel({
  itemCount,
  vaultSizeBytes,
  lastBackupHint,
  busy,
  onExport,
  onImport,
  onCheckHealth,
}) {
  return (
    <section className="backup-panel" aria-labelledby="backup-panel-title">
      <h3 id="backup-panel-title" className="backup-panel__title">Backup &amp; restore</h3>
      <p className="backup-panel__lead">
        Export a ZIP of everything on this device. Store it somewhere safe — browser storage can be cleared.
      </p>
      <dl className="backup-panel__stats">
        <div>
          <dt>Items</dt>
          <dd>{itemCount}</dd>
        </div>
        <div>
          <dt>Vault size</dt>
          <dd>{formatBytes(vaultSizeBytes || 0)}</dd>
        </div>
        {lastBackupHint && (
          <div>
            <dt>Last export</dt>
            <dd>{lastBackupHint}</dd>
          </div>
        )}
      </dl>
      <div className="backup-panel__actions">
        <button type="button" className="btn btn--accent" disabled={busy || itemCount === 0} onClick={onExport}>
          Export backup (.zip)
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onImport}>
          Import / merge backup
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onCheckHealth}>
          Check vault health
        </button>
      </div>
      <p className="backup-panel__note">
        Import validates the ZIP before applying. A snapshot of your current manifest is saved before merge.
      </p>
    </section>
  );
}
