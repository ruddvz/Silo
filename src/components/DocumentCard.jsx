import { motion } from "framer-motion";
import { STAGGER_ITEM, useReducedMotion } from "../design/motion.js";
import { highlightQuery } from "../lib/highlightQuery.js";

const TYPE_ICONS = {
  pdf: "📄",
  image: "🖼",
  audio: "🎙",
  text: "📝",
  note: "📝",
  file: "📁",
};

const TYPE_LABELS = {
  pdf: "PDF",
  image: "Image",
  audio: "Voice",
  text: "Note",
  note: "Note",
  file: "File",
};

/**
 * @param {{
 *   doc: { id: string|number, name: string, kind?: string, date?: string, size?: string, storage?: string, tag?: string },
 *   isSelected?: boolean,
 *   onActivate: (doc: object) => void,
 *   query?: string,
 *   snippet?: string,
 *   onKeyNav?: (doc: object, e: import('react').KeyboardEvent) => void,
 * }} props
 */
export function DocumentCard({ doc, isSelected, onActivate, query = "", snippet, onKeyNav }) {
  const k = doc.kind || "pdf";
  const reduced = useReducedMotion();

  return (
    <motion.article
      variants={STAGGER_ITEM}
      layout={!reduced}
      className={`doc-card ${isSelected ? "doc-card--selected" : ""}`}
      whileHover={reduced ? {} : { scale: 1.005 }}
      whileTap={reduced ? {} : { scale: 0.995 }}
      role="option"
      tabIndex={0}
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
            {TYPE_ICONS[k] ?? TYPE_ICONS.file}
          </span>
          <span className="doc-card__type-label">{TYPE_LABELS[k] ?? TYPE_LABELS.file}</span>
          <span className="doc-card__date">{doc.date}</span>
        </div>

        <h3 className="doc-card__name">{doc.name}</h3>

        {snippet && (
          <p
            className="doc-card__snippet"
            dangerouslySetInnerHTML={{ __html: highlightQuery(snippet, query) }}
          />
        )}

        {doc.tag && (
          <div className="doc-card__cats">
            <span className="doc-card__tag-pill">{doc.tag}</span>
          </div>
        )}
      </div>

      {doc.storage === "linked" && k !== "text" && (
        <div className="doc-card__badge doc-card__badge--linked" title="Linked from disk">
          🔗
        </div>
      )}
    </motion.article>
  );
}
