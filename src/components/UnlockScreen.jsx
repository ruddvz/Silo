import { useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "../design/motion.js";

/**
 * @param {{
 *   onUnlock: (passphrase: string) => void,
 *   onSkip?: () => void,
 *   error?: string | null,
 * }} props
 */
export function UnlockScreen({ onUnlock, onSkip, error }) {
  const [passphrase, setPassphrase] = useState("");
  const [show, setShow] = useState(false);
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="unlock-screen"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="unlock-card">
        <div className="unlock-icon" aria-hidden>
          🔐
        </div>
        <h1 className="unlock-title">Unlock vault</h1>
        <p className="unlock-body">
          Your vault index can be passphrase-protected. Enter your passphrase so Silo can decrypt text for search and
          previews.
        </p>

        <div className="unlock-field">
          <input
            type={show ? "text" : "password"}
            placeholder="Passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onUnlock(passphrase)}
            autoFocus
            autoComplete="current-password"
          />
          <button
            type="button"
            className="unlock-toggle"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide passphrase" : "Show passphrase"}
          >
            {show ? "🙈" : "👁"}
          </button>
        </div>

        {error && (
          <motion.p
            className="unlock-error"
            initial={reduced ? false : { x: -4 }}
            animate={reduced ? {} : { x: [0, -6, 6, -4, 4, 0] }}
            transition={{ duration: 0.4 }}
          >
            {error}
          </motion.p>
        )}

        <div className="unlock-actions">
          <button type="button" className="btn btn--accent" onClick={() => onUnlock(passphrase)}>
            Unlock
          </button>
          {onSkip && (
            <button type="button" className="btn btn--ghost" onClick={onSkip}>
              Browse without search
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
