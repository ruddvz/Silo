import { motion } from "framer-motion";
import { EASE_OUT, useReducedMotion } from "../design/motion.js";
import { FileTypeIcon } from "./ui/FileTypeIcon.jsx";
import { IconClose } from "./ui/icons.jsx";
import { FILE_TYPE_LABELS } from "../lib/fileTypeLabels.js";
import { StatusPill } from "./ui/StatusPill.jsx";
function formatBytesLocal(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * @param {{
 *   doc: object | null,
 *   contentSnippet?: string,
 *   onOpen: (doc: object) => void,
 *   onExport: (doc: object) => void,
 *   onRename: (doc: object) => void,
 *   onDelete: (doc: object) => void,
 *   onClose: () => void,
 * }} props
 */
export function PreviewPanel({
  doc,
  contentSnippet = "",
  onOpen,
  onExport,
  onRename,
  onDelete,
  onClose,
}) {
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
  const typeLabel = FILE_TYPE_LABELS[k] ?? FILE_TYPE_LABELS.file;
  const storageLabel = doc.storage === "linked" ? "Linked from disk" : "Stored in vault";
  const excerpt = (contentSnippet || "").trim().slice(0, 1200);
  const statusVariant =
    doc.extractionStatus === "error"
      ? "warning"
      : doc.storage === "linked"
        ? "info"
        : "success";
  const statusLabel =
    doc.extractionStatus === "error"
      ? "Needs repair"
      : doc.storage === "linked"
        ? "Linked"
        : excerpt
          ? "Indexed"
          : "Awaiting text";

  return (
    <motion.aside
      className="preview-panel"
      aria-label="Document preview"
      initial={reduced ? false : { opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={EASE_OUT}
    >
      <div className="preview-panel__header">
        <div className="preview-panel__title-block">
          <div className="preview-panel__type-row">
            <FileTypeIcon kind={k} size={22} />
            <span className="preview-panel__type">{typeLabel}</span>
            <StatusPill variant={statusVariant}>{statusLabel}</StatusPill>
          </div>
          <h2 className="preview-panel__name">{doc.name}</h2>
        </div>
        <button type="button" className="icon-btn preview-panel__close" onClick={onClose} aria-label="Close preview">
          <IconClose size={20} />
        </button>
      </div>

      {excerpt ? (
        <div className="preview-panel__body">
          <p className="preview-panel__body-label">Extracted text</p>
          <pre className="preview-panel__excerpt">{excerpt}</pre>
        </div>
      ) : (
        <div className="preview-panel__body preview-panel__body--empty">
          <p className="preview-panel__body-hint">
            {k === "image"
              ? "No OCR text yet. Open the file or run repair from Settings to extract searchable text."
              : k === "audio"
                ? "No transcript yet. Open the file or run repair to generate searchable text."
                : "No indexed text preview yet. Open the file or run vault repair if this should be searchable."}
          </p>
        </div>
      )}

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
          <dd>{doc.tag || "Unsorted"}</dd>
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
