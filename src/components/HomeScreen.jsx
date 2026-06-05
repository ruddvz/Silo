import { QuickCaptureCard } from "./QuickCaptureCard.jsx";
import { DocumentCard } from "./DocumentCard.jsx";
import { SectionHeader } from "./ui/SectionHeader.jsx";
import { Chip } from "./ui/Chip.jsx";
import { Button } from "./ui/Button.jsx";
import { IconSearch } from "./ui/icons.jsx";

const SMART_COLLECTIONS = ["Identity", "Finance", "Housing", "Voice", "Screenshots"];

/**
 * @param {{
 *   docs: object[],
 *   contentById: Record<string|number, string>,
 *   vaultStatusLabel: string,
 *   vaultMeta: string,
 *   backupRecommended?: boolean,
 *   needsAttention: Array<{ label: string, action?: () => void }>,
 *   ingestBusy: boolean,
 *   onAddFile: () => void,
 *   onAddPhoto: () => void,
 *   onAddNote: () => void,
 *   onAddVoice: () => void,
 *   onOpenDoc: (doc: object) => void,
 *   onViewAll: () => void,
 *   onSearch: () => void,
 *   onBackup: () => void,
 *   onOpenLists?: () => void,
 *   onCollection?: (name: string) => void,
 * }} props
 */
export function HomeScreen({
  docs,
  contentById,
  vaultStatusLabel,
  vaultMeta,
  backupRecommended,
  needsAttention,
  ingestBusy,
  onAddFile,
  onAddPhoto,
  onAddNote,
  onAddVoice,
  onOpenDoc,
  onViewAll,
  onSearch,
  onBackup,
  onOpenLists,
  onCollection,
}) {
  const recent = [...docs]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  return (
    <div className="home-screen">
      <div className="home-screen__left">
        <section className="home-status-card" aria-label="Vault status">
          <h2 className="home-status-card__title">
            {backupRecommended ? "Backup recommended" : vaultStatusLabel}
          </h2>
          <p className="home-status-card__meta">{vaultMeta}</p>
          {backupRecommended && (
            <Button variant="secondary" size="sm" onClick={onBackup}>
              Back up now
            </Button>
          )}
        </section>

        <div className="home-search-entry">
          <button type="button" className="home-search-entry__btn" onClick={onSearch}>
            <IconSearch size={18} />
            Search anything in Silo
          </button>
        </div>

        <QuickCaptureCard
          disabled={ingestBusy}
          onAddFile={onAddFile}
          onAddPhoto={onAddPhoto}
          onAddNote={onAddNote}
          onAddVoice={onAddVoice}
        />
      </div>

      <div className="home-screen__right">
        {needsAttention.length > 0 && (
          <section className="home-screen__section" aria-label="Needs attention">
            <SectionHeader title="Needs attention" />
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
          <SectionHeader
            title="Recent saves"
            action={
              docs.length > 5 ? (
                <button type="button" className="home-screen__link" onClick={onViewAll}>
                  View all
                </button>
              ) : null
            }
          />
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

        <section className="home-screen__section" aria-label="Smart collections">
          <SectionHeader title="Smart collections" />
          <div className="home-collections">
            {SMART_COLLECTIONS.map((name) => (
              <Chip key={name} onClick={() => onCollection?.(name)}>
                {name}
              </Chip>
            ))}
          </div>
        </section>

        {onOpenLists && (
          <section className="shared-lists-card" aria-label="Shared lists">
            <h3 className="shared-lists-card__title">Shared lists</h3>
            <p className="shared-lists-card__body">
              Create a small checklist with someone you trust. Your private vault stays local unless you explicitly share something.
            </p>
            <Button variant="secondary" size="sm" onClick={onOpenLists}>
              Open shared lists
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}
