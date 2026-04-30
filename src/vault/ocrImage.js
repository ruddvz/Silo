import Tesseract from "tesseract.js";

/**
 * @param {Blob | File} imageBlob
 * @param {(m: string) => void} [onProgress]
 * @returns {Promise<string>}
 */
export async function extractTextFromImage(imageBlob, onProgress) {
  const { data } = await Tesseract.recognize(imageBlob, "eng", {
    logger: (m) => {
      if (onProgress && m.status === "recognizing text") onProgress(m.progress);
    },
  });
  return (data?.text || "").replace(/\s+/g, " ").trim();
}
