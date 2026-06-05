import { useEffect, useMemo, useState } from "react";
import { buildVaultSearchIndex } from "../vault/searchIndex.js";
import { topMatchingDocIds } from "../vault/vectorSearch.js";
import { mergeSearchIds } from "../vault/hybridSearch.js";
import { TAG_META } from "../lib/vaultTags.js";
import { buildCombinedIndexText, SMART_VIEWS } from "../lib/vaultDocs.js";

/**
 * Vault full-text + optional semantic search, display grouping, duplicate detection.
 */
export function useVaultSearch({
  docs,
  contentById,
  query,
  activeTag,
  smartView,
  semanticSearchEnabled,
  embeddingsById,
}) {
  const searchIndex = useMemo(() => {
    const rows = docs.map((d) => ({
      id: String(d.id),
      name: d.name,
      tag: d.tag,
      kind: d.kind || "pdf",
      content: buildCombinedIndexText(d, contentById[d.id] ?? ""),
    }));
    return buildVaultSearchIndex(rows);
  }, [docs, contentById]);

  const [queryVec, setQueryVec] = useState(null);
  const [embeddingSearchBusy, setEmbeddingSearchBusy] = useState(false);

  useEffect(() => {
    const t = query.trim();
    if (!t || !semanticSearchEnabled) {
      setQueryVec(null);
      setEmbeddingSearchBusy(false);
      return;
    }
    setEmbeddingSearchBusy(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { embedText } = await import("../vault/embeddings.js");
          const v = await embedText(t);
          if (!cancelled) setQueryVec(v);
        } catch {
          if (!cancelled) setQueryVec(null);
        } finally {
          if (!cancelled) setEmbeddingSearchBusy(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, semanticSearchEnabled]);

  const duplicateHashes = useMemo(() => {
    const counts = new Map();
    for (const d of docs) {
      if (d.source !== "local" || !d.contentHash) continue;
      counts.set(d.contentHash, (counts.get(d.contentHash) || 0) + 1);
    }
    const dup = new Set();
    for (const [h, c] of counts) if (c > 1) dup.add(h);
    return dup;
  }, [docs]);

  const duplicateFingerprints = useMemo(() => {
    const counts = new Map();
    for (const d of docs) {
      if (d.source !== "local" || !d.textFingerprint) continue;
      counts.set(d.textFingerprint, (counts.get(d.textFingerprint) || 0) + 1);
    }
    const dup = new Set();
    for (const [h, c] of counts) if (c > 1) dup.add(h);
    return dup;
  }, [docs]);

  const display = useMemo(() => {
    const q = query.trim();
    let idSet = null;
    if (q) {
      const textIds = searchIndex.matchingDocIds(q);
      const hasEmb = Object.keys(embeddingsById).length > 0;
      if (semanticSearchEnabled && queryVec && hasEmb) {
        const vecIds = topMatchingDocIds(embeddingsById, queryVec, 0.28, 120);
        idSet = mergeSearchIds(textIds, vecIds, 0.42);
      } else {
        idSet = textIds;
      }
    }
    const filtered = docs.filter((d) => {
      const tagOk = activeTag === "All" || d.tag === activeTag;
      const idOk = idSet == null || idSet.has(String(d.id));
      if (!tagOk || !idOk) return false;
      if (!smartView) return true;
      const sv = SMART_VIEWS.find((s) => s.id === smartView);
      if (!sv) return true;
      const ctx = { contentById, duplicateHashes, duplicateFingerprints };
      return sv.match(d, ctx);
    });
    const tagOrder = Object.keys(TAG_META);
    const extra = [...new Set(filtered.map((d) => d.tag))].filter((t) => !TAG_META[t]).sort();
    const orderedTags = [...tagOrder.filter((t) => filtered.some((d) => d.tag === t)), ...extra];
    return orderedTags.reduce((acc, tag) => {
      const items = filtered.filter((doc) => doc.tag === tag);
      if (items.length) acc[tag] = items;
      return acc;
    }, {});
  }, [
    docs,
    activeTag,
    query,
    searchIndex,
    embeddingsById,
    queryVec,
    smartView,
    contentById,
    duplicateHashes,
    duplicateFingerprints,
    semanticSearchEnabled,
  ]);

  return {
    searchIndex,
    display,
    queryVec,
    setQueryVec,
    embeddingSearchBusy,
    duplicateHashes,
    duplicateFingerprints,
  };
}
