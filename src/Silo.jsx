import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getVaultRoot,
  loadManifest,
  saveManifest,
  persistVaultBlob,
  loadExtractedText,
  deleteVaultItem,
  readVaultBlobFile,
  persistEmbedding,
  loadEmbedding,
  clearAllEmbeddingsForVault,
} from "./vault/opfs.js";
import {
  supportsNativeFileSystemLink,
  pickFilesFromDisk,
  storeLinkedFileHandle,
  getLinkedFile,
  removeLinkedFileHandle,
  clearAllLinkedFileHandles,
} from "./vault/nativeFileHandles.js";
import {
  removePendingShare,
  getAllPendingShares,
  recordShareImportFailure,
  clearAllPendingShares,
  getShareQueueStats,
  requestShareQueueBackgroundSync,
} from "./vault/shareQueue.js";
import { buildVaultZip, parseVaultZip, applyVaultZipToOpfs } from "./vault/exportBackup.js";
import { persistSecureText, decodeStoredText, isEncryptedStoredPayload, isPassphraseActive } from "./vault/secureText.js";
import { sha256HexFromBlob } from "./vault/fileHash.js";
import { textContentFingerprint } from "./vault/textFingerprint.js";
import { checkVaultHealth } from "./vault/health.js";
import { repairVaultEntry } from "./vault/repair.js";
import { VaultRecoveryScreen } from "./components/VaultRecoveryScreen.jsx";
import { summarizeExtractive } from "./vault/summarize.js";
import { SearchBar } from "./components/SearchBar.jsx";
import { DocumentList } from "./components/DocumentList.jsx";
import { EmptyState } from "./components/EmptyState.jsx";
import { IngestProgress } from "./components/IngestProgress.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { ShareQueue } from "./components/ShareQueue.jsx";
import { InstallBanner } from "./components/InstallBanner.jsx";
import { ConfirmDialog } from "./components/ConfirmDialog.jsx";
import { Banner } from "./components/Banner.jsx";
import { VaultSkeletonList } from "./components/VaultSkeletonList.jsx";
import { IngestDialog } from "./components/IngestDialog.jsx";
import { PreviewPanel } from "./components/PreviewPanel.jsx";
import { SettingsDrawer } from "./components/SettingsDrawer.jsx";
import { UnlockScreen } from "./components/UnlockScreen.jsx";
import { PrivacyModal } from "./components/PrivacyModal.jsx";
import { Toast } from "./components/Toast.jsx";
import { RenameModal } from "./components/RenameModal.jsx";
import { NoteModal } from "./components/NoteModal.jsx";
import { ContextMenu } from "./components/ContextMenu.jsx";
import { useStorageMode } from "./hooks/useStorageMode.js";
import { usePWAInstall, bumpMeaningfulInteraction } from "./hooks/usePWAInstall.js";
import { useVaultSearch } from "./hooks/useVaultSearch.js";
import { APP_ICON_SRC, DEFAULT_VAULT_FILE_ACCEPT, VAULT_FILE_ACCEPT_BY_KIND } from "./lib/vaultConstants.js";
import { formatBytes, formatRelativeDate, parseMB } from "./lib/vaultFormat.js";
import { ALL_TAGS, inferTagGuess, inferTagForNote } from "./lib/vaultTags.js";
import { mergeDocs, buildCombinedIndexText, SMART_VIEWS, supportsDirectoryPicker } from "./lib/vaultDocs.js";
import {
  SEED_DOCS,
  DEMO_INDEX_BOOST,
  DEMO_TEXT_BODY,
  isDemoDataEnabled,
  getInitialDemoDocs,
  getInitialDemoContentById,
} from "./data/demoVault.js";
import { hasCompletedOnboarding, markOnboardingComplete } from "./lib/onboarding.js";
import { OnboardingScreen } from "./components/OnboardingScreen.jsx";
import "./silo-app.css";

// ─── Main Component ───────────────────────────────────────────────────────────

/** @param {{ onOpenLists?: () => void }} props */
export default function Silo({ onOpenLists }) {
  const [activeTag,     setActiveTag]     = useState("All");
  const [query,         setQuery]         = useState("");
  const [docs,          setDocs]          = useState(() => getInitialDemoDocs());
  const [contentById,  setContentById]   = useState(() => getInitialDemoContentById());
  const [opfsReady,     setOpfsReady]     = useState(false);
  const [nativeLinkReady, setNativeLinkReady] = useState(false);
  const [ingestBusy,    setIngestBusy]    = useState(false);
  const [ingestError,   setIngestError]   = useState(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [embeddingsById, setEmbeddingsById] = useState({});

  const [contextMenu,   setContextMenu]   = useState(null);
  const [renameDoc,     setRenameDoc]     = useState(null);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [toast,         setToast]         = useState(null);
  const [vaultPassphrase, setVaultPassphrase] = useState(() => sessionStorage.getItem("silo_vault_pass") || "");
  const [smartView,     setSmartView]     = useState("");
  const [importQueueCount, setImportQueueCount] = useState(0);
  const [shareQueueFailedCount, setShareQueueFailedCount] = useState(0);
  const [vaultEpoch, setVaultEpoch] = useState(0);

  const pressTimer       = useRef(null);
  const blurTimer        = useRef(null);
  const vaultRef         = useRef(null);
  const vaultFileInputRef = useRef(null);
  const mainInnerRef = useRef(null);
  const ptrTouchStartY = useRef(null);
  const ptrPulling = useRef(false);
  const ptrLastDy = useRef(0);
  const [ptrBar, setPtrBar] = useState(0);
  const backupImportRef = useRef(null);
  const processAllPendingSharesRef = useRef(async () => {});
  const [mobileTab, setMobileTab] = useState("vault");
  const [ingestStage, setIngestStage] = useState(/** @type {string | null} */ (null));
  const [ingestOverlayName, setIngestOverlayName] = useState(/** @type {string | null} */ (null));
  const [confirmMergeOpen, setConfirmMergeOpen] = useState(false);
  const pendingMergeFilesRef = useRef(null);
  const [shareListItems, setShareListItems] = useState([]);
  const [embeddingModelReady, setEmbeddingModelReady] = useState(false);
  const [sharePanelDismissed, setSharePanelDismissed] = useState(false);
  const [semanticSearchEnabled, setSemanticSearchEnabled] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem("silo_semantic") !== "0",
  );
  const [vaultListLoading, setVaultListLoading] = useState(true);
  const [fileDropActive, setFileDropActive] = useState(false);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [ingestDialogOpen, setIngestDialogOpen] = useState(false);
  const [vaultUnlockGate, setVaultUnlockGate] = useState(false);
  const [unlockError, setUnlockError] = useState(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [theme, setTheme] = useState(() => (typeof localStorage !== "undefined" ? localStorage.getItem("silo_theme") : null) || "system");
  const [density, setDensity] = useState(
    () => (typeof localStorage !== "undefined" ? localStorage.getItem("silo_density") : null) || "comfortable",
  );
  const [storageStats, setStorageStats] = useState(/** @type {{ usage: number, quota: number } | null} */ (null));
  const [vaultHealthReport, setVaultHealthReport] = useState(/** @type {import("./vault/health.js").ReturnType<typeof checkVaultHealth> extends Promise<infer R> ? R | null : null} */ (null));
  const [showRecoveryScreen, setShowRecoveryScreen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(
    () => !hasCompletedOnboarding() && !isDemoDataEnabled(),
  );

  const storageMode = useStorageMode();
  const { showBanner: showInstallBanner, deferredPrompt, install: pwaInstall, dismiss: dismissInstallBanner } = usePWAInstall();

  useEffect(() => {
    try {
      localStorage.setItem("silo_theme", theme);
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      let t = theme;
      if (t === "system") t = mq.matches ? "dark" : "light";
      document.documentElement.dataset.theme = t === "light" ? "light" : "dark";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("silo_density", density);
    } catch {
      /* ignore */
    }
    document.documentElement.dataset.density = density === "compact" ? "compact" : "comfortable";
  }, [density]);

  useEffect(() => {
    if (!settingsOpen) return;
    void (async () => {
      try {
        const est = await navigator.storage?.estimate?.();
        if (est) setStorageStats({ usage: Number(est.usage) || 0, quota: Number(est.quota) || 0 });
      } catch {
        setStorageStats(null);
      }
    })();
  }, [settingsOpen]);

  useEffect(() => {
    setSharePanelDismissed(false);
  }, [importQueueCount]);

  useEffect(() => {
    if (vaultPassphrase) sessionStorage.setItem("silo_vault_pass", vaultPassphrase);
    else sessionStorage.removeItem("silo_vault_pass");
  }, [vaultPassphrase]);

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
    setNativeLinkReady(supportsNativeFileSystemLink());
  }, []);

  useEffect(() => {
    if (!ingestDialogOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setIngestDialogOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ingestDialogOpen]);

  useEffect(() => {
    void import("./vault/embeddings.js")
      .then((m) => m.warmUpEmbeddingModel())
      .then((ext) => {
        setEmbeddingModelReady(!!ext);
      });
  }, []);

  // ── Clean up timers on unmount ──
  useEffect(() => {
    return () => {
      clearTimeout(pressTimer.current);
      clearTimeout(blurTimer.current);
    };
  }, []);

  const showToast = useCallback((msg) => setToast(msg), []);

  /** Pull-to-refresh vault list on narrow viewports (reload manifest + OPFS rows). */
  useEffect(() => {
    const el = mainInnerRef.current;
    if (!el) return undefined;

    const mobileVault = () => window.matchMedia("(max-width: 899px)").matches;
    const PTR_RELEASE = 72;

    const onTouchStart = (e) => {
      if (!mobileVault()) return;
      if (ingestBusy || vaultUnlockGate) return;
      if (el.scrollTop > 2) return;
      ptrTouchStartY.current = e.touches[0].clientY;
      ptrPulling.current = true;
      ptrLastDy.current = 0;
    };

    const onTouchMove = (e) => {
      if (!mobileVault() || !ptrPulling.current || ptrTouchStartY.current == null) return;
      if (el.scrollTop > 2) {
        ptrPulling.current = false;
        ptrTouchStartY.current = null;
        setPtrBar(0);
        return;
      }
      const dy = e.touches[0].clientY - ptrTouchStartY.current;
      ptrLastDy.current = dy;
      if (dy > 12) {
        e.preventDefault();
        setPtrBar(Math.min(1, dy / (PTR_RELEASE * 1.4)));
      } else {
        setPtrBar(0);
      }
    };

    const onTouchEnd = () => {
      if (!ptrPulling.current || ptrTouchStartY.current == null) {
        ptrPulling.current = false;
        setPtrBar(0);
        return;
      }
      const dy = ptrLastDy.current;
      ptrPulling.current = false;
      ptrTouchStartY.current = null;
      setPtrBar(0);
      if (dy >= PTR_RELEASE && el.scrollTop <= 2) {
        setVaultEpoch((n) => n + 1);
        showToast("Vault refreshed");
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [ingestBusy, vaultUnlockGate, showToast]);

  // ── Load user vault from OPFS (manifest + extracted text) ──
  useEffect(() => {
    let cancelled = false;
    setVaultListLoading(true);
    void (async () => {
      try {
        const vault = await getVaultRoot();
        if (cancelled) return;
        if (!vault) {
          setOpfsReady(false);
          setVaultUnlockGate(false);
          return;
        }
        vaultRef.current = vault;
        setOpfsReady(true);
        const entries = await loadManifest(vault);
        if (cancelled || !entries.length) {
          setVaultUnlockGate(false);
          if (entries.length > 0) {
            markOnboardingComplete();
            setShowOnboarding(false);
          }
          return;
        }

        const localRows = [];
        const contentUpdates = {};
        let needsUnlock = false;
        for (const e of entries) {
          const raw = await loadExtractedText(vault, e.id);
          if (isEncryptedStoredPayload(raw ?? "") && !isPassphraseActive(vaultPassphrase)) {
            needsUnlock = true;
          }
          const txt = await decodeStoredText(raw ?? "", vaultPassphrase);
          localRows.push({
            id: e.id,
            name: e.name,
            tag: e.tag,
            kind: e.kind || "pdf",
            storage: e.storage || "opfs",
            contentHash: e.contentHash,
            date: formatRelativeDate(e.createdAt),
            size: formatBytes(e.sizeBytes),
            source: "local",
            createdAt: e.createdAt,
            sizeBytes: e.sizeBytes,
          });
          contentUpdates[e.id] = txt ?? "";
        }
        try {
          if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("silo_unlock_skip") === "1") {
            setVaultUnlockGate(false);
          } else {
            setVaultUnlockGate(needsUnlock);
          }
        } catch {
          setVaultUnlockGate(needsUnlock);
        }
        setDocs((prev) => mergeDocs(prev.filter((d) => d.source !== "local"), localRows));
        setContentById((prev) => ({ ...prev, ...contentUpdates }));
        markOnboardingComplete();
        setShowOnboarding(false);

        const health = await checkVaultHealth(vault, entries, { semanticSearchEnabled });
        if (!cancelled) {
          setVaultHealthReport(health);
          setShowRecoveryScreen(!health.healthy && health.summary.critical > 0);
        }
        const embMap = {};
        for (const e of entries) {
          const emb = await loadEmbedding(vault, e.id);
          if (emb) embMap[String(e.id)] = emb;
        }
        setEmbeddingsById((prev) => ({ ...prev, ...embMap }));
      } finally {
        if (!cancelled) setVaultListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultPassphrase, vaultEpoch, semanticSearchEnabled]);

  const {
    display,
    setQueryVec,
    embeddingSearchBusy,
  } = useVaultSearch({
    docs,
    contentById,
    query,
    activeTag,
    smartView,
    semanticSearchEnabled,
    embeddingsById,
  });

  // ── Demo docs: local embeddings for hybrid semantic search (demo mode only) ──
  useEffect(() => {
    if (!semanticSearchEnabled || !isDemoDataEnabled()) return;
    let cancelled = false;
    void (async () => {
      try {
        const { embedText } = await import("./vault/embeddings.js");
        const next = {};
        for (const d of SEED_DOCS) {
          const body = d.kind === "text" && DEMO_TEXT_BODY[d.id]
            ? DEMO_TEXT_BODY[d.id]
            : `${String(d.name).replace(/\.(pdf|txt)$/i, "").replace(/_/g, " ")} ${d.tag} ${DEMO_INDEX_BOOST[d.id] || ""}`;
          const row = { ...d, kind: d.kind || "pdf" };
          const vec = await embedText(buildCombinedIndexText(row, body));
          if (vec) next[d.id] = vec;
        }
        if (!cancelled) setEmbeddingsById((prev) => ({ ...next, ...prev }));
      } catch (e) {
        console.warn("Demo embeddings skipped", e);
      }
    })();
    return () => { cancelled = true; };
  }, [semanticSearchEnabled]);

  const hasResults = Object.keys(display).length > 0;

  const emptyVariant = useMemo(() => {
    if (hasResults) return "vault";
    if (query.trim()) return "search";
    if (smartView === "Voice") return "voice";
    if (activeTag !== "All" || smartView) return "category";
    if (docs.length === 0) return "vault";
    return "search";
  }, [hasResults, query, smartView, activeTag, docs.length]);

  // Total converted to GB for the hero stat
  const handleOnboardingComplete = useCallback(() => {
    markOnboardingComplete();
    setShowOnboarding(false);
  }, []);

  const vaultStatusLabel = useMemo(() => {
    if (isDemoDataEnabled()) return "Demo vault";
    if (opfsReady) return "Private on this device";
    if (storageMode !== "checking" && storageMode !== "opfs") return "Limited storage";
    return "Connecting…";
  }, [opfsReady, storageMode]);

  const totalGB = useMemo(() => {
    let mb = 0;
    for (const d of docs) {
      if (typeof d.size === "string" && d.size) mb += parseMB(d.size);
      else if (d.sizeBytes != null) mb += d.sizeBytes / (1024 * 1024);
    }
    return (mb / 1024).toFixed(1);
  }, [docs]);

  const indexAndPersistEmbedding = useCallback(async (vault, id, docRow, indexText) => {
    await persistSecureText(vault, id, indexText, vaultPassphrase);
    const combined = buildCombinedIndexText(docRow, indexText);
    const { embedText } = await import("./vault/embeddings.js");
    const vec = await embedText(combined);
    setContentById((prev) => ({ ...prev, [id]: indexText }));
    if (vec) {
      await persistEmbedding(vault, id, vec);
      setEmbeddingsById((prev) => ({ ...prev, [String(id)]: vec }));
    } else {
      setEmbeddingsById((prev) => {
        const next = { ...prev };
        delete next[String(id)];
        return next;
      });
    }
  }, [vaultPassphrase]);

  const resolveLocalFile = useCallback(async (doc) => {
    if (doc.storage === "linked") {
      const f = await getLinkedFile(String(doc.id));
      if (f) return f;
    }
    if (vaultRef.current) {
      return readVaultBlobFile(vaultRef.current, String(doc.id));
    }
    return null;
  }, []);

  const handleOpenDoc = useCallback(async (doc) => {
    bumpMeaningfulInteraction();
    const k = doc.kind || "pdf";
    if (doc.source === "demo") {
      if (k === "text") {
        const body = contentById[doc.id] ?? "";
        showToast(body ? `Note: ${body.slice(0, 100)}${body.length > 100 ? "…" : ""}` : "Empty note");
        return;
      }
      showToast(`Opening ${doc.name}…`);
      return;
    }
    if (doc.source === "local" && vaultRef.current) {
      if (k === "text") {
        let body = contentById[doc.id];
        if (body == null || body === "") {
          const raw = (await loadExtractedText(vaultRef.current, String(doc.id))) ?? "";
          body = await decodeStoredText(raw, vaultPassphrase);
        }
        showToast(body ? `Note: ${body.slice(0, 120)}${body.length > 120 ? "…" : ""}` : "Empty note");
        return;
      }
      const file = await resolveLocalFile(doc);
      if (file) {
        const url = URL.createObjectURL(file);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        showToast(`Opened ${doc.name}`);
        return;
      }
      if (doc.storage === "linked") {
        showToast("Allow file access again, or the file was moved.");
        return;
      }
    }
    showToast(`Opening ${doc.name}…`);
  }, [showToast, contentById, resolveLocalFile, vaultPassphrase]);

  const ensureVault = useCallback(async () => {
    let v = vaultRef.current;
    if (!v) {
      v = await getVaultRoot();
      vaultRef.current = v;
    }
    return v;
  }, []);

  const handlePickVaultFiles = useCallback((kind) => {
    const input = vaultFileInputRef.current;
    if (!input) return;
    input.accept = VAULT_FILE_ACCEPT_BY_KIND[kind] ?? DEFAULT_VAULT_FILE_ACCEPT;
    input.click();
  }, []);

  const isDuplicateContent = useCallback(async (vault, { contentHash, textFingerprint }) => {
    const existing = await loadManifest(vault);
    if (contentHash && existing.some((e) => e.contentHash === contentHash)) return true;
    if (textFingerprint && existing.some((e) => e.textFingerprint === textFingerprint)) return true;
    return false;
  }, []);

  const ingestFromFile = useCallback(async (file, options) => {
    const { vault, storage, fileHandle } = options;
    setIngestStage("reading");
    setIngestOverlayName(file.name);
    try {
      const lower = file.name.toLowerCase();
      let kind = "file";
      if (lower.endsWith(".pdf")) kind = "pdf";
      else if (/\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(lower)) kind = "image";
      else if (/\.(m4a|aac|mp3|wav|webm|ogg|opus|flac)$/i.test(lower)) kind = "audio";

      let contentHash = "";
      try {
        contentHash = await sha256HexFromBlob(file);
      } catch {
        contentHash = "";
      }
      if (contentHash && (await isDuplicateContent(vault, { contentHash, textFingerprint: "" }))) {
        showToast("Already in vault (same file hash)");
        return false;
      }

      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      let indexText = "";

      if (kind === "pdf") {
        const buffer = await file.arrayBuffer();
        const { extractTextFromPdfBuffer } = await import("./vault/extractPdfText.js");
        indexText = await extractTextFromPdfBuffer(buffer);
      } else if (kind === "image") {
        setIngestStage("ocr");
        const { extractTextFromImage } = await import("./vault/ocrImage.js");
        indexText = await extractTextFromImage(file);
        if (!indexText) indexText = `image screenshot ${file.name}`;
      } else if (kind === "audio") {
        setIngestStage("transcribe");
        const { transcribeAudio } = await import("./vault/transcribe.js");
        indexText = (await transcribeAudio(file)).trim();
        if (!indexText) indexText = `voice note audio ${file.name}`;
      } else {
        indexText = `file attachment ${file.type || "binary"} ${file.name}`;
      }

      let textFingerprint = "";
      try {
        textFingerprint = await textContentFingerprint(indexText);
      } catch {
        textFingerprint = "";
      }
      if (textFingerprint && (await isDuplicateContent(vault, { contentHash: "", textFingerprint }))) {
        showToast("Already in vault (same text)");
        return false;
      }

      const tag = inferTagGuess(`${indexText} ${file.name}`);
      setIngestStage("store");
      if (storage === "opfs") {
        await persistVaultBlob(vault, id, file);
      } else if (fileHandle) {
        await storeLinkedFileHandle(id, fileHandle);
      }

      const row = {
        id,
        name: file.name,
        tag,
        kind,
        storage,
        date: formatRelativeDate(createdAt),
        size: formatBytes(file.size),
        source: "local",
        createdAt,
        sizeBytes: file.size,
        ...(contentHash ? { contentHash } : {}),
        ...(textFingerprint ? { textFingerprint } : {}),
      };
      setIngestStage("embed");
      await indexAndPersistEmbedding(vault, id, row, indexText);

      const entries = await loadManifest(vault);
      const entry = {
        id,
        name: file.name,
        tag,
        kind,
        createdAt,
        sizeBytes: file.size,
        mimeType: file.type || undefined,
        storage,
        ...(storage === "linked" && fileHandle?.name ? { linkedPath: fileHandle.name } : {}),
        ...(contentHash ? { contentHash } : {}),
        ...(textFingerprint ? { textFingerprint } : {}),
      };
      entries.push(entry);
      await saveManifest(vault, entries);

      setDocs((prev) => mergeDocs(prev, [row]));
      showToast(
        storage === "linked"
          ? "Linked from disk (reads original file)"
          : kind === "pdf"
            ? "PDF indexed"
            : kind === "audio"
              ? "Voice note transcribed & indexed"
              : kind === "image"
                ? "Image OCR & indexed"
                : "File saved to vault",
      );
      return true;
    } finally {
      setIngestStage(null);
      setIngestOverlayName(null);
    }
  }, [indexAndPersistEmbedding, showToast, isDuplicateContent]);

  const handleVaultFiles = useCallback(async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    const vault = await ensureVault();
    if (!vault) {
      setIngestError("Private on-device storage (OPFS) is not available here. Use HTTPS or a supported browser.");
      if (vaultFileInputRef.current) vaultFileInputRef.current.value = "";
      return;
    }

    setIngestError(null);
    setIngestBusy(true);
    try {
      await ingestFromFile(file, { vault, storage: "opfs", fileHandle: null });
    } catch (err) {
      console.error(err);
      setIngestError(err?.message || "Could not save this file.");
    } finally {
      setIngestBusy(false);
      if (vaultFileInputRef.current) {
        vaultFileInputRef.current.value = "";
        vaultFileInputRef.current.accept = DEFAULT_VAULT_FILE_ACCEPT;
      }
    }
  }, [ensureVault, ingestFromFile]);

  useEffect(() => {
    const onEnter = (e) => {
      if (e.dataTransfer?.types && [...e.dataTransfer.types].includes("Files")) setFileDropActive(true);
    };
    document.addEventListener("dragenter", onEnter);
    return () => document.removeEventListener("dragenter", onEnter);
  }, []);

  useEffect(() => {
    if (!fileDropActive) return;
    const onKey = (e) => {
      if (e.key === "Escape") setFileDropActive(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fileDropActive]);

  const handleLinkFromDisk = useCallback(async () => {
    const vault = await ensureVault();
    if (!vault) {
      setIngestError("Private on-device storage (OPFS) is not available here. Use HTTPS or a supported browser.");
      return;
    }
    if (!supportsNativeFileSystemLink()) {
      setIngestError("Native file linking needs Chrome/Edge (File System Access API). Use “Add file” to copy into the vault.");
      return;
    }
    setIngestError(null);
    setIngestBusy(true);
    try {
      const [handle] = await pickFilesFromDisk();
      const file = await handle.getFile();
      await ingestFromFile(file, { vault, storage: "linked", fileHandle: handle });
    } catch (err) {
      if (err?.name === "AbortError") {
        /* user cancelled */
      } else {
        console.error(err);
        setIngestError(err?.message || "Could not link file.");
      }
    } finally {
      setIngestBusy(false);
    }
  }, [ensureVault, ingestFromFile]);

  const handleSaveTextNote = useCallback(async (rawText) => {
    const text = rawText.trim();
    if (!text) return;
    const vault = await ensureVault();
    if (!vault) {
      setIngestError("Private on-device storage (OPFS) is not available here. Use HTTPS or a supported browser.");
      return;
    }
    setNoteModalOpen(false);
    setIngestError(null);
    setIngestBusy(true);
    try {
      const id = crypto.randomUUID();
      const preview = text.slice(0, 40).replace(/\s+/g, " ");
      const name = `Note — ${preview}${text.length > 40 ? "…" : ""}.txt`;
      const tag = inferTagForNote(text);
      const createdAt = new Date().toISOString();
      const enc = new TextEncoder();
      const sizeBytes = enc.encode(text).length;
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      let contentHash = "";
      try {
        contentHash = await sha256HexFromBlob(blob);
      } catch {
        contentHash = "";
      }
      let textFingerprint = "";
      try {
        textFingerprint = await textContentFingerprint(text);
      } catch {
        textFingerprint = "";
      }
      if (await isDuplicateContent(vault, { contentHash, textFingerprint })) {
        showToast("Same note already saved");
        setIngestBusy(false);
        return;
      }

      await persistVaultBlob(vault, id, blob);
      const row = {
        id,
        name,
        tag,
        kind: "text",
        date: formatRelativeDate(createdAt),
        size: formatBytes(sizeBytes),
        source: "local",
        createdAt,
        sizeBytes,
        ...(contentHash ? { contentHash } : {}),
        ...(textFingerprint ? { textFingerprint } : {}),
      };
      await indexAndPersistEmbedding(vault, id, row, text);

      const entries = await loadManifest(vault);
      entries.push({
        id,
        name,
        tag,
        kind: "text",
        createdAt,
        sizeBytes,
        mimeType: "text/plain",
        ...(contentHash ? { contentHash } : {}),
        ...(textFingerprint ? { textFingerprint } : {}),
      });
      await saveManifest(vault, entries);

      setDocs((prev) => mergeDocs(prev, [row]));
      showToast("Text note saved");
    } catch (err) {
      console.error(err);
      setIngestError(err?.message || "Could not save note.");
    } finally {
      setIngestBusy(false);
    }
  }, [ensureVault, showToast, indexAndPersistEmbedding, isDuplicateContent]);

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
  }, [ensureVault, ingestFromFile, indexAndPersistEmbedding, refreshShareQueueCount, showToast, isDuplicateContent]);

  processAllPendingSharesRef.current = processAllPendingShares;

  useEffect(() => {
    if (!opfsReady) return;
    void processAllPendingShares(undefined);
  }, [opfsReady, processAllPendingShares]);

  const handleImportFolderFromDisk = useCallback(async () => {
    if (!supportsDirectoryPicker()) {
      setIngestError("Folder import needs Chrome/Edge (showDirectoryPicker).");
      return;
    }
    const vault = await ensureVault();
    if (!vault) {
      setIngestError("OPFS not available.");
      return;
    }
    setIngestError(null);
    setIngestBusy(true);
    try {
      const dir = await window.showDirectoryPicker({ mode: "read" });
      let count = 0;
      for await (const [, handle] of dir.entries()) {
        if (handle.kind !== "file") continue;
        const f = await handle.getFile();
        if (f.size > 80 * 1024 * 1024) continue;
        await ingestFromFile(f, { vault, storage: "opfs", fileHandle: null });
        count++;
      }
      showToast(`Imported ${count} file(s) from folder`);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error(err);
        setIngestError(err?.message || "Folder import failed");
      }
    } finally {
      setIngestBusy(false);
    }
  }, [ensureVault, ingestFromFile, showToast]);

  const handleExportVaultZip = useCallback(async () => {
    const vault = vaultRef.current;
    if (!vault) {
      showToast("No vault to export");
      return;
    }
    const entries = await loadManifest(vault);
    if (!entries.length) {
      showToast("Nothing local to export");
      return;
    }
    setIngestBusy(true);
    try {
      const zip = await buildVaultZip(vault, entries, async (id) => {
        const e = entries.find((x) => String(x.id) === String(id));
        return resolveLocalFile({ id, source: "local", storage: e?.storage || "opfs" });
      });
      const blob = new Blob([zip], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `silo-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Backup downloaded");
    } catch (e) {
      console.error(e);
      showToast("Export failed");
    } finally {
      setIngestBusy(false);
    }
  }, [resolveLocalFile, showToast]);

  const rewrapAllVaultText = useCallback(async (newPass, oldPass) => {
    const vault = vaultRef.current;
    if (!vault) return;
    const entries = await loadManifest(vault);
    for (const e of entries) {
      const raw = await loadExtractedText(vault, e.id);
      if (raw == null) continue;
      const plain = await decodeStoredText(raw, oldPass);
      await persistSecureText(vault, e.id, plain, newPass);
    }
  }, []);

  const handleRequestMergeBackup = useCallback((fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    pendingMergeFilesRef.current = fileList;
    setConfirmMergeOpen(true);
  }, []);

  const executeMergeBackup = useCallback(async () => {
    const fileList = pendingMergeFilesRef.current;
    pendingMergeFilesRef.current = null;
    setConfirmMergeOpen(false);
    const file = fileList?.[0];
    if (!file) return;
    const vault = await ensureVault();
    if (!vault) {
      showToast("OPFS required for merge");
      return;
    }
    setIngestBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const { manifest, files } = parseVaultZip(buf);
      if (!manifest?.entries?.length) throw new Error("bad zip");
      await applyVaultZipToOpfs(vault, files, manifest.entries);
      setVaultEpoch((x) => x + 1);
      showToast("Backup merged (same id → this device wins)");
    } catch (e) {
      console.error(e);
      showToast("Merge failed — use a Silo export .zip");
    } finally {
      setIngestBusy(false);
      if (backupImportRef.current) backupImportRef.current.value = "";
    }
  }, [ensureVault, showToast]);

  const handleCheckVaultIntegrity = useCallback(async () => {
    const vault = vaultRef.current;
    if (!vault) {
      showToast("No vault");
      return;
    }
    const entries = await loadManifest(vault);
    if (!entries.length) {
      showToast("No local entries");
      return;
    }
    const report = await checkVaultHealth(vault, entries, { semanticSearchEnabled });
    setVaultHealthReport(report);
    if (report.healthy) showToast("Vault health OK");
    else {
      setShowRecoveryScreen(report.summary.critical > 0);
      showToast(
        `${report.summary.total} issue(s): ${report.issues.slice(0, 3).map((i) => i.code).join(", ")}${report.summary.total > 3 ? "…" : ""}`,
      );
    }
  }, [showToast, semanticSearchEnabled]);

  const handleRepairVault = useCallback(async () => {
    const vault = vaultRef.current;
    if (!vault) {
      showToast("No vault");
      return;
    }
    const entries = await loadManifest(vault);
    if (!entries.length) return;
    setIngestBusy(true);
    try {
      for (const e of entries) {
        await repairVaultEntry(
          vault,
          e,
          () => resolveLocalFile({ id: e.id, storage: e.storage || "opfs" }),
          vaultPassphrase,
        );
      }
      setVaultEpoch((x) => x + 1);
      showToast("Repair pass complete — reindexed from blobs");
      const entriesAfter = await loadManifest(vault);
      const report = await checkVaultHealth(vault, entriesAfter, { semanticSearchEnabled });
      setVaultHealthReport(report);
      setShowRecoveryScreen(!report.healthy && report.summary.critical > 0);
    } catch (err) {
      console.error(err);
      showToast("Repair failed");
    } finally {
      setIngestBusy(false);
    }
  }, [resolveLocalFile, vaultPassphrase, showToast, semanticSearchEnabled]);

  const handleClearShareQueue = useCallback(async () => {
    await clearAllPendingShares();
    void refreshShareQueueCount();
    showToast("Cleared pending shares");
  }, [refreshShareQueueCount, showToast]);

  const handleRetryShareImports = useCallback(async () => {
    if (!opfsReady) {
      showToast("Vault not ready");
      return;
    }
    void requestShareQueueBackgroundSync();
    await processAllPendingShares(undefined);
    void refreshShareQueueCount();
  }, [opfsReady, processAllPendingShares, refreshShareQueueCount, showToast]);

  const settingsActions = useMemo(() => [
    {
      id: "lists",
      label: "Open Silo Lists (shared checklists)",
      icon: "☰",
      onSelect: () => {
        onOpenLists?.();
        setSettingsOpen(false);
      },
    },
    { id: "export", label: "Export backup (.zip)", icon: "↑", onSelect: () => { void handleExportVaultZip(); } },
    { id: "import", label: "Import / merge backup", icon: "↓", onSelect: () => { backupImportRef.current?.click(); } },
    {
      id: "folder",
      label: "Import folder (Chrome)",
      icon: "▤",
      disabled: !supportsDirectoryPicker(),
      onSelect: () => { void handleImportFolderFromDisk(); },
    },
    { id: "integrity", label: "Check vault integrity", icon: "✓", onSelect: () => { void handleCheckVaultIntegrity(); } },
    { id: "repair", label: "Repair vault (rebuild text/embeddings)", icon: "↻", onSelect: () => { void handleRepairVault(); } },
    {
      id: "retryshares",
      label: "Retry pending share imports",
      icon: "↺",
      disabled: importQueueCount === 0 || ingestBusy,
      keepOpen: true,
      onSelect: () => { void handleRetryShareImports(); },
    },
    { id: "clearshares", label: "Clear pending shares queue", icon: "⊘", onSelect: () => { void handleClearShareQueue(); } },
    {
      id: "semantic",
      label: semanticSearchEnabled ? "Semantic search: on" : "Semantic search: off",
      icon: "◎",
      keepOpen: true,
      onSelect: () => {
        setSemanticSearchEnabled((v) => {
          const n = !v;
          try {
            localStorage.setItem("silo_semantic", n ? "1" : "0");
          } catch {
            /* ignore */
          }
          showToast(n ? "Semantic search on" : "Semantic search off — keywords only");
          return n;
        });
        setQueryVec(null);
        bumpMeaningfulInteraction();
      },
    },
    {
      id: "clearemb",
      label: "Clear semantic index",
      icon: "◇",
      disabled: !opfsReady || ingestBusy,
      onSelect: () => { void handleClearSemanticIndex(); },
    },
    {
      id: "resetvault",
      label: "Reset vault (delete all local data)",
      icon: "⚠",
      danger: true,
      disabled: !opfsReady || ingestBusy,
      onSelect: () => { setConfirmResetOpen(true); },
    },
    {
      id: "pass",
      label: "Set vault passphrase (encrypts index text)",
      icon: "🔒",
      onSelect: async () => {
        const p1 = window.prompt("New passphrase (min 8 chars). Leave empty to skip:");
        if (p1 == null) return;
        if (p1.length > 0 && p1.length < 8) {
          showToast("Passphrase too short");
          return;
        }
        const oldP = vaultPassphrase;
        if (p1) {
          const p2 = window.prompt("Confirm passphrase:");
          if (p1 !== p2) {
            showToast("Mismatch");
            return;
          }
          setIngestBusy(true);
          try {
            await rewrapAllVaultText(p1, oldP);
            setVaultPassphrase(p1);
            setVaultEpoch((x) => x + 1);
            showToast("Vault text encrypted with passphrase");
          } finally {
            setIngestBusy(false);
          }
        }
      },
    },
    {
      id: "clearpass",
      label: "Clear vault passphrase",
      icon: "🔓",
      onSelect: async () => {
        if (!vaultPassphrase) {
          showToast("No passphrase set");
          return;
        }
        const cur = window.prompt("Current passphrase:");
        if (cur !== vaultPassphrase) {
          showToast("Wrong passphrase");
          return;
        }
        setIngestBusy(true);
        try {
          await rewrapAllVaultText("", vaultPassphrase);
          setVaultPassphrase("");
          setVaultEpoch((x) => x + 1);
          showToast("Passphrase cleared");
        } finally {
          setIngestBusy(false);
        }
      },
    },
    {
      id: "privacy",
      label: "Privacy policy",
      icon: "ℹ",
      keepOpen: true,
      onSelect: () => setPrivacyOpen(true),
    },
  ], [
    onOpenLists,
    handleExportVaultZip,
    handleImportFolderFromDisk,
    handleCheckVaultIntegrity,
    handleRepairVault,
    handleClearShareQueue,
    handleRetryShareImports,
    importQueueCount,
    handleClearSemanticIndex,
    opfsReady,
    ingestBusy,
    semanticSearchEnabled,
    rewrapAllVaultText,
    vaultPassphrase,
    showToast,
    setQueryVec,
  ]);

  const handlePointerDown = useCallback((doc, e) => {
    e.preventDefault();
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      setContextMenu({ doc });
    }, 450);
  }, []);

  const handlePointerUp = useCallback((doc) => {
    setPreviewDoc(doc);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
      void handleOpenDoc(doc);
    }
  }, [handleOpenDoc]);

  const handlePointerCancel = useCallback(() => {
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }, []);

  const performDeleteDoc = useCallback(async (doc) => {
    if (!doc) return;
    setConfirmDeleteDoc(null);
    try {
      if (doc.source === "local" && vaultRef.current) {
        await deleteVaultItem(vaultRef.current, String(doc.id));
        await removeLinkedFileHandle(String(doc.id));
        const entries = await loadManifest(vaultRef.current);
        await saveManifest(vaultRef.current, entries.filter((e) => String(e.id) !== String(doc.id)));
      }
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      setContentById((prev) => {
        const next = { ...prev };
        delete next[doc.id];
        return next;
      });
      setEmbeddingsById((prev) => {
        const next = { ...prev };
        delete next[String(doc.id)];
        return next;
      });
      showToast(`Deleted ${doc.name}`);
    } catch (err) {
      console.error(err);
      showToast(err?.message || "Could not delete item.");
    }
  }, [showToast]);

  const handleClearSemanticIndex = useCallback(async () => {
    const vault = vaultRef.current;
    if (!vault) {
      showToast("No vault");
      return;
    }
    setIngestBusy(true);
    try {
      const entries = await loadManifest(vault);
      await clearAllEmbeddingsForVault(vault);
      setEmbeddingsById((prev) => {
        const next = { ...prev };
        for (const e of entries) delete next[String(e.id)];
        return next;
      });
      showToast("Semantic embeddings cleared");
    } catch (e) {
      console.error(e);
      showToast("Could not clear embeddings");
    } finally {
      setIngestBusy(false);
    }
  }, [showToast]);

  const executeResetVault = useCallback(async () => {
    setConfirmResetOpen(false);
    const vault = vaultRef.current;
    if (!vault) {
      showToast("No vault to reset");
      return;
    }
    setIngestBusy(true);
    try {
      const entries = await loadManifest(vault);
      for (const e of entries) {
        await deleteVaultItem(vault, e.id);
        await removeLinkedFileHandle(String(e.id));
      }
      await saveManifest(vault, []);
      await clearAllLinkedFileHandles();
      setDocs(getInitialDemoDocs());
      setContentById(getInitialDemoContentById());
      setEmbeddingsById({});
      setPreviewDoc(null);
      setVaultUnlockGate(false);
      setVaultEpoch((x) => x + 1);
      showToast(isDemoDataEnabled() ? "Vault reset — demo items restored" : "Vault reset — all local data cleared");
    } catch (e) {
      console.error(e);
      showToast("Reset failed");
    } finally {
      setIngestBusy(false);
    }
  }, [showToast]);

  const handleVaultUnlock = useCallback(
    (passphrase) => {
      setUnlockError(null);
      if (!isPassphraseActive(passphrase)) {
        setUnlockError("Passphrase must be at least 8 characters.");
        return;
      }
      try {
        sessionStorage.removeItem("silo_unlock_skip");
      } catch {
        /* ignore */
      }
      setVaultPassphrase(passphrase);
      setVaultUnlockGate(false);
      setVaultEpoch((x) => x + 1);
      showToast("Vault unlocked");
    },
    [showToast],
  );

  const handleVaultUnlockSkip = useCallback(() => {
    try {
      sessionStorage.setItem("silo_unlock_skip", "1");
    } catch {
      /* ignore */
    }
    setVaultUnlockGate(false);
    setUnlockError(null);
    showToast("Browsing without full decryption — some text may be unreadable until you unlock.");
  }, [showToast]);

  const handleCardKeyDown = useCallback((doc, e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      void handleOpenDoc(doc);
    }
    if (e.key === "ContextMenu") {
      e.preventDefault();
      setContextMenu({ doc });
    }
  }, [handleOpenDoc]);

  const handleDownloadDoc = useCallback(
    (doc) => {
      void (async () => {
        if (doc.source === "local" && vaultRef.current) {
          const f = await resolveLocalFile(doc);
          if (f) {
            const url = URL.createObjectURL(f);
            const a = document.createElement("a");
            a.href = url;
            a.download = doc.name;
            a.click();
            URL.revokeObjectURL(url);
            showToast(`Saved ${doc.name}`);
            return;
          }
        }
        showToast(`Downloading ${doc.name}…`);
      })();
    },
    [resolveLocalFile, showToast],
  );

  const handleAction = useCallback((action, doc) => {
    setContextMenu(null);
    if (action === "Summarize") {
      const body = contentById[doc.id] || "";
      const s = summarizeExtractive(body, 400);
      showToast(s ? `Summary: ${s}` : "Nothing to summarize");
      return;
    }
    if (action === "Rename") { setRenameDoc(doc); return; }
    if (action === "Delete") {
      setConfirmDeleteDoc(doc);
      return;
    }
    if (action === "Share") { showToast(`Sharing ${doc.name}…`); return; }
    if (action === "Download") {
      handleDownloadDoc(doc);
    }
  }, [showToast, contentById, handleDownloadDoc]);

  const handleRename = useCallback(async (renamedDoc, newName) => {
    const docId = renamedDoc.id;
    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, name: newName } : d)));
    if (renamedDoc.source === "local" && vaultRef.current) {
      const entries = await loadManifest(vaultRef.current);
      await saveManifest(
        vaultRef.current,
        entries.map((e) => {
          if (e.id !== String(docId)) return e;
          const next = { ...e, name: newName };
          if (e.storage === "linked") next.linkedPath = newName;
          return next;
        }),
      );
      let plain = contentById[docId];
      if (plain == null || plain === "") {
        const raw = (await loadExtractedText(vaultRef.current, String(docId))) ?? "";
        plain = await decodeStoredText(raw, vaultPassphrase);
      }
      const row = { ...renamedDoc, name: newName };
      await indexAndPersistEmbedding(vaultRef.current, String(docId), row, plain);
    } else {
      const boost = typeof docId === "number" ? (DEMO_INDEX_BOOST[docId] || "") : "";
      const nm = newName.replace(/\.(pdf|txt)$/i, "").replace(/_/g, " ");
      const bodyFromDemo = renamedDoc.kind === "text" && typeof docId === "number" && DEMO_TEXT_BODY[docId]
        ? DEMO_TEXT_BODY[docId]
        : "";
      const body = bodyFromDemo || `${nm} ${renamedDoc.tag} ${boost}`.trim();
      setContentById((prev) => ({
        ...prev,
        [docId]: body,
      }));
      const row = { ...renamedDoc, name: newName };
      try {
        const { embedText } = await import("./vault/embeddings.js");
        const vec = await embedText(buildCombinedIndexText(row, body));
        if (vec) setEmbeddingsById((prev) => ({ ...prev, [String(docId)]: vec }));
      } catch {
        /* embeddings optional */
      }
    }
    setRenameDoc(null);
    showToast("Renamed successfully");
  }, [showToast, contentById, indexAndPersistEmbedding, vaultPassphrase]);

  const handleQueryChange = (val) => {
    setQuery(val);
    if (val.trim()) bumpMeaningfulInteraction();
    if (val && activeTag !== "All") setActiveTag("All");
  };

  const handleSearchBlur = () => {
    blurTimer.current = setTimeout(() => {
      if (!query) document.getElementById("silo-global-search")?.blur();
    }, 150);
  };

  useEffect(() => {
    if (mobileTab === "search") {
      const t = window.setTimeout(() => document.getElementById("silo-global-search")?.focus(), 60);
      return () => window.clearTimeout(t);
    }
    if (mobileTab === "settings") {
      setSettingsOpen(true);
      setMobileTab("vault");
    }
    return undefined;
  }, [mobileTab]);

  useEffect(() => {
    if (previewDoc && !docs.some((d) => d.id === previewDoc.id)) setPreviewDoc(null);
  }, [docs, previewDoc]);

  return (
    <div className="app-shell">
      {vaultUnlockGate && opfsReady && (
        <UnlockScreen onUnlock={handleVaultUnlock} onSkip={handleVaultUnlockSkip} error={unlockError} />
      )}

      {showInstallBanner && deferredPrompt && (
        <div style={{ gridColumn: "1 / -1", paddingTop: "var(--safe-top)" }}>
          <InstallBanner onInstall={() => void pwaInstall()} onDismiss={dismissInstallBanner} />
        </div>
      )}

      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset entire vault?"
        body="This deletes all documents stored in Silo on this device (OPFS). Demo sample documents will return. Linked file handles are cleared. This cannot be undone."
        confirmLabel="Yes, reset vault"
        confirmVariant="danger"
        onConfirm={() => { void executeResetVault(); }}
        onCancel={() => setConfirmResetOpen(false)}
      />

      <ConfirmDialog
        open={confirmMergeOpen}
        title="Merge backup into this vault?"
        body="This imports entries from the selected Silo export .zip. Existing entries with the same id are overwritten by the backup copy. Continue only if you trust this file."
        confirmLabel="Yes, merge backup"
        confirmVariant="danger"
        onConfirm={() => { void executeMergeBackup(); }}
        onCancel={() => {
          setConfirmMergeOpen(false);
          pendingMergeFilesRef.current = null;
          if (backupImportRef.current) backupImportRef.current.value = "";
        }}
      />

      <IngestProgress stage={ingestStage} fileName={ingestOverlayName} />

      <ConfirmDialog
        open={confirmDeleteDoc != null}
        title="Delete this document?"
        body={
          confirmDeleteDoc
            ? `“${confirmDeleteDoc.name}” will be removed from the vault. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmDeleteDoc) void performDeleteDoc(confirmDeleteDoc);
        }}
        onCancel={() => setConfirmDeleteDoc(null)}
      />

      <AnimatePresence>
        {fileDropActive && (
          <motion.div
            key="drop"
            className="drop-overlay drop-overlay--interactive"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              e.preventDefault();
              setFileDropActive(false);
              if (e.dataTransfer.files?.length) void handleVaultFiles(e.dataTransfer.files);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setFileDropActive(false);
            }}
          >
            <div className="drop-overlay__label">Drop file to add to vault</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="app-shell__sidebar">
        <Sidebar
          tags={ALL_TAGS}
          activeTag={activeTag}
          smartView={smartView}
          onTag={(t) => {
            setActiveTag(t);
            bumpMeaningfulInteraction();
          }}
          onSmart={(id) => {
            setSmartView(id);
            if (id) setActiveTag("All");
            bumpMeaningfulInteraction();
          }}
          onSettings={() => {
            setSettingsOpen(true);
            bumpMeaningfulInteraction();
          }}
        />
      </div>

      <div className="app-shell__main">
        <div ref={mainInnerRef} className="app-shell__main-inner">
          <div
            className="vault-ptr-indicator"
            style={{ transform: `scaleX(${ptrBar})`, opacity: ptrBar > 0 ? 1 : 0 }}
            aria-hidden
          />
          {storageMode !== "checking" && storageMode !== "opfs" && (
            <Banner variant="warning">
              Private OPFS storage is not available in this browser session. Your vault may not persist.
              {storageMode === "localstorage-fallback" ? " Try Chrome or Edge for full OPFS support." : ""}
            </Banner>
          )}
          {!opfsReady && storageMode === "opfs" && (
            <Banner variant="info">Connecting to on-device storage…</Banner>
          )}

          {!sharePanelDismissed && shareListItems.length > 0 && (
            <ShareQueue
              items={shareListItems}
              onProcess={(item) => { void processAllPendingShares(item.id); }}
              onProcessAll={() => { void processAllPendingShares(undefined); }}
              onDismiss={() => setSharePanelDismissed(true)}
            />
          )}
          {shareQueueFailedCount > 0 && (
            <div style={{ padding: "0 var(--space-6)", fontSize: "var(--text-xs)", color: "var(--color-warning)", marginBottom: "var(--space-2)" }}>
              {shareQueueFailedCount} share import(s) failed — retry from the queue or Settings.
            </div>
          )}

          <div className="vault-topbar">
            <div className="vault-brand-row">
              <img
                src={APP_ICON_SRC}
                alt=""
                width={36}
                height={36}
                style={{ borderRadius: 10, flexShrink: 0, objectFit: "contain" }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="vault-brand-mark">SILO</span>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: opfsReady ? "var(--color-success)" : "var(--color-text-muted)",
                      boxShadow: opfsReady ? "0 0 8px color-mix(in srgb, var(--color-success) 50%, transparent)" : "none",
                      flexShrink: 0,
                    }}
                    title={vaultStatusLabel}
                    aria-hidden
                  />
                </div>
                <div className="vault-brand-meta">
                  {docs.length} items · {totalGB} GB
                </div>
              </div>
            </div>
            <button
              className="icon-btn"
              onClick={() => {
                setSettingsOpen(true);
                bumpMeaningfulInteraction();
              }}
              aria-label="Open settings"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>

          <div style={{ padding: "0 var(--space-6)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginTop: 14 }}>
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="vault-hero-title"
            >
              Your vault
            </motion.h1>
            <div className="add-menu-wrap">
            <input
              ref={backupImportRef}
              type="file"
              accept=".zip,application/zip"
              style={{ display: "none" }}
              aria-hidden="true"
              onChange={(e) => { handleRequestMergeBackup(e.target.files); }}
            />
            <input
              ref={vaultFileInputRef}
              type="file"
              accept={DEFAULT_VAULT_FILE_ACCEPT}
              style={{ display: "none" }}
              aria-hidden="true"
              onChange={(e) => { void handleVaultFiles(e.target.files); }}
            />
            <button
              type="button"
              className="add-menu-trigger"
              disabled={ingestBusy}
              aria-haspopup="dialog"
              aria-expanded={ingestDialogOpen}
              onClick={() => {
                setIngestDialogOpen(true);
                bumpMeaningfulInteraction();
              }}
            >
              {ingestBusy ? "Saving…" : "Add"}
              <span style={{ fontSize: 10, color: "#848480", marginLeft: 2 }} aria-hidden>+</span>
            </button>
          </div>
        </div>

      {ingestError && (
        <div style={{ padding: "0 var(--space-6) var(--space-3)", fontSize: "var(--text-xs)", color: "var(--color-danger)" }}>
          {ingestError}
        </div>
      )}

      <div className="vault-filters-row vault-filters-row--mobile-only">
        <label className="vault-select-label">
          <span>View</span>
          <select
            className="vault-select"
            aria-label="Smart view"
            value={smartView}
            onChange={(e) => {
              const v = e.target.value;
              setSmartView(v);
              if (v) setActiveTag("All");
              bumpMeaningfulInteraction();
            }}
          >
            <option value="">All items</option>
            {SMART_VIEWS.map((sv) => (
              <option key={sv.id} value={sv.id}>{sv.label}</option>
            ))}
          </select>
        </label>
        <label className="vault-select-label">
          <span>Category</span>
          <select
            className="vault-select"
            aria-label="Filter by category"
            value={activeTag}
            onChange={(e) => {
              setActiveTag(e.target.value);
              bumpMeaningfulInteraction();
            }}
          >
            {ALL_TAGS.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </label>
      </div>

      <AnimatePresence>
        {query && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="search-hint-row"
          >
            {semanticSearchEnabled
              ? `Hybrid search (keywords + on-device meaning) for "${query}"`
              : `Keyword search for "${query}"`}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginTop: "var(--space-6)" }} role="listbox" aria-label="Documents" aria-busy={vaultListLoading}>
        {vaultListLoading ? (
          <VaultSkeletonList rows={8} />
        ) : !hasResults ? (
          <EmptyState
            variant={emptyVariant}
            onAction={(action) => {
              if (action === "ingest" || action === "ingest-audio") setIngestDialogOpen(true);
            }}
          />
        ) : (
          <DocumentList
            display={display}
            query={query}
            contentById={contentById}
            onDocOpen={handlePointerUp}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onSwipeDelete={(d) => setConfirmDeleteDoc(d)}
            onCardKeyDown={handleCardKeyDown}
          />
        )}
      </div>
        </div>

        <div className="search-dock">
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            isSearching={embeddingSearchBusy && !!query.trim()}
            semanticReady={!semanticSearchEnabled || embeddingModelReady}
            semanticLabel={semanticSearchEnabled ? (embeddingModelReady ? "Semantic ✓" : "Loading AI…") : ""}
            placeholder="Search vault…"
            onBlur={handleSearchBlur}
          />
        </div>
      </div>

      <div className="app-shell__preview">
        <PreviewPanel
          doc={previewDoc}
          onOpen={(d) => { void handleOpenDoc(d); }}
          onExport={handleDownloadDoc}
          onRename={(d) => setRenameDoc(d)}
          onDelete={(d) => setConfirmDeleteDoc(d)}
          onClose={() => setPreviewDoc(null)}
        />
      </div>

      <BottomNav
        activeTab={mobileTab}
        onTabChange={(id) => {
          setMobileTab(id);
          bumpMeaningfulInteraction();
        }}
        onAdd={() => {
          setIngestDialogOpen(true);
          bumpMeaningfulInteraction();
        }}
      />

      <IngestDialog
        open={ingestDialogOpen}
        onClose={() => setIngestDialogOpen(false)}
        ingestBusy={ingestBusy}
        nativeLinkReady={nativeLinkReady}
        onPickFiles={(kind) => {
          handlePickVaultFiles(kind);
          setIngestDialogOpen(false);
        }}
        onLinkDisk={() => { void handleLinkFromDisk(); }}
        onNewNote={() => setNoteModalOpen(true)}
      />

      <AnimatePresence>
        {privacyOpen && <PrivacyModal key="privacy" onClose={() => setPrivacyOpen(false)} />}
      </AnimatePresence>

      {/* ── Overlays ── */}
      <AnimatePresence>
        {noteModalOpen && (
          <NoteModal
            onSave={(t) => { void handleSaveTextNote(t); }}
            onCancel={() => setNoteModalOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsDrawer onClose={() => setSettingsOpen(false)} actions={settingsActions}>
            <div className="settings-extras">
              {storageStats && (
                <p className="settings-meta">
                  Storage (this origin): {(storageStats.usage / (1024 * 1024)).toFixed(1)} MB used
                  {storageStats.quota ? ` of ${(storageStats.quota / (1024 * 1024)).toFixed(0)} MB quota` : ""}.
                </p>
              )}
              <label className="settings-field">
                <span>Theme</span>
                <select
                  className="vault-select"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  aria-label="Color theme"
                >
                  <option value="system">System</option>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <label className="settings-field">
                <span>Density</span>
                <select
                  className="vault-select"
                  value={density}
                  onChange={(e) => setDensity(e.target.value)}
                  aria-label="List density"
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
            </div>
          </SettingsDrawer>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            doc={contextMenu.doc}
            onAction={handleAction}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {renameDoc && (
          <RenameModal
            doc={renameDoc}
            onConfirm={(newName) => { void handleRename(renameDoc, newName); }}
            onCancel={() => setRenameDoc(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOnboarding && !vaultListLoading && (
          <OnboardingScreen
            storageLimited={storageMode !== "checking" && storageMode !== "opfs"}
            onComplete={handleOnboardingComplete}
            onAddFirst={() => setIngestDialogOpen(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRecoveryScreen && vaultHealthReport && !vaultHealthReport.healthy && (
          <VaultRecoveryScreen
            issues={vaultHealthReport.issues}
            summary={vaultHealthReport.summary}
            busy={ingestBusy}
            onExportBackup={() => { void handleExportVaultZip(); }}
            onRepair={() => { void handleRepairVault(); }}
            onDismiss={
              vaultHealthReport.summary.critical === 0
                ? () => setShowRecoveryScreen(false)
                : undefined
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>

    </div>
  );
}
