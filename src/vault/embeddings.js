/** @type {import('@xenova/transformers').FeatureExtractionPipeline | null} */
let extractorPromise = null;

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

/**
 * Lazy-load sentence-transformers style model (384-dim, normalized).
 * @returns {Promise<import('@xenova/transformers').FeatureExtractionPipeline>}
 */
export async function getTextEmbedder() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = true;
      env.useBrowserCache = true;
      return pipeline("feature-extraction", MODEL_ID, {
        dtype: "q8",
      });
    })();
  }
  return extractorPromise;
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
  const out = await extractor(t, { pooling: "mean", normalize: true });
  const data = out?.data;
  if (data instanceof Float32Array) return new Float32Array(data);
  if (data) return Float32Array.from(data);
  return new Float32Array(384);
}

export const EMBEDDING_DIM = 384;
