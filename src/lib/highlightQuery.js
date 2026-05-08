function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {string} snippet @param {string} q */
export function highlightQuery(snippet, q) {
  const t = (snippet || "").slice(0, 220);
  const plain = escapeHtml(t);
  const w = q.trim().split(/\s+/).filter(Boolean)[0];
  if (!w || w.length < 2) return plain;
  const lower = t.toLowerCase();
  const idx = lower.indexOf(w.toLowerCase());
  if (idx < 0) return plain;
  const before = escapeHtml(t.slice(0, idx));
  const mid = escapeHtml(t.slice(idx, idx + w.length));
  const after = escapeHtml(t.slice(idx + w.length));
  return `${before}<mark>${mid}</mark>${after}`;
}
