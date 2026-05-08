import { motion } from "framer-motion";
import { useReducedMotion } from "../design/motion.js";

/**
 * @param {{
 *   onInstall: () => void,
 *   onDismiss: () => void,
 * }} props
 */
export function InstallBanner({ onInstall, onDismiss }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="install-banner"
      initial={reduced ? false : { y: -48 }}
      animate={{ y: 0 }}
      role="status"
    >
      <span>Install Silo for offline access</span>
      <div className="install-banner__btns">
        <button type="button" className="btn btn--accent btn--sm" onClick={onInstall}>
          Install
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </motion.div>
  );
}
