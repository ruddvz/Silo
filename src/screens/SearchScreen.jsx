import { useMemo } from "react";
import { SearchBar } from "../components/SearchBar.jsx";
import { DocumentList } from "../components/DocumentList.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { VaultSkeletonList } from "../components/VaultSkeletonList.jsx";
import { Chip } from "../components/ui/Chip.jsx";

const SUGGESTIONS = ["passport", "rent", "bank", "screenshots", "voice memo"];
const FILTERS = ["All", "PDF", "Images", "Notes", "Voice", "Identity", "Finance", "Housing", "Local", "Linked", "Encrypted"];

/**
 * @param {{
 *   query: string,
 *   onQueryChange: (q: string) => void,
 *   onSearchBlur: () => void,
 *   display: Record<string, object>,
 *   contentById: Record<string, string>,
 *   vaultListLoading: boolean,
 *   embeddingSearchBusy: boolean,
 *   semanticSearchEnabled: boolean,
 *   embeddingModelReady: boolean,
 *   searchFilter: string,
 *   onSearchFilter: (f: string) => void,
 *   onDocOpen: (doc: object) => void,
 *   onPointerDown: (doc: object, e: import('react').PointerEvent) => void,
 *   onPointerUp: (doc: object) => void,
 *   onPointerCancel: () => void,
 *   onSwipeDelete: (doc: object) => void,
 *   onCardKeyDown: (doc: object, e: import('react').KeyboardEvent) => void,
 *   onAddNote?: () => void,
 *   onClearSearch?: () => void,
 * }} props
 */
export function SearchScreen({
  query,
  onQueryChange,
  onSearchBlur,
  display,
  contentById,
  vaultListLoading,
  embeddingSearchBusy,
  semanticSearchEnabled,
  embeddingModelReady,
  searchFilter,
  onSearchFilter,
  onDocOpen,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onSwipeDelete,
  onCardKeyDown,
  onAddNote,
  onClearSearch,
}) {
  const items = useMemo(() => Object.values(display).flat(), [display]);

  const filtered = items.filter((doc) => {
    if (searchFilter === "All") return true;
    const k = doc.kind || "file";
    if (searchFilter === "PDF") return k === "pdf";
    if (searchFilter === "Images") return k === "image";
    if (searchFilter === "Notes") return k === "text" || k === "note";
    if (searchFilter === "Voice") return k === "audio";
    if (searchFilter === "Identity") return doc.tag === "Identity";
    if (searchFilter === "Finance") return doc.tag === "Finance";
    if (searchFilter === "Housing") return doc.tag === "Housing";
    if (searchFilter === "Local") return doc.storage !== "linked";
    if (searchFilter === "Linked") return doc.storage === "linked";
    if (searchFilter === "Encrypted") return doc.encrypted === true;
    return true;
  });

  const groupedDisplay = useMemo(() => {
    return filtered.reduce((acc, doc) => {
      const tag = doc.tag || "Unsorted";
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(doc);
      return acc;
    }, /** @type {Record<string, object[]>} */ ({}));
  }, [filtered]);

  return (
    <div className="search-screen">
      <div className="search-screen__sticky">
        <SearchBar
          value={query}
          onChange={onQueryChange}
          onBlur={onSearchBlur}
          isSearching={embeddingSearchBusy && !!query.trim()}
          semanticReady={!semanticSearchEnabled || embeddingModelReady}
          semanticLabel={
            semanticSearchEnabled
              ? embeddingModelReady
                ? "Semantic ✓"
                : "Preparing smart search…"
              : "Keywords only"
          }
          placeholder="Search files, notes, text, screenshots…"
          resultCount={query.trim() ? filtered.length : null}
        />

        <div className="search-screen__filters" role="toolbar" aria-label="Filter results">
          {FILTERS.map((f) => (
            <Chip key={f} active={searchFilter === f} onClick={() => onSearchFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </div>

      {!query.trim() && (
        <div className="search-screen__suggestions" role="group" aria-label="Suggestions">
          {SUGGESTIONS.map((s) => (
            <Chip key={s} onClick={() => onQueryChange(s)}>
              {s}
            </Chip>
          ))}
        </div>
      )}

      {semanticSearchEnabled && !embeddingModelReady && (
        <p className="search-screen__hint" role="status">
          Preparing smart search… Filename and text search still work now.
        </p>
      )}

      {query.trim() && !vaultListLoading && (
        <p className="search-screen__count" role="status">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </p>
      )}

      <div className="search-screen__results" role="listbox" aria-label="Search results" aria-busy={vaultListLoading}>
        {vaultListLoading ? (
          <VaultSkeletonList rows={6} />
        ) : !query.trim() ? (
          <EmptyState variant="search-idle" />
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="search"
            onAction={(action) => {
              if (action === "clear") onClearSearch?.();
              if (action === "note") onAddNote?.();
            }}
          />
        ) : (
          <DocumentList
            display={groupedDisplay}
            query={query}
            contentById={contentById}
            cardVariant="searchResult"
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
