import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "../design/motion.js";

/**
 * @param {{ doc: object, onConfirm: (name: string) => void, onCancel: () => void }} props
 */
export function RenameModal({ doc, onConfirm, onCancel }) {
  const extMatch = doc.name.match(/(\.[^.]+)$/);
  let ext = extMatch ? extMatch[1] : "";
  if (doc.kind === "text") ext = ".txt";
  else if (!ext) ext = doc.kind === "pdf" ? ".pdf" : "";
  const baseInitial = ext ? doc.name.slice(0, doc.name.length - ext.length) : doc.name;
  const [value, setValue] = useState(baseInitial);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }
    onConfirm(trimmed + ext);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        aria-hidden
      />
      <motion.div
        className="rename-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-modal-title"
        initial={reduced ? false : { scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={reduced ? undefined : { scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rename-modal-title" className="rename-modal__title">Rename item</h2>
        <p className="rename-modal__hint">Current file: {doc.name}</p>
        <div className="rename-modal__field">
          <input
            ref={inputRef}
            className="rename-modal__input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            aria-label="New name"
            aria-invalid={!!error}
          />
          {ext && <span className="rename-modal__ext">{ext}</span>}
        </div>
        {error && <p className="rename-modal__error" role="alert">{error}</p>}
        <div className="rename-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn--accent" onClick={submit}>
            Save name
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
