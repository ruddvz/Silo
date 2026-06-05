import { APP_ICON_SRC } from "../../lib/vaultConstants.js";
import { IconShield } from "../ui/icons.jsx";

/**
 * @param {{
 *   title?: string,
 *   subtitle: string,
 *   onSettings: () => void,
 * }} props
 */
export function SiloTopBar({ title = "Silo", subtitle, onSettings }) {
  return (
    <header className="silo-topbar" role="banner">
      <div className="silo-topbar__inner">
        <div className="silo-topbar__brand">
          <img src={APP_ICON_SRC} alt="" width={36} height={36} className="silo-topbar__icon" />
          <div className="silo-topbar__titles">
            <span className="silo-topbar__title">{title}</span>
            <span className="silo-topbar__subtitle">{subtitle}</span>
          </div>
        </div>
        <button type="button" className="silo-topbar__settings" onClick={onSettings} aria-label="Settings">
          <IconShield size={20} />
        </button>
      </div>
    </header>
  );
}
