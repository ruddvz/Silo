/**
 * @param {{ title: string, onBack?: () => void, onRight?: () => void, rightLabel?: string, leftLabel?: string }} props
 */
export function ListsTopNav({ title, onBack, onRight, rightLabel = "⋯", leftLabel = "←" }) {
  return (
    <header className="lists-topbar">
      <button type="button" className="lists-topbar__side" onClick={onBack} aria-label="Back">
        {onBack ? leftLabel : <span style={{ opacity: 0.3 }}>·</span>}
      </button>
      <div className="lists-pill">{title}</div>
      <button type="button" className="lists-topbar__side" onClick={onRight} aria-label="More">
        {onRight ? rightLabel : <span style={{ opacity: 0.3 }}>·</span>}
      </button>
    </header>
  );
}
