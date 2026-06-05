/**
 * @param {{
 *   disabled?: boolean,
 *   onAddFile: () => void,
 *   onAddPhoto: () => void,
 *   onAddNote: () => void,
 *   onAddVoice: () => void,
 * }} props
 */
export function QuickCaptureCard({ disabled, onAddFile, onAddPhoto, onAddNote, onAddVoice }) {
  const actions = [
    { label: "File", icon: "📎", onClick: onAddFile },
    { label: "Photo", icon: "🖼", onClick: onAddPhoto },
    { label: "Note", icon: "📝", onClick: onAddNote },
    { label: "Voice", icon: "🎙", onClick: onAddVoice },
  ];

  return (
    <section className="quick-capture" aria-label="Quick capture">
      <h2 className="quick-capture__title">Save something</h2>
      <p className="quick-capture__lead">Fewer taps than sending it to yourself.</p>
      <div className="quick-capture__grid">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className="quick-capture__btn"
            disabled={disabled}
            onClick={a.onClick}
          >
            <span className="quick-capture__icon" aria-hidden>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
