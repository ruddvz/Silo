/**
 * Placeholder rows while OPFS manifest and text are loading.
 * @param {{ rows?: number }} props
 */
export function VaultSkeletonList({ rows = 6 }) {
  return (
    <div className="skeleton-list" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  );
}
