/**
 * Explain why a document matched a search query (keyword leg).
 * @param {object} doc
 * @param {string} query
 * @param {string} content
 */
export function explainSearchMatch(doc, query, content) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const terms = q.split(/\s+/).filter(Boolean);
  const name = String(doc.name || "").toLowerCase();
  const tag = String(doc.tag || "").toLowerCase();
  const body = String(content || "").toLowerCase();

  if (terms.every((t) => name.includes(t))) return "Matched filename";
  if (terms.some((t) => tag.includes(t))) return "Matched category";
  if (terms.some((t) => body.includes(t))) return "Matched extracted text";
  if (name.includes(q)) return "Matched filename";
  return "Matched index";
}
