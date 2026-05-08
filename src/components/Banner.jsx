/**
 * @param {{ variant?: 'warning' | 'info', children: import('react').ReactNode }} props
 */
export function Banner({ variant = "warning", children }) {
  return (
    <div className={`app-banner app-banner--${variant}`} role="status">
      {children}
    </div>
  );
}
