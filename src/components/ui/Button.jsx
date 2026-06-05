/** @param {{ variant?: "primary" | "secondary" | "ghost" | "danger", size?: "sm" | "md" | "lg", className?: string, children: import('react').ReactNode } & import('react').ButtonHTMLAttributes<HTMLButtonElement>} props */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
