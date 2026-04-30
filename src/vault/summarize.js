/** Simple extractive "summary" — first sentences within maxLen. */
export function summarizeExtractive(text, maxLen = 280) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const parts = t.split(/(?<=[.!?])\s+/);
  let out = "";
  for (const p of parts) {
    if ((out + p).length > maxLen) break;
    out = out ? `${out} ${p}` : p;
  }
  return out.slice(0, maxLen) || t.slice(0, maxLen);
}
