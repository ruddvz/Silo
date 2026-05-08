import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * @param {{
 *   onClose: () => void,
 *   actions: Array<{ id: string, label: string, icon: string, disabled?: boolean, danger?: boolean, keepOpen?: boolean, onSelect?: () => void }>,
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 1100 }}
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
        <div style={{ width: 36, height: 4, background: "var(--color-border)", borderRadius: 2, margin: "0 auto 20px" }} />
        <div className="settings-sheet-title">Settings</div>
        {children}
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
            <span>{opt.label}</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: 16 }}>{opt.icon}</span>
          </button>
        ))}
      </motion.div>
    </>
  );
}
