import { SiloBottomNav } from "./shell/SiloBottomNav.jsx";

/**
 * @param {{
 *   activeTab: string,
 *   onTabChange: (id: string) => void,
 *   onAdd: () => void,
 *   badgeCount?: number,
 * }} props
 */
export function BottomNav({ activeTab, onTabChange, onAdd, badgeCount }) {
  return (
    <SiloBottomNav
      activeTab={activeTab}
      onTabChange={onTabChange}
      onCapture={onAdd}
      badgeCount={badgeCount}
    />
  );
}
