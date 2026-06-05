/** @param {{ title: string, action?: import('react').ReactNode, className?: string }} props */
export function SectionHeader({ title, action, className = "" }) {
  return (
    <div className={`ui-section-header ${className}`.trim()}>
      <h3 className="ui-section-header__title">{title}</h3>
      {action}
    </div>
  );
}
