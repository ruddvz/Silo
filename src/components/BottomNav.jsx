import { SiloBottomNav } from "./shell/SiloBottomNav.jsx";

/**
 * @param {{
 *   activeTab: string,
 *   onTabChange: (id: string) => void,
 *   onAdd: () => void,
 * }} props
 */
export function BottomNav({ activeTab, onTabChange, onAdd }) {
  return (
    <SiloBottomNav
      activeTab={activeTab}
      onTabChange={onTabChange}
      onCapture={onAdd}
    />
  );
}
