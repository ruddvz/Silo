/**
 * @param {Set<string>} textIds
 * @param {Set<string>} vectorIds
 * @param {number} textWeight 0..1
 */
export function mergeSearchIds(textIds, vectorIds, textWeight = 0.45) {
  const merged = new Set([...textIds, ...vectorIds]);
  if (merged.size === 0) return merged;
  const scores = new Map();
  for (const id of textIds) scores.set(id, (scores.get(id) || 0) + textWeight);
  for (const id of vectorIds) scores.set(id, (scores.get(id) || 0) + (1 - textWeight));
  const ranked = [...merged].sort((a, b) => (scores.get(b) || 0) - (scores.get(a) || 0));
  return new Set(ranked);
}
