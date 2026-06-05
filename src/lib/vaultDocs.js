export function buildCombinedIndexText(doc, content) {
  const k = doc.kind || "pdf";
  const base = `${doc.name} ${doc.tag} ${k}`;
  return `${base} ${content || ""}`.trim();
}

export function mergeDocs(seed, local) {
  const byId = new Map();
  for (const d of seed) byId.set(String(d.id), d);
  for (const d of local) byId.set(String(d.id), d);
  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
}

function daysSince(iso) {
  const t = new Date(iso || 0).getTime();
  if (!Number.isFinite(t)) return 999;
  return (Date.now() - t) / (86400 * 1000);
}

export const SMART_VIEWS = [
  { id: "Recent", label: "Recent", match: (d) => daysSince(d.createdAt) <= 7 },
  { id: "Voice", label: "Voice", match: (d) => (d.kind || "") === "audio" },
  {
    id: "Screenshots",
    label: "Shots",
    match: (d, ctx) =>
      (d.kind || "") === "image" || /screenshot|screen\s*shot/i.test(d.name + (ctx.contentById?.[d.id] || "")),
  },
  {
    id: "LowOCR",
    label: "Low OCR",
    match: (d, ctx) => (d.kind || "") === "image" && String(ctx.contentById?.[d.id] || "").trim().length < 24,
  },
  {
    id: "Duplicates",
    label: "Dupes",
    match: (d, ctx) =>
      d.source === "local"
      && ((d.contentHash && ctx.duplicateHashes?.has(d.contentHash))
        || (d.textFingerprint && ctx.duplicateFingerprints?.has(d.textFingerprint))),
  },
];

export function supportsDirectoryPicker() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}
