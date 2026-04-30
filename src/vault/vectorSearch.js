/** @param {Float32Array} a @param {Float32Array} b */
export function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 1e-12 ? dot / denom : 0;
}

/**
 * @param {Record<string, Float32Array>} embeddingById
 * @param {Float32Array} queryVec
 * @param {number} minSim
 * @param {number} limit
 * @returns {Set<string>}
 */
export function topMatchingDocIds(embeddingById, queryVec, minSim, limit) {
  const scored = [];
  for (const [docId, vec] of Object.entries(embeddingById)) {
    if (!vec || vec.length !== queryVec.length) continue;
    const s = cosineSimilarity(queryVec, vec);
    if (s >= minSim) scored.push([docId, s]);
  }
  scored.sort((x, y) => y[1] - x[1]);
  return new Set(scored.slice(0, limit).map(([id]) => id));
}
