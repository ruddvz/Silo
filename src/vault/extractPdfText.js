import * as pdfjs from "pdfjs-dist";

// Vite resolves this to a URL the worker can load from the app's origin
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_CHARS = 120_000;

/**
 * @param {ArrayBuffer} buffer
 * @returns {Promise<string>}
 */
export async function extractTextFromPdfBuffer(buffer) {
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const parts = [];
  let total = 0;
  for (let p = 1; p <= pdf.numPages; p++) {
    if (total >= MAX_CHARS) break;
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const str = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (str) {
      parts.push(str);
      total += str.length + 1;
    }
  }
  return parts.join("\n").slice(0, MAX_CHARS);
}
