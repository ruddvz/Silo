import { motion } from "framer-motion";

/**
 * @param {{
 *   issues: Array<{ id?: string, code: string, severity?: string, detail: string }>,
 *   summary?: { critical: number, warning: number, info: number, total: number },
 *   onRepair: () => void,
 *   onExportBackup: () => void,
 *   onDismiss?: () => void,
 *   busy?: boolean,
 * }} props
 */
export function VaultRecoveryScreen({
  issues,
  summary,
  onRepair,
  onExportBackup,
  onDismiss,
  busy = false,
}) {
  const critical = issues.filter((i) => i.severity === "critical" || i.code === "missing_blob" || i.code === "missing_manifest");
  const warnings = issues.filter((i) => !critical.includes(i));

  return (
    <div className="vault-recovery" role="alertdialog" aria-labelledby="vault-recovery-title" aria-describedby="vault-recovery-desc">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="vault-recovery__card"
      >
        <div className="vault-recovery__icon" aria-hidden="true">⚠</div>
        <h2 id="vault-recovery-title" className="vault-recovery__title">Vault needs attention</h2>
        <p id="vault-recovery-desc" className="vault-recovery__lead">
          Some items may be damaged or incomplete. Your originals are never deleted automatically — export a backup before repair.
        </p>

        {summary && (
          <div className="vault-recovery__stats">
            {summary.critical > 0 && <span className="vault-recovery__pill vault-recovery__pill--critical">{summary.critical} critical</span>}
            {summary.warning > 0 && <span className="vault-recovery__pill vault-recovery__pill--warning">{summary.warning} warning</span>}
            {summary.info > 0 && <span className="vault-recovery__pill">{summary.info} info</span>}
          </div>
        )}

        <ul className="vault-recovery__list">
          {[...critical, ...warnings].slice(0, 8).map((issue, idx) => (
            <li key={`${issue.code}-${issue.id || idx}`} className="vault-recovery__item">
              <span className="vault-recovery__code">{issue.code}</span>
              <span>{issue.detail}</span>
            </li>
          ))}
          {issues.length > 8 && (
            <li className="vault-recovery__item vault-recovery__item--muted">
              +{issues.length - 8} more issue(s)
            </li>
          )}
        </ul>

        <div className="vault-recovery__actions">
          <button type="button" className="vault-recovery__btn vault-recovery__btn--primary" onClick={onExportBackup} disabled={busy}>
            Export backup first
          </button>
          <button type="button" className="vault-recovery__btn" onClick={onRepair} disabled={busy}>
            {busy ? "Repairing…" : "Repair vault"}
          </button>
          {onDismiss && critical.length === 0 && (
            <button type="button" className="vault-recovery__btn vault-recovery__btn--ghost" onClick={onDismiss}>
              Continue anyway
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
