import { motion } from "framer-motion";
import { STAGGER_ITEM, useReducedMotion } from "../design/motion.js";
import { highlightQuery } from "../lib/highlightQuery.js";
import { FileTypeIcon } from "./ui/FileTypeIcon.jsx";
import { FILE_TYPE_LABELS } from "../lib/fileTypeLabels.js";
import { StatusPill } from "./ui/StatusPill.jsx";
import { formatRelativeDate, formatBytes } from "../lib/vaultFormat.js";

/**
 * @param {{
 *   doc: { id: string|number, name: string, kind?: string, date?: string, size?: string, sizeBytes?: number, storage?: string, tag?: string, extractionStatus?: string, createdAt?: string },
 *   variant?: "compact" | "comfortable" | "searchResult" | "desktopRow",
 *   isSelected?: boolean,
 *   onActivate: (doc: object) => void,
 *   onPreview?: (doc: object) => void,
 *   onMore?: (doc: object) => void,
 *   query?: string,
 *   snippet?: string,
 *   matchReason?: string | null,
 *   onKeyNav?: (doc: object, e: import('react').KeyboardEvent) => void,
 * }} props
 */
export function DocumentCard({
  doc,
  variant = "comfortable",
  isSelected,
  onActivate,
  onPreview,
  onMore,
  query = "",
  snippet,
  matchReason,
  onKeyNav,
}) {
  const k = doc.kind || "file";
  const reduced = useReducedMotion();
  const status =
    doc.extractionStatus === "error"
      ? { label: "Needs repair", variant: "warning" }
      : doc.storage === "linked"
        ? { label: "Linked", variant: "info" }
        : { label: "Indexed", variant: "success" };

  const metaDate = doc.date || (doc.createdAt ? formatRelativeDate(doc.createdAt) : "Recently added");
  const metaSize =
    doc.size || (typeof doc.sizeBytes === "number" && doc.sizeBytes > 0 ? formatBytes(doc.sizeBytes) : null);
  const metaTag = doc.tag || "Unsorted";
  const typeLabel = FILE_TYPE_LABELS[k] ?? FILE_TYPE_LABELS.file;
  const storageLabel = doc.storage === "linked" ? "Linked" : "Local";

  const sharedProps = {
    role: "option",
    tabIndex: 0,
    onClick: () => onActivate(doc),
    onKeyDown: (e) => {
      onKeyNav?.(doc, e);
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate(doc);
      }
    },
    "aria-selected": isSelected,
    "aria-label": `Open ${doc.name}`,
  };

  if (variant === "desktopRow") {
    return (
      <article
        {...sharedProps}
        className={`doc-card doc-card--desktopRow ${isSelected ? "doc-card--selected" : ""}`}
      >
        <span className="doc-card__col doc-card__col--type">
          <FileTypeIcon kind={k} size={20} />
          <span className="doc-card__type-label">{typeLabel}</span>
        </span>
        <span className="doc-card__col doc-card__col--name">
          <span className="doc-card__name">{doc.name}</span>
          {snippet && query && (
            <span
              className="doc-card__snippet-inline"
              dangerouslySetInnerHTML={{ __html: highlightQuery(snippet.slice(0, 80), query) }}
            />
          )}
        </span>
        <span className="doc-card__col doc-card__col--tag">{metaTag}</span>
        <span className="doc-card__col doc-card__col--size">{metaSize || "—"}</span>
        <span className="doc-card__col doc-card__col--date">{metaDate}</span>
        <span className="doc-card__col doc-card__col--storage">
          <StatusPill variant={status.variant}>{storageLabel}</StatusPill>
        </span>
        <span className="doc-card__col doc-card__col--actions">
          {onPreview && (
            <button type="button" className="doc-card__action" onClick={(e) => { e.stopPropagation(); onPreview(doc); }}>
              Preview
            </button>
          )}
          {onMore && (
            <button type="button" className="doc-card__action doc-card__action--icon" aria-label={`More actions for ${doc.name}`} onClick={(e) => { e.stopPropagation(); onMore(doc); }}>
              ···
            </button>
          )}
        </span>
      </article>
    );
  }

  const isCompact = variant === "compact";
  const isSearch = variant === "searchResult";

  return (
    <motion.article
      variants={STAGGER_ITEM}
      layout={!reduced}
      className={`doc-card doc-card--${variant} ${isSelected ? "doc-card--selected" : ""}`}
      whileHover={reduced ? {} : { scale: 1.005 }}
      whileTap={reduced ? {} : { scale: 0.98 }}
      {...sharedProps}
    >
      <div className="doc-card__icon-wrap" aria-hidden>
        <FileTypeIcon kind={k} size={isCompact ? 22 : isSearch ? 24 : 24} />
        {doc.storage === "linked" && <span className="doc-card__badge doc-card__badge--link" title="Linked" />}
        {doc.extractionStatus === "error" && <span className="doc-card__badge doc-card__badge--warn" title="Extraction issue" />}
      </div>

      <div className="doc-card__body">
        <h3 className="doc-card__name">{doc.name}</h3>

        {!isCompact && snippet && (
          <p
            className="doc-card__snippet"
            dangerouslySetInnerHTML={{ __html: highlightQuery(snippet, query) }}
          />
        )}

        {matchReason && query && (
          <p className="doc-card__match-reason">{matchReason}</p>
        )}

        <div className="doc-card__meta">
          <span>{metaTag}</span>
          <span>{metaDate}</span>
          {metaSize && <span>{metaSize}</span>}
          <span>{storageLabel}</span>
        </div>

        {!isCompact && !isSearch && (
          <div className="doc-card__footer">
            <StatusPill variant={status.variant}>{status.label}</StatusPill>
          </div>
        )}
      </div>

      {(onPreview || onMore) && !isCompact && (
        <div className="doc-card__actions">
          {onPreview && (
            <button type="button" className="doc-card__action" aria-label={`Preview ${doc.name}`} onClick={(e) => { e.stopPropagation(); onPreview(doc); }}>
              Preview
            </button>
          )}
          {onMore && (
            <button type="button" className="doc-card__action doc-card__action--icon" aria-label={`More actions for ${doc.name}`} onClick={(e) => { e.stopPropagation(); onMore(doc); }}>
              ···
            </button>
          )}
        </div>
      )}
    </motion.article>
  );
}
