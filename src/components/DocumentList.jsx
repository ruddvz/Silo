import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DocumentCard } from "./DocumentCard.jsx";

/**
 * @param {{
 *   display: Record<string, object[]>,
 *   query: string,
 *   contentById: Record<string|number, string>,
 *   onDocOpen: (doc: object) => void,
 *   onPointerDown: (doc: object, e: import('react').PointerEvent) => void,
 *   onPointerUp: (doc: object) => void,
 *   onPointerCancel: () => void,
 *   onCardKeyDown: (doc: object, e: import('react').KeyboardEvent) => void,
 * }} props
 */
export function DocumentList({
  display,
  query,
  contentById,
  onDocOpen,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onCardKeyDown,
}) {
  const parentRef = useRef(null);

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

  const count = flatRows.length;

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (flatRows[i]?.type === "header" ? 32 : 96),
    overscan: 8,
  });

  return (
    <div className="doc-list doc-list--virtual" ref={parentRef}>
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
                <div
                  role="presentation"
                  onPointerDown={(e) => onPointerDown(row.doc, e)}
                  onPointerUp={() => onPointerUp(row.doc)}
                  onPointerCancel={onPointerCancel}
                >
                  <DocumentCard
                    doc={row.doc}
                    query={query}
                    snippet={query.trim() ? (contentById[row.doc.id] ?? "").slice(0, 160) : ""}
                    onActivate={() => onDocOpen(row.doc)}
                    onKeyNav={onCardKeyDown}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
