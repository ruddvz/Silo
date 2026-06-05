import { QuickCaptureCard } from "./QuickCaptureCard.jsx";
import { DocumentCard } from "./DocumentCard.jsx";
import { SectionHeader } from "./ui/SectionHeader.jsx";
import { Chip } from "./ui/Chip.jsx";
import { Button } from "./ui/Button.jsx";
import { IconSearch } from "./ui/icons.jsx";

const SMART_COLLECTIONS = [
  "All",
  "Recent",
  "Identity",
  "Finance",
  "Housing",
  "Voice",
  "Screenshots",
  "Images",
  "PDFs",
  "Notes",
  "Large files",
  "Needs backup",
];

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
      <section className="home-status-card" aria-label="Vault status">
        <div className="home-status-card__pill">{vaultStatusLabel}</div>
        <h2 className="home-status-card__title">Your private vault</h2>
        <p className="home-status-card__body">
          {docs.length === 0
            ? "Save your first file, note, photo, or voice memo. Silo keeps it searchable on this device."
            : `${docs.length} items indexed locally. ${backupRecommended ? "Consider backing up soon." : vaultMeta.split("·").slice(1).join("·").trim() || "Everything stays on this device."}`}
        </p>
        {backupRecommended && (
          <Button variant="secondary" size="sm" onClick={onBackup}>
            Back up now
          </Button>
        )}
        <div className="home-status-card__stats">
          <div className="home-status-card__stat">
            <span className="home-status-card__stat-value">{docs.length}</span>
            <span className="home-status-card__stat-label">Items</span>
          </div>
          <div className="home-status-card__stat">
            <span className="home-status-card__stat-value">{Object.keys(contentById).length}</span>
            <span className="home-status-card__stat-label">Indexed</span>
          </div>
          <div className="home-status-card__stat">
            <span className="home-status-card__stat-value">{backupRecommended ? "None" : "Saved"}</span>
            <span className="home-status-card__stat-label">Backup</span>
          </div>
        </div>
      </section>

      <QuickCaptureCard
        disabled={ingestBusy}
        onAddFile={onAddFile}
        onAddPhoto={onAddPhoto}
        onAddNote={onAddNote}
        onAddVoice={onAddVoice}
      />

      <div className="home-search-entry">
        <button type="button" className="home-search-entry__btn" onClick={onSearch}>
          <IconSearch size={20} />
          <span className="home-search-entry__text">Search files, notes, text, screenshots…</span>
          <span className="home-search-entry__kbd" aria-hidden>
            ⌘K
          </span>
        </button>
      </div>

      <section className="home-screen__section" aria-label="Smart collections">
        <SectionHeader title="Smart collections" />
        <div className="home-collections home-collections--scroll">
          {SMART_COLLECTIONS.map((name) => (
            <Chip key={name} onClick={() => onCollection?.(name)}>
              {name}
            </Chip>
          ))}
        </div>
      </section>

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

      <section className="home-screen__section" aria-label="Recent items">
        <SectionHeader
          title="Recent items"
          action={
            docs.length > 5 ? (
              <button type="button" className="home-screen__link" onClick={onViewAll}>
                View all
              </button>
            ) : null
          }
        />
        {recent.length === 0 ? (
          <p className="home-screen__empty">
            Add a file, screenshot, note, or voice memo. Silo will keep it searchable on this device.
          </p>
        ) : (
          <div className="home-screen__recent">
            {recent.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                variant="compact"
                query=""
                snippet={(contentById[doc.id] || "").slice(0, 80)}
                onActivate={onOpenDoc}
              />
            ))}
          </div>
        )}
      </section>

      <section className="home-privacy-note" aria-label="Privacy">
        <p>Files, notes, screenshots, and voice memos stay on this device. No account required.</p>
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
  );
}
