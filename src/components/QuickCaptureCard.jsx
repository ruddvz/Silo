import { IconFile, IconImage, IconNote, IconMic } from "./ui/icons.jsx";

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
    { label: "File", Icon: IconFile, onClick: onAddFile },
    { label: "Photo", Icon: IconImage, onClick: onAddPhoto },
    { label: "Note", Icon: IconNote, onClick: onAddNote },
    { label: "Voice", Icon: IconMic, onClick: onAddVoice },
  ];

  return (
    <section className="quick-capture" aria-label="Quick capture">
      <h2 className="quick-capture__title">Quick capture</h2>
      <p className="quick-capture__lead">Save something privately on this device.</p>
      <div className="quick-capture__grid">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className="quick-capture__btn"
            disabled={disabled}
            onClick={a.onClick}
          >
            <span className="quick-capture__icon" aria-hidden>
              <a.Icon size={22} />
            </span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
