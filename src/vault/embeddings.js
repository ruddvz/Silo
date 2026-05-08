/** @type {Promise<import('@xenova/transformers').FeatureExtractionPipeline | null> | null} */
let extractorPromise = null;

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

/**
 * Start loading the embedder in the background; failures resolve to null (full-text-only search).
 */
export function warmUpEmbeddingModel() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      try {
        const { pipeline, env } = await import("@xenova/transformers");
        env.allowLocalModels = true;
        env.useBrowserCache = true;
        return await pipeline("feature-extraction", MODEL_ID, {
          dtype: "q8",
        });
      } catch {
        return null;
      }
    })();
  }
  return extractorPromise;
}

/**
 * Lazy-load sentence-transformers style model (384-dim, normalized).
 * @returns {Promise<import('@xenova/transformers').FeatureExtractionPipeline | null>}
 */
export async function getTextEmbedder() {
  return warmUpEmbeddingModel();
}

/**
 * @param {string} text
 * @returns {Promise<Float32Array>}
 */
export async function embedText(text) {
  const t = text.trim().slice(0, 8000);
  if (!t) {
    return new Float32Array(384);
  }
  const extractor = await getTextEmbedder();
  if (!extractor) {
    return null;
  }
  const out = await extractor(t, { pooling: "mean", normalize: true });
  const data = out?.data;
  if (data instanceof Float32Array) return new Float32Array(data);
  if (data) return Float32Array.from(data);
  return new Float32Array(384);
}

export const EMBEDDING_DIM = 384;
