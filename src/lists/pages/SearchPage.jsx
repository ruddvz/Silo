import { useState, useMemo } from "react";
import { ListsTopNav } from "../components/ListsTopNav.jsx";
import * as api from "../lib/api.js";

const RECENT_KEY = "silo_lists_recent_searches";

/**
 * @param {{ user: object, onOpenList: (id: string) => void }} props
 */
export function SearchPage({ onOpenList }) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return api.searchLists(query);
  }, [query]);

  function runSearch(q) {
    setQuery(q);
    if (!q.trim()) return;
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  }

  return (
    <>
      <ListsTopNav title="Search" />
      <div className="lists-app__scroll">
        <input
          className="lists-field"
          placeholder="Search lists and text…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
        />
        {!query && recent.length > 0 && (
          <>
            <p style={{ fontWeight: 600, fontSize: 13, color: "var(--lists-text-secondary)" }}>Recent</p>
            {recent.map((r) => (
              <button key={r} type="button" className="lists-settings-row" onClick={() => runSearch(r)}>
                {r}
              </button>
            ))}
          </>
        )}
        {results.length > 0 && (
          <>
            <p style={{ fontWeight: 600, fontSize: 13, color: "var(--lists-text-secondary)", marginTop: 16 }}>Results</p>
            {results.map((hit, i) => (
              <button
                key={`${hit.file.id}-${hit.type}-${i}`}
                type="button"
                className="lists-card lists-card--tap"
                style={{ marginBottom: 10 }}
                onClick={() => onOpenList(hit.file.id)}
              >
                <strong>{hit.type === "item" ? hit.item?.text || hit.snippet : hit.file.title}</strong>
                <div className="lists-file-card__meta">in {hit.file.title}</div>
              </button>
            ))}
          </>
        )}
        {query && results.length === 0 && <div className="lists-empty">No matches for “{query}”</div>}
      </div>
    </>
  );
}
