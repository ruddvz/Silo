import { loadExtractedText, persistEmbedding } from "./opfs.js";
import { persistSecureText, decodeStoredText } from "./secureText.js";

/**
 * @param {FileSystemDirectoryHandle} vault
 * @param {import("./opfs.js").VaultManifestEntry} entry
 * @param {() => Promise<Blob | null>} getBlob
 * @param {string | null | undefined} vaultPassphrase
 */
export async function repairVaultEntry(vault, entry, getBlob, vaultPassphrase) {
  const id = String(entry.id);
  const kind = entry.kind || "file";
  const blob = await getBlob();
  let indexText = "";
  const raw = await loadExtractedText(vault, id);
  if (raw != null && raw !== "") {
    indexText = await decodeStoredText(raw, vaultPassphrase);
  }

  if ((!indexText || indexText === "") && blob) {
    if (kind === "pdf") {
      const buf = await blob.arrayBuffer();
      const { extractTextFromPdfBuffer } = await import("./extractPdfText.js");
      indexText = await extractTextFromPdfBuffer(buf);
    } else if (kind === "image") {
      const { extractTextFromImage } = await import("./ocrImage.js");
      indexText = await extractTextFromImage(blob);
      if (!indexText) indexText = `image screenshot ${entry.name}`;
    } else if (kind === "audio") {
      const { transcribeAudio } = await import("./transcribe.js");
      indexText = (await transcribeAudio(blob)).trim();
      if (!indexText) indexText = `voice note audio ${entry.name}`;
    } else if (kind === "text") {
      indexText = await blob.text();
    } else {
      indexText = `file attachment ${entry.mimeType || "binary"} ${entry.name}`;
    }
    await persistSecureText(vault, id, indexText, vaultPassphrase);
  }

  if (indexText) {
    const combined = `${entry.name} ${entry.tag} ${kind} ${indexText}`.trim();
    const { embedText } = await import("./embeddings.js");
    const vec = await embedText(combined);
    await persistEmbedding(vault, id, vec);
  }
}
