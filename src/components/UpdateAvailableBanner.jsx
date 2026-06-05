import { Banner } from "./Banner.jsx";

/**
 * @param {{ onReload: () => void, onDismiss: () => void }} props
 */
export function UpdateAvailableBanner({ onReload, onDismiss }) {
  return (
    <Banner variant="info">
      <div className="update-banner">
        <span>A new version of Silo is ready.</span>
        <div className="update-banner__actions">
          <button type="button" className="btn btn--accent btn--sm" onClick={onReload}>
            Reload safely
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
            Later
          </button>
        </div>
      </div>
    </Banner>
  );
}
