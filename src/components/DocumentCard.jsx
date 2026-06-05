import { motion } from "framer-motion";
import { STAGGER_ITEM, useReducedMotion } from "../design/motion.js";
import { highlightQuery } from "../lib/highlightQuery.js";
import { FileTypeIcon } from "./ui/FileTypeIcon.jsx";
import { FILE_TYPE_LABELS } from "../lib/fileTypeLabels.js";
import { StatusPill } from "./ui/StatusPill.jsx";
import { IconLink } from "./ui/icons.jsx";

/**
 * @param {{
 *   doc: { id: string|number, name: string, kind?: string, date?: string, size?: string, storage?: string, tag?: string, extractionStatus?: string },
 *   isSelected?: boolean,
 *   onActivate: (doc: object) => void,
 *   query?: string,
 *   snippet?: string,
 *   matchReason?: string | null,
 *   onKeyNav?: (doc: object, e: import('react').KeyboardEvent) => void,
 * }} props
 */
export function DocumentCard({ doc, isSelected, onActivate, query = "", snippet, matchReason, onKeyNav }) {
  const k = doc.kind || "pdf";
  const reduced = useReducedMotion();
  const status =
    doc.extractionStatus === "error"
      ? { label: "Needs repair", variant: "warning" }
      : doc.storage === "linked"
        ? { label: "Linked", variant: "info" }
        : { label: "Indexed", variant: "success" };

  return (
    <motion.article
      variants={STAGGER_ITEM}
      layout={!reduced}
      className={`doc-card ${isSelected ? "doc-card--selected" : ""}`}
      whileHover={reduced ? {} : { scale: 1.005 }}
      whileTap={reduced ? {} : { scale: 0.995 }}
      role="option"
      tabIndex={0}
      onClick={() => onActivate(doc)}
      onKeyDown={(e) => {
        onKeyNav?.(doc, e);
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate(doc);
        }
      }}
      aria-selected={isSelected}
      aria-label={`Open ${doc.name}`}
    >
      <div className="doc-card__type-bar" data-type={k} />

      <div className="doc-card__body">
        <div className="doc-card__header">
          <span className="doc-card__icon" aria-hidden>
            <FileTypeIcon kind={k} size={18} />
          </span>
          <span className="doc-card__type-label">{FILE_TYPE_LABELS[k] ?? FILE_TYPE_LABELS.file}</span>
          <span className="doc-card__date">{doc.date}</span>
        </div>

        <h3 className="doc-card__name">{doc.name}</h3>

        {snippet && (
          <p
            className="doc-card__snippet"
            dangerouslySetInnerHTML={{ __html: highlightQuery(snippet, query) }}
          />
        )}

        {matchReason && query && (
          <p className="doc-card__match-reason">{matchReason}</p>
        )}

        <div className="doc-card__footer">
          {doc.tag && <span className="doc-card__tag-pill">{doc.tag}</span>}
          <StatusPill variant={status.variant}>{status.label}</StatusPill>
        </div>
      </div>

      {doc.storage === "linked" && k !== "text" && (
        <div className="doc-card__badge doc-card__badge--linked" title="Linked from disk">
          <IconLink size={14} />
        </div>
      )}
    </motion.article>
  );
}
