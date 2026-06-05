import { IconHome, IconSearch, IconPlus, IconVault, IconSettings } from "../ui/icons.jsx";

const TABS = [
  { id: "home", label: "Home", Icon: IconHome },
  { id: "search", label: "Search", Icon: IconSearch },
  { id: "add", label: "Add to Silo", Icon: IconPlus, isCapture: true },
  { id: "vault", label: "Vault", Icon: IconVault },
  { id: "settings", label: "Settings", Icon: IconSettings },
];

/**
 * @param {{
 *   activeTab: string,
 *   onTabChange: (id: string) => void,
 *   onCapture: () => void,
 *   badgeCount?: number,
 * }} props
 */
export function SiloBottomNav({ activeTab, onTabChange, onCapture, badgeCount = 0 }) {
  const resolved = activeTab === "browse" ? "vault" : activeTab;

  return (
    <div className="silo-bottom-nav-wrap">
      <nav className="silo-bottom-nav" aria-label="Primary">
        {TABS.map((tab) => {
          const isCapture = tab.isCapture;
          const isActive = !isCapture && resolved === tab.id;
          const Icon = tab.Icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`silo-tab ${isCapture ? "silo-tab--capture" : ""} ${isActive ? "silo-tab--active" : ""}`}
              onClick={() => (isCapture ? onCapture() : onTabChange(tab.id))}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
            >
              <span className="silo-tab__icon-wrap">
                <Icon size={isCapture ? 24 : 20} />
                {isCapture && badgeCount > 0 && (
                  <span className="silo-tab__badge" aria-label={`${badgeCount} pending imports`}>
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </span>
              {!isCapture && <span className="silo-tab__label">{tab.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
