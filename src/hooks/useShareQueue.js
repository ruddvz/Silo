import { useState, useRef, useEffect, useCallback } from "react";
import {
  removePendingShare,
  getAllPendingShares,
  recordShareImportFailure,
  clearAllPendingShares,
  getShareQueueStats,
  requestShareQueueBackgroundSync,
} from "../vault/shareQueue.js";
import {
  persistVaultBlob,
  loadManifest,
  saveManifest,
} from "../vault/opfs.js";
import { sha256HexFromBlob } from "../vault/fileHash.js";
import { textContentFingerprint } from "../vault/textFingerprint.js";
import { formatRelativeDate, formatBytes } from "../lib/vaultFormat.js";
import { inferTagForNote } from "../lib/vaultTags.js";
import { mergeDocs } from "../lib/vaultDocs.js";

/**
 * Share-target queue: polling, background sync, and import processing.
 * @param {{
 *   opfsReady: boolean,
 *   ingestBusy: boolean,
 *   setIngestBusy: (v: boolean) => void,
 *   ensureVault: () => Promise<FileSystemDirectoryHandle | null>,
 *   ingestFromFile: (file: File, options: object) => Promise<boolean>,
 *   indexAndPersistEmbedding: (vault: FileSystemDirectoryHandle, id: string, row: object, text: string) => Promise<void>,
 *   showToast: (msg: string) => void,
 *   isDuplicateContent: (vault: FileSystemDirectoryHandle, meta: object) => Promise<boolean>,
 *   setDocs: import("react").Dispatch<import("react").SetStateAction<object[]>>,
 * }} deps
 */
export function useShareQueue({
  opfsReady,
  ingestBusy,
  setIngestBusy,
  ensureVault,
  ingestFromFile,
  indexAndPersistEmbedding,
  showToast,
  isDuplicateContent,
  setDocs,
}) {
  const [importQueueCount, setImportQueueCount] = useState(0);
  const [shareQueueFailedCount, setShareQueueFailedCount] = useState(0);
  const [shareListItems, setShareListItems] = useState([]);
  const [sharePanelDismissed, setSharePanelDismissed] = useState(false);
  const processAllPendingSharesRef = useRef(async () => {});

  const refreshShareQueueCount = useCallback(async () => {
    try {
      const { total, failed } = await getShareQueueStats();
      setImportQueueCount(total);
      setShareQueueFailedCount(failed);
      const all = await getAllPendingShares();
      setShareListItems(all);
    } catch {
      setImportQueueCount(0);
      setShareQueueFailedCount(0);
      setShareListItems([]);
    }
  }, []);

  useEffect(() => {
    void refreshShareQueueCount();
    const id = setInterval(() => { void refreshShareQueueCount(); }, 5000);
    return () => clearInterval(id);
  }, [refreshShareQueueCount]);

  useEffect(() => {
    setSharePanelDismissed(false);
  }, [importQueueCount]);

  const processAllPendingShares = useCallback(async (onlyId) => {
    const vault = await ensureVault();
    if (!vault) return;
    const allRaw = await getAllPendingShares();
    const all = onlyId ? allRaw.filter((r) => r.id === onlyId) : allRaw;
    if (!all.length) return;
    setIngestBusy(true);
    let ok = 0;
    try {
      for (const rec of all) {
        let succeeded = false;
        let lastErr = null;
        try {
          const files = rec.files || [];
          let fileAdded = 0;
          for (const fm of files) {
            try {
              const buf = new Uint8Array(fm.buffer);
              const file = new File([buf], fm.name || "shared", { type: fm.type || "application/octet-stream" });
              const added = await ingestFromFile(file, { vault, storage: "opfs", fileHandle: null });
              if (added) fileAdded++;
            } catch (e) {
              lastErr = e;
            }
          }
          if (fileAdded > 0) succeeded = true;
          if (files.length > 0 && fileAdded === 0 && !lastErr) succeeded = true;

          const noteBody = [rec.title, rec.text, rec.url].filter(Boolean).join("\n").trim();
          if (noteBody) {
            try {
              const blob = new Blob([noteBody], { type: "text/plain;charset=utf-8" });
              let h = "";
              try { h = await sha256HexFromBlob(blob); } catch { h = ""; }
              let tf = "";
              try { tf = await textContentFingerprint(noteBody); } catch { tf = ""; }
              if (await isDuplicateContent(vault, { contentHash: h, textFingerprint: tf })) {
                succeeded = true;
              } else {
                const id = crypto.randomUUID();
                const createdAt = new Date().toISOString();
                const name = `Shared — ${noteBody.slice(0, 32)}${noteBody.length > 32 ? "…" : ""}.txt`;
                const tag = inferTagForNote(noteBody);
                await persistVaultBlob(vault, id, blob);
                const row = {
                  id, name, tag, kind: "text", storage: "opfs",
                  date: formatRelativeDate(createdAt), size: formatBytes(blob.size), source: "local", createdAt, sizeBytes: blob.size,
                  ...(h ? { contentHash: h } : {}),
                  ...(tf ? { textFingerprint: tf } : {}),
                };
                await indexAndPersistEmbedding(vault, id, row, noteBody);
                const entries = await loadManifest(vault);
                entries.push({
                  id, name, tag, kind: "text", createdAt, sizeBytes: blob.size, mimeType: "text/plain", storage: "opfs",
                  ...(h ? { contentHash: h } : {}),
                  ...(tf ? { textFingerprint: tf } : {}),
                });
                await saveManifest(vault, entries);
                setDocs((prev) => mergeDocs(prev, [row]));
                succeeded = true;
              }
            } catch (e) {
              lastErr = e;
            }
          }

          if (!files.length && !noteBody) succeeded = true;

          if (succeeded) {
            await removePendingShare(rec.id);
            ok++;
          } else if (lastErr) {
            throw lastErr;
          }
        } catch (e) {
          console.error("share row", e);
          const n = await recordShareImportFailure(rec.id, e?.message || String(e));
          void requestShareQueueBackgroundSync();
          if (n >= 5) {
            await removePendingShare(rec.id);
            showToast("Dropped share after 5 failed imports");
          } else {
            showToast(`Share import failed (${n}/5)`);
          }
        }
      }
      void refreshShareQueueCount();
      const params = new URLSearchParams(window.location.search);
      if (params.get("shareImport") || params.get("shareError")) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      if (ok) showToast(`Imported ${ok} shared item(s)`);
    } finally {
      setIngestBusy(false);
    }
  }, [ensureVault, ingestFromFile, indexAndPersistEmbedding, refreshShareQueueCount, showToast, isDuplicateContent, setDocs, setIngestBusy]);

  processAllPendingSharesRef.current = processAllPendingShares;

  useEffect(() => {
    const onSwMessage = (e) => {
      if (e.data?.type !== "SILO_PROCESS_SHARE_QUEUE") return;
      if (!opfsReady) return;
      void processAllPendingSharesRef.current();
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onSwMessage);
      return () => navigator.serviceWorker.removeEventListener("message", onSwMessage);
    }
    return undefined;
  }, [opfsReady]);

  useEffect(() => {
    if (!opfsReady) return;
    void processAllPendingShares(undefined);
  }, [opfsReady, processAllPendingShares]);

  const handleClearShareQueue = useCallback(async () => {
    await clearAllPendingShares();
    void refreshShareQueueCount();
    showToast("Share queue cleared");
  }, [refreshShareQueueCount, showToast]);

  const handleRetryShareImports = useCallback(async () => {
    if (!opfsReady) {
      showToast("Vault not ready");
      return;
    }
    if (ingestBusy) return;
    void requestShareQueueBackgroundSync();
    await processAllPendingShares(undefined);
    void refreshShareQueueCount();
  }, [opfsReady, ingestBusy, processAllPendingShares, refreshShareQueueCount, showToast]);

  return {
    importQueueCount,
    shareQueueFailedCount,
    shareListItems,
    sharePanelDismissed,
    setSharePanelDismissed,
    refreshShareQueueCount,
    processAllPendingShares,
    handleClearShareQueue,
    handleRetryShareImports,
  };
}
