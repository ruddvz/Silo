/** @param {{ active?: boolean, children: import('react').ReactNode, onClick?: () => void, className?: string }} props */
export function Chip({ active, children, onClick, className = "" }) {
  if (onClick) {
    return (
      <button
        type="button"
        className={`ui-chip ${active ? "ui-chip--active" : ""} ${className}`.trim()}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
  return <span className={`ui-chip ${className}`.trim()}>{children}</span>;
}
