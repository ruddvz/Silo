/** @param {{ title: string, children: import('react').ReactNode }} props */
export function SettingsGroup({ title, children }) {
  return (
    <section className="ui-settings-group" aria-label={title}>
      <h3 className="ui-settings-group__title">{title}</h3>
      <div className="ui-settings-group__rows">{children}</div>
    </section>
  );
}

/** @param {{ title: string, hint?: string, value?: string, onClick?: () => void, danger?: boolean, disabled?: boolean }} props */
export function SettingsRow({ title, hint, value, onClick, danger, disabled }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`ui-settings-row ${danger ? "ui-settings-row--danger" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="ui-settings-row__text">
        <span className="ui-settings-row__title">{title}</span>
        {hint && <span className="ui-settings-row__hint">{hint}</span>}
      </div>
      {value && <span className="ui-settings-row__value">{value}</span>}
      {onClick && <span className="ui-settings-row__chevron" aria-hidden>›</span>}
    </Tag>
  );
}
