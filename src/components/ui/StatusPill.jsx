/** @param {{ variant?: "default" | "success" | "warning" | "danger" | "info", children: import('react').ReactNode, className?: string }} props */
export function StatusPill({ variant = "default", children, className = "" }) {
  return (
    <span className={`ui-status-pill ui-status-pill--${variant} ${className}`.trim()}>
      {children}
    </span>
  );
}
