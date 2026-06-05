/**
 * v2 → v3: normalize entry shape (kind, storage, string ids).
 * @param {FileSystemDirectoryHandle} _vault
 * @param {object} data
 */
export async function migrateV2ToV3(_vault, data) {
  const entries = (Array.isArray(data.entries) ? data.entries : []).map((raw) => {
    const id = String(raw.id);
    let kind = raw.kind;
    if (!kind) {
      const n = String(raw.name || "").toLowerCase();
      if (n.endsWith(".pdf")) kind = "pdf";
      else if (/\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(n)) kind = "image";
      else if (/\.(m4a|aac|mp3|wav|webm|ogg|opus|flac)$/i.test(n)) kind = "audio";
      else if (/\.(txt|md)$/i.test(n)) kind = "text";
      else kind = "file";
    }
    return {
      ...raw,
      id,
      kind,
      storage: raw.storage === "linked" ? "linked" : "opfs",
      sizeBytes: Number(raw.sizeBytes) || 0,
    };
  });
  return { ...data, version: 3, entries };
}
