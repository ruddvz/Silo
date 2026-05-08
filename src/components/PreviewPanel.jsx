import { motion } from "framer-motion";
import { EASE_OUT, useReducedMotion } from "../design/motion.js";

function formatBytesLocal(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * @param {{
 *   doc: object | null,
 *   onOpen: (doc: object) => void,
 *   onExport: (doc: object) => void,
 *   onRename: (doc: object) => void,
 *   onDelete: (doc: object) => void,
 *   onClose: () => void,
 * }} props
 */
export function PreviewPanel({ doc, onOpen, onExport, onRename, onDelete, onClose }) {
  const reduced = useReducedMotion();

  if (!doc) {
    return (
      <aside className="preview-panel preview-panel--empty" aria-label="Document preview">
        <div className="preview-panel__empty-inner">
          <p className="preview-panel__empty-title">No selection</p>
          <p className="preview-panel__empty-body">Choose a document from the list to see details and actions.</p>
        </div>
      </aside>
    );
  }

  const k = doc.kind || "pdf";
  const storageLabel = doc.storage === "linked" ? "Linked from disk" : "In vault (OPFS)";

  return (
    <motion.aside
      className="preview-panel"
      aria-label="Document preview"
      initial={reduced ? false : { opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={EASE_OUT}
    >
      <div className="preview-panel__header">
        <div>
          <span className="preview-panel__type">{k}</span>
          <h2 className="preview-panel__name">{doc.name}</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close preview">
          ✕
        </button>
      </div>

      <dl className="preview-panel__meta">
        <div className="preview-panel__row">
          <dt>Added</dt>
          <dd>{doc.date}</dd>
        </div>
        <div className="preview-panel__row">
          <dt>Size</dt>
          <dd>{typeof doc.sizeBytes === "number" ? formatBytesLocal(doc.sizeBytes) : doc.size}</dd>
        </div>
        <div className="preview-panel__row">
          <dt>Category</dt>
          <dd>{doc.tag}</dd>
        </div>
        <div className="preview-panel__row">
          <dt>Storage</dt>
          <dd>{storageLabel}</dd>
        </div>
      </dl>

      <div className="preview-panel__actions">
        <button type="button" className="btn btn--accent btn--sm" onClick={() => onOpen(doc)}>
          Open
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onExport(doc)}>
          Export
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onRename(doc)}>
          Rename
        </button>
        <button type="button" className="btn btn--danger btn--sm" onClick={() => onDelete(doc)}>
          Delete
        </button>
      </div>
    </motion.aside>
  );
}
