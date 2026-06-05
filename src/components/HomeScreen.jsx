import { QuickCaptureCard } from "./QuickCaptureCard.jsx";
import { DocumentCard } from "./DocumentCard.jsx";

/**
 * @param {{
 *   docs: object[],
 *   contentById: Record<string|number, string>,
 *   vaultStatusLabel: string,
 *   needsAttention: Array<{ label: string, action?: () => void }>,
 *   ingestBusy: boolean,
 *   onAddFile: () => void,
 *   onAddPhoto: () => void,
 *   onAddNote: () => void,
 *   onAddVoice: () => void,
 *   onOpenDoc: (doc: object) => void,
 *   onViewAll: () => void,
 * }} props
 */
export function HomeScreen({
  docs,
  contentById,
  vaultStatusLabel,
  needsAttention,
  ingestBusy,
  onAddFile,
  onAddPhoto,
  onAddNote,
  onAddVoice,
  onOpenDoc,
  onViewAll,
}) {
  const recent = [...docs]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  return (
    <div className="home-screen">
      <div className="home-screen__status">
        <span className="home-screen__status-dot" aria-hidden />
        <span>{vaultStatusLabel}</span>
      </div>

      <QuickCaptureCard
        disabled={ingestBusy}
        onAddFile={onAddFile}
        onAddPhoto={onAddPhoto}
        onAddNote={onAddNote}
        onAddVoice={onAddVoice}
      />

      {needsAttention.length > 0 && (
        <section className="home-screen__section" aria-label="Needs attention">
          <h3 className="home-screen__section-title">Needs attention</h3>
          <ul className="home-screen__attention">
            {needsAttention.map((item) => (
              <li key={item.label}>
                {item.action ? (
                  <button type="button" className="home-screen__attention-btn" onClick={item.action}>
                    {item.label}
                  </button>
                ) : (
                  <span>{item.label}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="home-screen__section" aria-label="Recent saves">
        <div className="home-screen__section-head">
          <h3 className="home-screen__section-title">Recent saves</h3>
          {docs.length > 5 && (
            <button type="button" className="home-screen__link" onClick={onViewAll}>
              View all
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="home-screen__empty">Your vault is empty. Add your first file, note, or voice memo above.</p>
        ) : (
          <div className="home-screen__recent">
            {recent.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                query=""
                snippet={(contentById[doc.id] || "").slice(0, 120)}
                onActivate={onOpenDoc}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
