const SMART_ITEMS = [
  { id: "", label: "All items" },
  { id: "Recent", label: "Recent" },
  { id: "Voice", label: "Voice" },
  { id: "Screenshots", label: "Shots" },
  { id: "LowOCR", label: "Low OCR" },
  { id: "Duplicates", label: "Dupes" },
];

/**
 * @param {{
 *   tags: string[],
 *   activeTag: string,
 *   smartView: string,
 *   onTag: (t: string) => void,
 *   onSmart: (id: string) => void,
 *   onSettings: () => void,
 * }} props
 */
export function Sidebar({ tags, activeTag, smartView, onTag, onSmart, onSettings }) {
  return (
    <aside className="sidebar" aria-label="Vault navigation">
      <div className="sidebar__logo">
        Silo<span>.</span>
      </div>

      <div className="sidebar__section-label">Smart views</div>
      {SMART_ITEMS.map((s) => (
        <button
          key={s.id || "all"}
          type="button"
          className={`sidebar__item ${smartView === s.id ? "sidebar__item--active" : ""}`}
          onClick={() => onSmart(s.id)}
        >
          {s.label}
        </button>
      ))}

      <div className="sidebar__section-label">Categories</div>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={`sidebar__item ${activeTag === tag && !smartView ? "sidebar__item--active" : ""}`}
          onClick={() => {
            onSmart("");
            onTag(tag);
          }}
        >
          {tag}
        </button>
      ))}

      <div className="sidebar__spacer" />

      <button type="button" className="sidebar__item sidebar__item--settings" onClick={onSettings}>
        Settings
      </button>
    </aside>
  );
}
