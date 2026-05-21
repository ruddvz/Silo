const TABS = [
  { id: "lists", label: "Lists", icon: "☰" },
  { id: "search", label: "Search", icon: "⌕" },
  { id: "add", label: "Add", isAction: true },
  { id: "activity", label: "Activity", icon: "◷" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

/**
 * @param {{ active: string, onTab: (id: string) => void, onAdd: () => void }} props
 */
export function ListsBottomNav({ active, onTab, onAdd }) {
  return (
    <nav className="lists-bottom-nav" aria-label="Lists navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`lists-bottom-nav__item ${tab.isAction ? "lists-bottom-nav__item--action" : ""} ${active === tab.id ? "lists-bottom-nav__item--active" : ""}`}
          onClick={() => (tab.isAction ? onAdd() : onTab(tab.id))}
          aria-current={active === tab.id ? "page" : undefined}
        >
          <span aria-hidden style={{ fontSize: tab.isAction ? undefined : 18 }}>
            {tab.icon}
          </span>
          {!tab.isAction && <span>{tab.label}</span>}
        </button>
      ))}
    </nav>
  );
}
