import { motion, AnimatePresence } from "framer-motion";
import { SPRING_GENTLE, useReducedMotion } from "../design/motion.js";

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
  const isDanger = confirmVariant === "danger";

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
            className={`confirm-dialog ${isDanger ? "confirm-dialog--danger" : ""}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-body"
            initial={reduced ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? undefined : { y: 24, opacity: 0 }}
            transition={SPRING_GENTLE}
          >
            <h2 id="confirm-title" className="confirm-dialog__title">
              {title}
            </h2>
            <p id="confirm-body" className="confirm-dialog__body">
              {body}
            </p>
            <div className={`confirm-dialog__actions ${isDanger ? "confirm-dialog__actions--stacked" : ""}`}>
              {isDanger ? (
                <>
                  <button
                    type="button"
                    className="btn btn--danger btn--full"
                    onClick={onConfirm}
                  >
                    {confirmLabel}
                  </button>
                  <button type="button" className="btn btn--ghost btn--full" onClick={onCancel}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn--ghost" onClick={onCancel}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn--accent" onClick={onConfirm}>
                    {confirmLabel}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
