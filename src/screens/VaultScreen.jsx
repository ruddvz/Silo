import { DocumentList } from "../components/DocumentList.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { VaultSkeletonList } from "../components/VaultSkeletonList.jsx";
import { Chip } from "../components/ui/Chip.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { IconVault, IconShield, IconSearch, IconFile } from "../components/ui/icons.jsx";

/**
 * @param {{
 *   itemCount: number,
 *   totalGB: string,
 *   vaultStatusLabel?: string,
 *   backupLabel?: string,
 *   passphraseSet?: boolean,
 *   indexReady?: boolean,
 *   tags: string[],
 *   activeTag: string,
 *   onTag: (tag: string) => void,
 *   display: Record<string, object>,
 *   query: string,
 *   contentById: Record<string, string>,
 *   hasResults: boolean,
 *   vaultListLoading: boolean,
 *   emptyVariant: string,
 *   ingestBusy: boolean,
 *   onOpenCapture: () => void,
 *   onDocOpen: (doc: object) => void,
 *   onPointerDown: (doc: object, e: import('react').PointerEvent) => void,
 *   onPointerUp: (doc: object) => void,
 *   onPointerCancel: () => void,
 *   onSwipeDelete: (doc: object) => void,
 *   onCardKeyDown: (doc: object, e: import('react').KeyboardEvent) => void,
 * }} props
 */
export function VaultScreen({
  itemCount,
  totalGB,
  vaultStatusLabel = "Private on this device",
  backupLabel = "No backup yet",
  passphraseSet = false,
  indexReady = true,
  tags,
  activeTag,
  onTag,
  display,
  query,
  contentById,
  hasResults,
  vaultListLoading,
  emptyVariant,
  ingestBusy,
  onOpenCapture,
  onDocOpen,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onSwipeDelete,
  onCardKeyDown,
}) {
  return (
    <div className="vault-screen">
      <SectionHeader
        title="Vault"
        subtitle={`${itemCount} items · ${vaultStatusLabel}`}
        action={
          <button type="button" className="ui-button ui-button--secondary ui-button--sm" disabled={ingestBusy} onClick={onOpenCapture}>
            Add
          </button>
        }
      />

      <div className="vault-screen__status-grid">
        <div className="vault-mini-card">
          <IconVault size={24} className="vault-mini-card__icon" />
          <span className="vault-mini-card__value">{vaultStatusLabel}</span>
          <span className="vault-mini-card__label">Local storage</span>
        </div>
        <div className="vault-mini-card">
          <IconFile size={24} className="vault-mini-card__icon" />
          <span className="vault-mini-card__value">{backupLabel}</span>
          <span className="vault-mini-card__label">Backup</span>
        </div>
        <div className="vault-mini-card">
          <IconShield size={24} className="vault-mini-card__icon" />
          <span className="vault-mini-card__value">{passphraseSet ? "Set" : "Off"}</span>
          <span className="vault-mini-card__label">Passphrase</span>
        </div>
        <div className="vault-mini-card">
          <IconSearch size={24} className="vault-mini-card__icon" />
          <span className="vault-mini-card__value">{indexReady ? "Ready" : "Building…"}</span>
          <span className="vault-mini-card__label">Search index</span>
        </div>
      </div>

      <p className="vault-screen__summary">
        {itemCount} items · {totalGB} GB total
      </p>

      <div className="vault-screen__chips" role="toolbar" aria-label="Categories">
        {tags.map((tag) => (
          <Chip key={tag} active={activeTag === tag} onClick={() => onTag(tag)}>
            {tag}
          </Chip>
        ))}
      </div>

      <div className="vault-screen__list" role="listbox" aria-label="Documents" aria-busy={vaultListLoading}>
        {vaultListLoading ? (
          <VaultSkeletonList rows={8} />
        ) : !hasResults ? (
          <EmptyState
            variant={emptyVariant}
            onAction={(action) => {
              if (action === "ingest" || action === "ingest-audio") onOpenCapture();
            }}
          />
        ) : (
          <DocumentList
            display={display}
            query={query}
            contentById={contentById}
            cardVariant="comfortable"
            onDocOpen={onDocOpen}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onSwipeDelete={onSwipeDelete}
            onCardKeyDown={onCardKeyDown}
          />
        )}
      </div>
    </div>
  );
}
