const TABS = [
  { id: "vault", icon: "🗄", label: "Vault" },
  { id: "search", icon: "🔍", label: "Search" },
  { id: "add", icon: "+", label: "Add", isAction: true },
  { id: "browse", icon: "🗂", label: "Browse" },
  { id: "settings", icon: "⚙", label: "Settings" },
];

/**
 * @param {{
 *   activeTab: string,
 *   onTabChange: (id: string) => void,
 *   onAdd: () => void,
 * }} props
 */
export function BottomNav({ activeTab, onTabChange, onAdd }) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__item ${tab.isAction ? "bottom-nav__item--action" : ""} ${activeTab === tab.id ? "bottom-nav__item--active" : ""}`}
          onClick={() => (tab.isAction ? onAdd() : onTabChange(tab.id))}
          aria-current={activeTab === tab.id ? "page" : undefined}
          aria-label={tab.label}
        >
          <span className="bottom-nav__icon" aria-hidden>
            {tab.icon}
          </span>
          {!tab.isAction && <span className="bottom-nav__label">{tab.label}</span>}
        </button>
      ))}
    </nav>
  );
}
