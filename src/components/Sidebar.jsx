import { StatusPill } from "./ui/StatusPill.jsx";

const PRIMARY_NAV = [
  { id: "home", label: "Home" },
  { id: "search", label: "Search" },
  { id: "add", label: "Add" },
  { id: "vault", label: "Vault" },
  { id: "lists", label: "Lists" },
  { id: "settings", label: "Settings" },
];

const SMART_ITEMS = [
  { id: "", label: "All" },
  { id: "Recent", label: "Recent" },
  { id: "Voice", label: "Voice" },
  { id: "Screenshots", label: "Screenshots" },
  { id: "LowOCR", label: "Low OCR" },
  { id: "Duplicates", label: "Duplicates" },
];

/**
 * @param {{
 *   tags: string[],
 *   activeTag: string,
 *   smartView: string,
 *   activeTab?: string,
 *   storageLabel?: string,
 *   backupLabel?: string,
 *   onTab?: (id: string) => void,
 *   onTag: (t: string) => void,
 *   onSmart: (id: string) => void,
 *   onSettings: () => void,
 *   onOpenLists?: () => void,
 * }} props
 */
export function Sidebar({
  tags,
  activeTag,
  smartView,
  activeTab = "home",
  storageLabel = "Private on this device",
  backupLabel = "No backup yet",
  onTab,
  onTag,
  onSmart,
  onSettings,
  onOpenLists,
}) {
  const handleNav = (id) => {
    if (id === "lists") {
      onOpenLists?.();
      return;
    }
    if (id === "settings") {
      onSettings();
      return;
    }
    onTab?.(id);
  };

  return (
    <aside className="sidebar silo-glass" aria-label="Vault navigation">
      <div className="sidebar__brand">
        <div className="sidebar__logo-icon" aria-hidden>
          S
        </div>
        <div>
          <div className="sidebar__logo">Silo</div>
          <div className="sidebar__logo-sub">Private local-first vault</div>
        </div>
      </div>

      <div className="sidebar__section-label">Navigate</div>
      {PRIMARY_NAV.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`sidebar__item ${activeTab === item.id ? "sidebar__item--active" : ""}`}
          onClick={() => handleNav(item.id)}
        >
          {item.label}
        </button>
      ))}

      <div className="sidebar__section-label">Smart collections</div>
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
            onTab?.("vault");
          }}
        >
          {tag}
        </button>
      ))}

      <div className="sidebar__spacer" />

      <div className="sidebar__footer">
        <StatusPill variant="info">{storageLabel}</StatusPill>
        <StatusPill variant={backupLabel.includes("No") ? "warning" : "success"}>{backupLabel}</StatusPill>
      </div>
    </aside>
  );
}
