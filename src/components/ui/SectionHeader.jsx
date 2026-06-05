/** @param {{ title: string, subtitle?: string, action?: import('react').ReactNode, className?: string }} props */
export function SectionHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={`ui-section-header ${className}`.trim()}>
      <div className="ui-section-header__text">
        <h3 className="ui-section-header__title">{title}</h3>
        {subtitle && <p className="ui-section-header__subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
