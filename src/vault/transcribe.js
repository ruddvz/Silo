/** @type {Promise<import('@xenova/transformers').AutomaticSpeechRecognitionPipeline> | null} */
let asrPromise = null;

const WHISPER_MODEL = "Xenova/whisper-tiny.en";

/**
 * @returns {Promise<import('@xenova/transformers').AutomaticSpeechRecognitionPipeline>}
 */
async function getWhisper() {
  if (!asrPromise) {
    asrPromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = true;
      env.useBrowserCache = true;
      return pipeline("automatic-speech-recognition", WHISPER_MODEL);
    })();
  }
  return asrPromise;
}

/**
 * @param {Blob | File} audioBlob
 * @returns {Promise<string>}
 */
export async function transcribeAudio(audioBlob) {
  const transcriber = await getWhisper();
  const url = URL.createObjectURL(audioBlob);
  try {
    const result = await transcriber(url);
    if (typeof result === "string") return result;
    if (result?.text) return String(result.text);
    if (Array.isArray(result?.chunks)) {
      return result.chunks.map((c) => c.text).join(" ").trim();
    }
    return "";
  } finally {
    URL.revokeObjectURL(url);
  }
}
