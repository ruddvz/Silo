import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DocumentCard } from "./DocumentCard.jsx";
import { SwipeableDocRow } from "./SwipeableDocRow.jsx";
import { explainSearchMatch } from "../lib/searchExplain.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

/**
 * @param {{
 *   display: Record<string, object[]>,
 *   query: string,
 *   contentById: Record<string|number, string>,
 *   onDocOpen: (doc: object) => void,
 *   onDocPreview?: (doc: object) => void,
 *   onPointerDown: (doc: object, e: import('react').PointerEvent) => void,
 *   onPointerUp: (doc: object) => void,
 *   onPointerCancel: () => void,
 *   onCardKeyDown: (doc: object, e: import('react').KeyboardEvent) => void,
 *   onSwipeDelete?: (doc: object) => void,
 *   onSwipeMore?: (doc: object) => void,
 *   onSwipeBackup?: (doc: object) => void,
 *   onSwipePin?: (doc: object) => void,
 *   pinnedIds?: Set<string>,
 *   cardVariant?: "compact" | "comfortable" | "searchResult" | "desktopRow",
 * }} props
 */
export function DocumentList({
  display,
  query,
  contentById,
  onDocOpen,
  onDocPreview,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onCardKeyDown,
  onSwipeDelete,
  onSwipeMore,
  onSwipeBackup,
  onSwipePin,
  pinnedIds,
  cardVariant: cardVariantProp,
}) {
  const parentRef = useRef(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const cardVariant = cardVariantProp ?? (isDesktop ? "desktopRow" : "comfortable");

  const flatRows = useMemo(() => {
    const rows = [];
    for (const [tag, items] of Object.entries(display)) {
      rows.push({ type: "header", tag, key: `h-${tag}` });
      for (const doc of items) {
        rows.push({ type: "doc", doc, tag, key: `d-${doc.id}` });
      }
    }
    return rows;
  }, [display]);

  const rowHeight = cardVariant === "desktopRow" ? 68 : cardVariant === "compact" ? 84 : 96;

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (flatRows[i]?.type === "header" ? 36 : rowHeight),
    overscan: 8,
  });

  return (
    <div className={`doc-list doc-list--virtual ${cardVariant === "desktopRow" ? "doc-list--desktop" : ""}`} ref={parentRef}>
      {cardVariant === "desktopRow" && (
        <div className="doc-list__table-head" aria-hidden>
          <span>Type</span>
          <span>Name</span>
          <span>Tag</span>
          <span>Size</span>
          <span>Date</span>
          <span>Storage</span>
          <span>Actions</span>
        </div>
      )}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const row = flatRows[vi.index];
          if (!row) return null;
          return (
            <div
              key={row.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${vi.size}px`,
                transform: `translateY(${vi.start}px)`,
              }}
            >
              {row.type === "header" ? (
                <div className="doc-list__section-label">{row.tag}</div>
              ) : (
                <SwipeableDocRow
                  pinned={pinnedIds?.has(String(row.doc.id))}
                  onSwipeDelete={onSwipeDelete ? () => onSwipeDelete(row.doc) : undefined}
                  onSwipeMore={onSwipeMore ? () => onSwipeMore(row.doc) : undefined}
                  onSwipeBackup={onSwipeBackup ? () => onSwipeBackup(row.doc) : undefined}
                  onSwipePin={onSwipePin ? () => onSwipePin(row.doc) : undefined}
                >
                  <div
                    role="presentation"
                    onPointerDown={(e) => onPointerDown(row.doc, e)}
                    onPointerUp={() => onPointerUp(row.doc)}
                    onPointerCancel={onPointerCancel}
                  >
                    <DocumentCard
                      doc={row.doc}
                      variant={cardVariant}
                      query={query}
                      snippet={query.trim() ? (contentById[row.doc.id] ?? "").slice(0, 160) : ""}
                      matchReason={query.trim() ? explainSearchMatch(row.doc, query, contentById[row.doc.id]) : null}
                      onActivate={() => onDocOpen(row.doc)}
                      onPreview={onDocPreview ? () => onDocPreview(row.doc) : undefined}
                      onMore={onSwipeMore ? () => onSwipeMore(row.doc) : undefined}
                      onKeyNav={onCardKeyDown}
                    />
                  </div>
                </SwipeableDocRow>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
