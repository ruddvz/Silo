
/**
 * @param {{ file: object, stats: { total: number, open: number, done: number }, updatedLabel?: string, onOpen: () => void }} props
 */
export function ListFileCard({ file, stats, updatedLabel, onOpen }) {
  const subtitle =
    stats.total > 0
      ? `${stats.total} items · ${stats.open} open${stats.done ? ` · ${stats.done} completed` : ""}`
      : "Empty list";

  return (
    <button type="button" className="lists-card lists-card--tap lists-file-card" onClick={onOpen}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h3>{file.title}</h3>
        {file.color && (
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: file.color,
              flexShrink: 0,
              marginTop: 6,
            }}
            aria-hidden
          />
        )}
      </div>
      <div className="lists-file-card__meta">{subtitle}</div>
      {updatedLabel && <div className="lists-file-card__meta">{updatedLabel}</div>}
    </button>
  );
}
