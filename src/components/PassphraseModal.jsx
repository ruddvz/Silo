import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * @param {{
 *   mode: "set" | "clear",
 *   busy?: boolean,
 *   onConfirm: (passphrase: string, confirm?: string) => void,
 *   onCancel: () => void,
 * }} props
 */
export function PassphraseModal({ mode, busy, onConfirm, onCancel }) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const title = mode === "set" ? "Set vault passphrase" : "Clear vault passphrase";
  const hint =
    mode === "set"
      ? "Encrypts indexed text at rest. Minimum 8 characters. Leave both fields empty to cancel."
      : "Enter your current passphrase to decrypt vault text.";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-backdrop"
        onClick={onCancel}
      />
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="passphrase-modal-title"
      >
        <div className="modal-panel__eyebrow">{title}</div>
        <p id="passphrase-modal-title" className="modal-panel__hint">
          {hint}
        </p>
        <label className="modal-panel__field">
          <span>{mode === "set" ? "New passphrase" : "Current passphrase"}</span>
          <input
            ref={inputRef}
            type="password"
            autoComplete={mode === "set" ? "new-password" : "current-password"}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            disabled={busy}
          />
        </label>
        {mode === "set" && (
          <label className="modal-panel__field">
            <span>Confirm passphrase</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") onConfirm(passphrase, confirm);
              }}
            />
          </label>
        )}
        <div className="modal-panel__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--accent"
            disabled={busy}
            onClick={() => onConfirm(passphrase, mode === "set" ? confirm : undefined)}
          >
            {busy ? "Working…" : mode === "set" ? "Save passphrase" : "Clear passphrase"}
          </button>
        </div>
      </motion.div>
    </>
  );
}
