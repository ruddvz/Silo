import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_GENTLE, useReducedMotion } from "../design/motion.js";
import { IconFile, IconSearch } from "./ui/icons.jsx";

const ACTIONS = [
  { id: "Open", label: "Open", Icon: IconFile },
  { id: "Preview", label: "Preview", Icon: IconSearch },
  { id: "Rename", label: "Rename", Icon: null },
  { id: "Download", label: "Export original", Icon: null },
  { id: "Summarize", label: "Re-index summary", Icon: null },
  { id: "Delete", label: "Delete", Icon: null, danger: true },
];

/**
 * @param {{ doc: object, onAction: (action: string, doc: object) => void, onClose: () => void }} props
 */
export function ContextMenu({ doc, onAction, onClose }) {
  const firstRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    firstRef.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        className="action-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Actions for ${doc.name}`}
        initial={reduced ? false : { y: "100%" }}
        animate={{ y: 0 }}
        exit={reduced ? undefined : { y: "100%" }}
        transition={SPRING_GENTLE}
      >
        <div className="sheet-handle" aria-hidden />
        <div className="action-sheet__header">
          <p className="action-sheet__filename">{doc.name}</p>
          <p className="action-sheet__meta">
            {[doc.tag, doc.date, doc.size].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="action-sheet__list">
          {ACTIONS.map((action, i) => (
            <button
              key={action.id}
              ref={i === 0 ? firstRef : null}
              type="button"
              className={`action-sheet__row ${action.danger ? "action-sheet__row--danger" : ""}`}
              onClick={() => onAction(action.id, doc)}
            >
              {action.Icon && <action.Icon size={18} />}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--ghost action-sheet__cancel" onClick={onClose}>
          Cancel
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
