import { SearchBar } from "../components/SearchBar.jsx";
import { DocumentList } from "../components/DocumentList.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { VaultSkeletonList } from "../components/VaultSkeletonList.jsx";
import { Chip } from "../components/ui/Chip.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";

const SUGGESTIONS = ["passport", "rent", "bank", "screenshots"];
const FILTERS = ["All", "PDFs", "Images", "Notes", "Audio"];

/**
 * @param {{
 *   query: string,
 *   onQueryChange: (q: string) => void,
 *   onSearchBlur: () => void,
 *   display: Record<string, object>,
 *   contentById: Record<string, string>,
 *   hasResults: boolean,
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
}) {
  const items = Object.values(display);

  const filtered = items.filter((doc) => {
    if (searchFilter === "All") return true;
    const k = doc.kind || "file";
    if (searchFilter === "PDFs") return k === "pdf";
    if (searchFilter === "Images") return k === "image";
    if (searchFilter === "Notes") return k === "text" || k === "note";
    if (searchFilter === "Audio") return k === "audio";
    return true;
  });

  return (
    <div className="search-screen">
      <SectionHeader title="Search Silo" />
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
              : "Loading AI…"
            : ""
        }
        placeholder="Search anything in Silo"
        resultCount={query.trim() ? filtered.length : null}
      />

      {!query.trim() && (
        <div className="search-screen__suggestions" role="group" aria-label="Suggestions">
          {SUGGESTIONS.map((s) => (
            <Chip key={s} onClick={() => onQueryChange(s)}>
              {s}
            </Chip>
          ))}
        </div>
      )}

      <div className="search-screen__filters" role="toolbar" aria-label="Filter results">
        {FILTERS.map((f) => (
          <Chip key={f} active={searchFilter === f} onClick={() => onSearchFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>

      {!semanticSearchEnabled || embeddingModelReady ? null : (
        <p className="search-screen__hint" role="status">
          Semantic search is getting ready. Filename and text search still work now.
        </p>
      )}

      <div className="search-screen__results" role="listbox" aria-label="Search results" aria-busy={vaultListLoading}>
        {vaultListLoading ? (
          <VaultSkeletonList rows={6} />
        ) : !query.trim() ? (
          <EmptyState variant="search-idle" onAction={() => {}} />
        ) : filtered.length === 0 ? (
          <EmptyState variant="search" onAction={() => {}} />
        ) : (
          <DocumentList
            display={Object.fromEntries(filtered.map((d) => [d.id, d]))}
            query={query}
            contentById={contentById}
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
