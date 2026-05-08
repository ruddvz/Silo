import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "../design/motion.js";

/**
 * @param {{
 *   open: boolean,
 *   title: string,
 *   body: string,
 *   confirmLabel?: string,
 *   confirmVariant?: 'danger' | 'accent',
 *   onConfirm: () => void,
 *   onCancel: () => void,
 * }} props
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  confirmVariant = "accent",
  onConfirm,
  onCancel,
}) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="confirm-dialog__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            aria-hidden
          />
          <motion.div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-body"
            initial={reduced ? false : { scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? undefined : { scale: 0.94, opacity: 0 }}
          >
            <h2 id="confirm-title" className="confirm-dialog__title">
              {title}
            </h2>
            <p id="confirm-body" className="confirm-dialog__body">
              {body}
            </p>
            <div className="confirm-dialog__actions">
              <button type="button" className="btn btn--ghost" onClick={onCancel}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${confirmVariant === "danger" ? "btn--danger" : "btn--accent"}`}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
