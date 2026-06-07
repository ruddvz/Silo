import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * @param {{
 *   onClose: () => void,
 *   actions: Array<{ id: string, label: string, icon?: import('react').ReactNode, disabled?: boolean, danger?: boolean, keepOpen?: boolean, onSelect?: () => void }>,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function SettingsDrawer({ onClose, actions, children }) {
  const firstRef = useRef(null);
  useEffect(() => {
    firstRef.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="settings-sheet-backdrop"
        aria-label="Close settings"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="settings-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="settings-sheet-grabber" aria-hidden />
        <div className="settings-sheet-title">Settings</div>
        {children}
        <div className="settings-sheet-actions">
          {actions.map((opt, i) => (
            <button
              key={opt.id}
              ref={i === 0 ? firstRef : null}
              type="button"
              disabled={opt.disabled}
              className={`settings-row ${opt.danger ? "settings-row--danger" : ""}`}
              onClick={() => {
                opt.onSelect?.();
                if (!opt.keepOpen) onClose();
              }}
            >
              <span className="settings-row__label">{opt.label}</span>
              {opt.icon && <span className="settings-row__icon" aria-hidden>{opt.icon}</span>}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
}
