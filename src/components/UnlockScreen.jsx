import { useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "../design/motion.js";
import { APP_ICON_SRC } from "../lib/vaultConstants.js";

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
        <img src={APP_ICON_SRC} alt="" width={64} height={64} className="unlock-logo" />
        <h1 className="unlock-title">Locked vault</h1>
        <p className="unlock-body">
          Enter your passphrase to unlock indexed text for search and previews. Original files stay on this device.
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
            {show ? "Hide" : "Show"}
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
            Unlock vault
          </button>
          {onSkip && (
            <button type="button" className="btn btn--ghost" onClick={onSkip}>
              Browse without search
            </button>
          )}
        </div>

        <p className="unlock-recovery">
          Forgot passphrase? You may need to reset protected index data. Originals may still be available depending on your vault settings.
        </p>
      </div>
    </motion.div>
  );
}
