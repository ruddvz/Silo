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
import { buildVaultZip, parseVaultZip, applyVaultZipToOpfs, validateVaultZip, createPreImportSnapshot } from "./vault/exportBackup.js";
import { persistSecureText, decodeStoredText, isEncryptedStoredPayload, isPassphraseActive } from "./vault/secureText.js";
import { sha256HexFromBlob } from "./vault/fileHash.js";
import { textContentFingerprint } from "./vault/textFingerprint.js";
import { checkVaultHealth } from "./vault/health.js";
import { repairVaultEntry } from "./vault/repair.js";
import { VaultRecoveryScreen } from "./components/VaultRecoveryScreen.jsx";
import { summarizeExtractive } from "./vault/summarize.js";
import { SearchBar } from "./components/SearchBar.jsx";
import { IngestProgress } from "./components/IngestProgress.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { ShareQueue } from "./components/ShareQueue.jsx";
import { InstallBanner } from "./components/InstallBanner.jsx";
import { ConfirmDialog } from "./components/ConfirmDialog.jsx";
import { Banner } from "./components/Banner.jsx";
import { IngestDialog } from "./components/IngestDialog.jsx";
import { PreviewPanel } from "./components/PreviewPanel.jsx";
import { SettingsDrawer } from "./components/SettingsDrawer.jsx";
import { SettingsGroup } from "./components/ui/SettingsGroup.jsx";
import {
  IconBan,
  IconCheck,
  IconExport,
  IconFolder,
  IconImport,
  IconInfo,
  IconLists,
  IconLock,
  IconRefresh,
  IconSparkles,
  IconTrash,
  IconUnlock,
  IconWarning,
} from "./components/ui/icons.jsx";
import { UnlockScreen } from "./components/UnlockScreen.jsx";
import { PrivacyModal } from "./components/PrivacyModal.jsx";
import { Toast } from "./components/Toast.jsx";
import { RenameModal } from "./components/RenameModal.jsx";
import { NoteModal } from "./components/NoteModal.jsx";
import { ContextMenu } from "./components/ContextMenu.jsx";
import { useStorageMode } from "./hooks/useStorageMode.js";
import { usePWAInstall, bumpMeaningfulInteraction } from "./hooks/usePWAInstall.js";
import { usePwaLifecycle } from "./hooks/usePwaLifecycle.js";
import { UpdateAvailableBanner } from "./components/UpdateAvailableBanner.jsx";
import { useVaultSearch } from "./hooks/useVaultSearch.js";
import { useShareQueue } from "./hooks/useShareQueue.js";
import { DEFAULT_VAULT_FILE_ACCEPT, VAULT_FILE_ACCEPT_BY_KIND } from "./lib/vaultConstants.js";
import { formatBytes, formatRelativeDate, parseMB } from "./lib/vaultFormat.js";
import { ALL_TAGS, inferTagGuess, inferTagForNote } from "./lib/vaultTags.js";
import { mergeDocs, buildCombinedIndexText, supportsDirectoryPicker } from "./lib/vaultDocs.js";
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
import { HomeScreen } from "./components/HomeScreen.jsx";
import { SearchScreen } from "./screens/SearchScreen.jsx";
import { VaultScreen } from "./screens/VaultScreen.jsx";
import { SiloTopBar } from "./components/shell/SiloTopBar.jsx";
import { BackupRestorePanel } from "./components/BackupRestorePanel.jsx";
import { PassphraseModal } from "./components/PassphraseModal.jsx";
import { TranscriptionFallbackModal } from "./components/TranscriptionFallbackModal.jsx";
import { validateVaultFile, supportsLinkFromDisk } from "./lib/fileTypeRules.js";
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
  const [mobileTab, setMobileTab] = useState("home");
  const [searchFilter, setSearchFilter] = useState("All");
  const [ingestStage, setIngestStage] = useState(/** @type {string | null} */ (null));
  const [ingestOverlayName, setIngestOverlayName] = useState(/** @type {string | null} */ (null));
  const [confirmMergeOpen, setConfirmMergeOpen] = useState(false);
  const pendingMergeFilesRef = useRef(null);
  const [embeddingModelReady, setEmbeddingModelReady] = useState(false);
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
  const [lastBackupExport, setLastBackupExport] = useState(
    () => (typeof localStorage !== "undefined" ? localStorage.getItem("silo_last_backup") : null) || "",
  );
  const [passphraseModal, setPassphraseModal] = useState(/** @type {"set" | "clear" | null} */ (null));
  const [transcriptionFallback, setTranscriptionFallback] = useState(
    /** @type {{ docId: string, fileName: string, vault: FileSystemDirectoryHandle } | null} */ (null),
  );

  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const raw = localStorage.getItem("silo_pinned");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const persistPinned = useCallback((next) => {
    setPinnedIds(next);
    try {
      localStorage.setItem("silo_pinned", JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }, []);

  const storageMode = useStorageMode();
  const { showBanner: showInstallBanner, deferredPrompt, install: pwaInstall, dismiss: dismissInstallBanner } = usePWAInstall();
  const { updateReady, reloadToUpdate, dismissUpdate } = usePwaLifecycle();

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
    if (vaultPassphrase) sessionStorage.setItem("silo_vault_pass", vaultPassphrase);
    else sessionStorage.removeItem("silo_vault_pass");
  }, [vaultPassphrase]);

  useEffect(() => {
    setNativeLinkReady(supportsNativeFileSystemLink() && supportsLinkFromDisk());
  }, []);

  /** Lazy-load embedding model only when semantic search is enabled. */
  useEffect(() => {
    if (!semanticSearchEnabled) {
      setEmbeddingModelReady(false);
      return;
    }
    let cancelled = false;
    void import("./vault/embeddings.js")
      .then((m) => m.warmUpEmbeddingModel())
      .then((ext) => {
        if (!cancelled) setEmbeddingModelReady(!!ext);
      });
    return () => { cancelled = true; };
  }, [semanticSearchEnabled]);

  useEffect(() => {
    if (!ingestDialogOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setIngestDialogOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ingestDialogOpen]);

  // ── Clean up timers on unmount ──
  useEffect(() => {
    return () => {
      clearTimeout(pressTimer.current);
      clearTimeout(blurTimer.current);
    };
  }, []);

  const showToast = useCallback((msg) => setToast(msg), []);

  const handleTogglePin = useCallback((doc) => {
    const id = String(doc.id);
    persistPinned((prev) => {
      const next = new Set(prev);
      const wasPinned = next.has(id);
      if (wasPinned) next.delete(id);
      else next.add(id);
      showToast(wasPinned ? "Unpinned" : "Pinned to top");
      return next;
    });
  }, [persistPinned, showToast]);

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
  const searchResultCount = query.trim() ? Object.keys(display).length : null;

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

  const vaultSizeBytes = useMemo(
    () => docs.filter((d) => d.source === "local").reduce((n, d) => n + (d.sizeBytes || 0), 0),
    [docs],
  );

  const showHomePanel = mobileTab === "home";
  const showSearchPanel = mobileTab === "search";
  const showVaultPanel = mobileTab === "vault";

  const vaultMeta = useMemo(() => {
    const count = docs.filter((d) => d.source === "local").length;
    const backup = lastBackupExport ? `last backup ${lastBackupExport}` : "no backup yet";
    return `${count} items · ${backup}`;
  }, [docs, lastBackupExport]);

  const backupRecommended = useMemo(() => {
    const hasLocal = docs.some((d) => d.source === "local");
    return hasLocal && !lastBackupExport;
  }, [docs, lastBackupExport]);

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
    setContentById((prev) => ({ ...prev, [id]: indexText }));
    if (!semanticSearchEnabled) return;
    const combined = buildCombinedIndexText(docRow, indexText);
    const { embedText } = await import("./vault/embeddings.js");
    const vec = await embedText(combined);
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
  }, [vaultPassphrase, semanticSearchEnabled]);

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
    const validation = validateVaultFile(file);
    if (!validation.ok) {
      showToast(validation.error || "Invalid file");
      return false;
    }
    if (validation.warning) showToast(validation.warning);

    setIngestStage("reading");
    setIngestOverlayName(file.name);
    let extractionError = "";
    try {
      const kind = validation.kind || "file";

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
        try {
          const buffer = await file.arrayBuffer();
          const { extractTextFromPdfBuffer } = await import("./vault/extractPdfText.js");
          indexText = await extractTextFromPdfBuffer(buffer);
        } catch (err) {
          extractionError = err?.message || "PDF text extraction failed";
          indexText = `pdf document ${file.name}`;
        }
      } else if (kind === "image") {
        setIngestStage("ocr");
        try {
          const { extractTextFromImage } = await import("./vault/ocrImage.js");
          indexText = await extractTextFromImage(file);
          if (!indexText) indexText = `image screenshot ${file.name}`;
        } catch (err) {
          extractionError = err?.message || "OCR failed — original saved";
          indexText = `image ${file.name}`;
        }
      } else if (kind === "audio") {
        setIngestStage("transcribe");
        try {
          const { transcribeAudio } = await import("./vault/transcribe.js");
          indexText = (await transcribeAudio(file)).trim();
          if (!indexText) indexText = `voice note audio ${file.name}`;
        } catch (err) {
          extractionError = err?.message || "Transcription failed — original saved";
          indexText = `voice note audio ${file.name}`;
        }
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
      try {
        if (storage === "opfs") {
          await persistVaultBlob(vault, id, file);
        } else if (fileHandle) {
          await storeLinkedFileHandle(id, fileHandle);
        }
      } catch (err) {
        if (err?.name === "OpfsWriteError") {
          showToast("Couldn't write to vault storage — try again");
        }
        throw err;
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
        extractionStatus: extractionError ? "error" : "complete",
        ...(extractionError ? { extractionError } : {}),
      };
      entries.push(entry);
      await saveManifest(vault, entries);

      setDocs((prev) => mergeDocs(prev, [row]));
      if (kind === "audio" && extractionError) {
        setTranscriptionFallback({ docId: id, fileName: file.name, vault });
        showToast("Transcription failed — add text manually");
      } else {
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
      }
      return true;
    } finally {
      setIngestStage(null);
      setIngestOverlayName(null);
    }
  }, [indexAndPersistEmbedding, showToast, isDuplicateContent]);

  const {
    importQueueCount,
    shareQueueFailedCount,
    shareListItems,
    sharePanelDismissed,
    setSharePanelDismissed,
    processAllPendingShares,
    handleClearShareQueue,
    handleRetryShareImports,
  } = useShareQueue({
    opfsReady,
    ingestBusy,
    setIngestBusy,
    ensureVault,
    ingestFromFile,
    indexAndPersistEmbedding,
    showToast,
    isDuplicateContent,
    setDocs,
  });

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

  const handleSaveTextNote = useCallback(async (rawText, meta) => {
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
      const name = meta?.title
        ? `${meta.title}.txt`
        : `Note — ${preview}${text.length > 40 ? "…" : ""}.txt`;
      const tag = meta?.tag && meta.tag !== "Unsorted" ? meta.tag : inferTagForNote(text);
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
      const stamp = new Date().toISOString().slice(0, 10);
      try {
        localStorage.setItem("silo_last_backup", stamp);
      } catch {
        /* ignore */
      }
      setLastBackupExport(stamp);
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
      const parsed = parseVaultZip(buf);
      const check = validateVaultZip(parsed);
      if (!check.ok) throw new Error(check.error);
      await createPreImportSnapshot(vault);
      await applyVaultZipToOpfs(vault, parsed.files, parsed.manifest.entries);
      setVaultEpoch((x) => x + 1);
      showToast(`Backup merged — ${check.entryCount} item(s)`);
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

  const handleTranscriptionFallbackSave = useCallback(async (text) => {
    if (!transcriptionFallback) return;
    const { docId, vault } = transcriptionFallback;
    const doc = docs.find((d) => d.id === docId);
    setIngestBusy(true);
    try {
      await persistSecureText(vault, docId, text, vaultPassphrase);
      setContentById((prev) => ({ ...prev, [docId]: text }));
      if (doc) await indexAndPersistEmbedding(vault, docId, doc, text);
      const entries = await loadManifest(vault);
      const idx = entries.findIndex((e) => e.id === docId);
      if (idx >= 0) {
        entries[idx] = { ...entries[idx], extractionStatus: "complete", extractionError: undefined };
        await saveManifest(vault, entries);
      }
      showToast("Transcript saved");
      setTranscriptionFallback(null);
    } catch (err) {
      console.error(err);
      showToast("Could not save transcript");
    } finally {
      setIngestBusy(false);
    }
  }, [transcriptionFallback, docs, vaultPassphrase, indexAndPersistEmbedding, showToast]);

  const handlePassphraseConfirm = useCallback(async (passphrase, confirm) => {
    if (passphraseModal === "set") {
      if (!passphrase) {
        setPassphraseModal(null);
        return;
      }
      if (passphrase.length < 8) {
        showToast("Passphrase too short");
        return;
      }
      if (passphrase !== confirm) {
        showToast("Mismatch");
        return;
      }
      setIngestBusy(true);
      try {
        await rewrapAllVaultText(passphrase, vaultPassphrase);
        setVaultPassphrase(passphrase);
        setVaultEpoch((x) => x + 1);
        showToast("Vault text encrypted with passphrase");
        setPassphraseModal(null);
      } finally {
        setIngestBusy(false);
      }
      return;
    }
    if (passphraseModal === "clear") {
      if (!vaultPassphrase) {
        showToast("No passphrase set");
        setPassphraseModal(null);
        return;
      }
      if (passphrase !== vaultPassphrase) {
        showToast("Wrong passphrase");
        return;
      }
      setIngestBusy(true);
      try {
        await rewrapAllVaultText("", vaultPassphrase);
        setVaultPassphrase("");
        setVaultEpoch((x) => x + 1);
        showToast("Passphrase cleared");
        setPassphraseModal(null);
      } finally {
        setIngestBusy(false);
      }
    }
  }, [passphraseModal, vaultPassphrase, rewrapAllVaultText, showToast]);

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

  const settingsIconSize = 20;
  const settingsActions = useMemo(() => [
    {
      id: "lists",
      label: "Open Silo Lists (shared checklists)",
      icon: <IconLists size={settingsIconSize} />,
      onSelect: () => {
        onOpenLists?.();
        setSettingsOpen(false);
      },
    },
    { id: "export", label: "Export backup (.zip)", icon: <IconExport size={settingsIconSize} />, onSelect: () => { void handleExportVaultZip(); } },
    { id: "import", label: "Import / merge backup", icon: <IconImport size={settingsIconSize} />, onSelect: () => { backupImportRef.current?.click(); } },
    {
      id: "folder",
      label: "Import folder (Chrome)",
      icon: <IconFolder size={settingsIconSize} />,
      disabled: !supportsDirectoryPicker(),
      onSelect: () => { void handleImportFolderFromDisk(); },
    },
    { id: "integrity", label: "Check vault integrity", icon: <IconCheck size={settingsIconSize} />, onSelect: () => { void handleCheckVaultIntegrity(); } },
    { id: "repair", label: "Repair vault (rebuild text/embeddings)", icon: <IconRefresh size={settingsIconSize} />, onSelect: () => { void handleRepairVault(); } },
    {
      id: "retryshares",
      label: "Retry pending share imports",
      icon: <IconRefresh size={settingsIconSize} />,
      disabled: importQueueCount === 0 || ingestBusy,
      keepOpen: true,
      onSelect: () => { void handleRetryShareImports(); },
    },
    { id: "clearshares", label: "Clear pending shares queue", icon: <IconBan size={settingsIconSize} />, onSelect: () => { void handleClearShareQueue(); } },
    {
      id: "semantic",
      label: semanticSearchEnabled ? "Semantic search: on" : "Semantic search: off",
      icon: <IconSparkles size={settingsIconSize} />,
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
      icon: <IconTrash size={settingsIconSize} />,
      disabled: !opfsReady || ingestBusy,
      onSelect: () => { void handleClearSemanticIndex(); },
    },
    {
      id: "resetvault",
      label: "Reset vault (delete all local data)",
      icon: <IconWarning size={settingsIconSize} />,
      danger: true,
      disabled: !opfsReady || ingestBusy,
      onSelect: () => { setConfirmResetOpen(true); },
    },
    {
      id: "pass",
      label: "Set vault passphrase (encrypts index text)",
      icon: <IconLock size={settingsIconSize} />,
      onSelect: () => setPassphraseModal("set"),
    },
    {
      id: "clearpass",
      label: "Clear vault passphrase",
      icon: <IconUnlock size={settingsIconSize} />,
      onSelect: () => setPassphraseModal("clear"),
    },
    {
      id: "privacy",
      label: "Privacy policy",
      icon: <IconInfo size={settingsIconSize} />,
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
    if (action === "Open") {
      void handleOpenDoc(doc);
      return;
    }
    if (action === "Preview") {
      setPreviewDoc(doc);
      return;
    }
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
  }, [showToast, contentById, handleDownloadDoc, handleOpenDoc]);

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

  const needsAttention = useMemo(() => {
    /** @type {Array<{ label: string, action?: () => void }>} */
    const items = [];
    const hasLocal = docs.some((d) => d.source === "local");
    if (hasLocal && !lastBackupExport) {
      items.push({ label: "No backup yet — export a ZIP from Settings", action: () => setSettingsOpen(true) });
    }
    if (importQueueCount > 0) {
      items.push({ label: `${importQueueCount} share import(s) pending`, action: () => { void handleRetryShareImports(); } });
    }
    if (shareQueueFailedCount > 0) {
      items.push({ label: `${shareQueueFailedCount} failed share import(s)`, action: () => setSettingsOpen(true) });
    }
    if (vaultHealthReport && !vaultHealthReport.healthy && vaultHealthReport.summary.critical > 0) {
      items.push({ label: "Vault health issues — review recovery", action: () => { void handleCheckVaultIntegrity(); } });
    }
    return items;
  }, [docs, lastBackupExport, importQueueCount, shareQueueFailedCount, vaultHealthReport, handleRetryShareImports, handleCheckVaultIntegrity]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t?.trim()) await handleSaveTextNote(t.trim());
      else showToast("Clipboard is empty");
    } catch {
      showToast("Clipboard access denied");
    }
  }, [handleSaveTextNote, showToast]);

  const listCallbacks = {
    onDocOpen: handlePointerUp,
    onDocPreview: (d) => setPreviewDoc(d),
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onSwipeDelete: (d) => setConfirmDeleteDoc(d),
    onSwipeMore: (d) => setContextMenu({ doc: d }),
    onSwipeBackup: () => {
      setSettingsOpen(true);
      showToast("Export a backup ZIP from Settings");
    },
    onSwipePin: handleTogglePin,
    pinnedIds,
    onCardKeyDown: handleCardKeyDown,
  };

  useEffect(() => {
    if (mobileTab === "search") {
      const t = window.setTimeout(() => document.getElementById("silo-global-search")?.focus(), 60);
      return () => window.clearTimeout(t);
    }
    if (mobileTab === "settings") {
      setSettingsOpen(true);
      setMobileTab("home");
    }
    return undefined;
  }, [mobileTab]);

  useEffect(() => {
    if (previewDoc && !docs.some((d) => d.id === previewDoc.id)) setPreviewDoc(null);
  }, [docs, previewDoc]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMobileTab("search");
        window.setTimeout(() => document.getElementById("silo-global-search")?.focus(), 40);
      }
      if (e.key === "Escape" && query.trim()) {
        setQuery("");
        setQueryVec(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [query, setQueryVec]);

  return (
    <div className="app-shell silo-app-shell">
      {vaultUnlockGate && opfsReady && (
        <UnlockScreen onUnlock={handleVaultUnlock} onSkip={handleVaultUnlockSkip} error={unlockError} />
      )}

      {showInstallBanner && deferredPrompt && (
        <div style={{ gridColumn: "1 / -1", paddingTop: "var(--safe-top)" }}>
          <InstallBanner onInstall={() => void pwaInstall()} onDismiss={dismissInstallBanner} />
        </div>
      )}

      {updateReady && (
        <div style={{ gridColumn: "1 / -1", paddingTop: "var(--safe-top)" }}>
          <UpdateAvailableBanner onReload={reloadToUpdate} onDismiss={dismissUpdate} />
        </div>
      )}

      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset entire vault?"
        body="This deletes all documents stored in Silo on this device (OPFS). Linked file handles are cleared. This cannot be undone."
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
        title={confirmDeleteDoc ? `Delete “${confirmDeleteDoc.name}”?` : "Delete item?"}
        body={
          confirmDeleteDoc
            ? "This removes the file and its search index from this device. This cannot be undone unless you have a backup."
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
          activeTab={mobileTab}
          storageLabel={vaultStatusLabel}
          backupLabel={lastBackupExport ? `Last backup ${lastBackupExport}` : "No backup yet"}
          onTab={(id) => {
            if (id === "add") {
              setIngestDialogOpen(true);
              return;
            }
            setMobileTab(id);
            bumpMeaningfulInteraction();
          }}
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
          onOpenLists={onOpenLists}
        />
      </div>

      <SiloTopBar
        subtitle={vaultStatusLabel}
        onSettings={() => {
          setSettingsOpen(true);
          bumpMeaningfulInteraction();
        }}
      />

      <div className="app-shell__main">
        <div ref={mainInnerRef} className="app-shell__main-inner has-mobile-shell">
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

          {ingestError && (
            <Banner variant="warning">{ingestError}</Banner>
          )}

          <div className={`home-screen-view ${showHomePanel ? "home-screen-view--active" : ""}`}>
            <HomeScreen
              docs={docs}
              contentById={contentById}
              vaultStatusLabel={vaultStatusLabel}
              vaultMeta={vaultMeta}
              backupRecommended={backupRecommended}
              needsAttention={needsAttention}
              ingestBusy={ingestBusy}
              onAddFile={() => handlePickVaultFiles("any")}
              onAddPhoto={() => handlePickVaultFiles("image")}
              onAddNote={() => setNoteModalOpen(true)}
              onAddVoice={() => handlePickVaultFiles("audio")}
              onOpenDoc={(d) => { void handleOpenDoc(d); }}
              onViewAll={() => setMobileTab("vault")}
              onSearch={() => setMobileTab("search")}
              onBackup={() => {
                setSettingsOpen(true);
                void handleExportVaultZip();
              }}
              onOpenLists={onOpenLists}
              onCollection={(name) => {
                if (name === "Needs backup") {
                  setSettingsOpen(true);
                  void handleExportVaultZip();
                  return;
                }
                if (name === "All") {
                  setActiveTag("All");
                  setSmartView("");
                } else if (name === "Recent" || name === "Voice" || name === "Screenshots") {
                  setSmartView(name === "Recent" ? "Recent" : name);
                  setActiveTag("All");
                } else if (["Identity", "Finance", "Housing"].includes(name)) {
                  setActiveTag(name);
                  setSmartView("");
                } else if (name === "PDFs" || name === "Images" || name === "Notes") {
                  setMobileTab("search");
                  setSearchFilter(name === "PDFs" ? "PDF" : name === "Images" ? "Images" : "Notes");
                  setActiveTag("All");
                  setSmartView("");
                  return;
                } else {
                  setActiveTag(name);
                  setSmartView("");
                }
                setMobileTab("vault");
              }}
            />
          </div>

          <div className={`search-screen-view ${showSearchPanel ? "search-screen-view--active" : ""}`}>
            <SearchScreen
              query={query}
              onQueryChange={handleQueryChange}
              onSearchBlur={handleSearchBlur}
              display={display}
              contentById={contentById}
              vaultListLoading={vaultListLoading}
              embeddingSearchBusy={embeddingSearchBusy}
              semanticSearchEnabled={semanticSearchEnabled}
              embeddingModelReady={embeddingModelReady}
              searchFilter={searchFilter}
              onSearchFilter={setSearchFilter}
              onAddNote={() => setNoteModalOpen(true)}
              onClearSearch={() => {
                setQuery("");
                setQueryVec(null);
              }}
              {...listCallbacks}
            />
          </div>

          <div className={`vault-main-view ${showVaultPanel ? "vault-main-view--active" : ""}`}>
          <VaultScreen
            itemCount={docs.length}
            totalGB={totalGB}
            vaultStatusLabel={vaultStatusLabel}
            backupLabel={lastBackupExport ? `Last backup ${lastBackupExport}` : "No backup yet"}
            passphraseSet={!!vaultPassphrase}
            indexReady={!vaultListLoading}
            tags={ALL_TAGS}
            activeTag={activeTag}
            onTag={(t) => {
              setActiveTag(t);
              bumpMeaningfulInteraction();
            }}
            display={display}
            query={query}
            contentById={contentById}
            hasResults={hasResults}
            vaultListLoading={vaultListLoading}
            emptyVariant={emptyVariant}
            ingestBusy={ingestBusy}
            onOpenCapture={() => setIngestDialogOpen(true)}
            {...listCallbacks}
          />
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
          </div>

        {showVaultPanel && (
        <div className="search-dock">
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            isSearching={embeddingSearchBusy && !!query.trim()}
            semanticReady={!semanticSearchEnabled || embeddingModelReady}
            semanticLabel={semanticSearchEnabled ? (embeddingModelReady ? "Semantic ✓" : "Loading AI…") : ""}
            placeholder="Search files, notes, text, screenshots…"
            resultCount={searchResultCount}
            onBlur={handleSearchBlur}
          />
        </div>
        )}
      </div>
      </div>

      <div className={`app-shell__preview ${previewDoc ? "app-shell__preview--open" : ""}`}>
        <PreviewPanel
          doc={previewDoc}
          contentSnippet={previewDoc ? (contentById[previewDoc.id] ?? "") : ""}
          onOpen={(d) => { void handleOpenDoc(d); }}
          onExport={handleDownloadDoc}
          onRename={(d) => setRenameDoc(d)}
          onDelete={(d) => setConfirmDeleteDoc(d)}
          onClose={() => setPreviewDoc(null)}
        />
      </div>

      <BottomNav
        activeTab={mobileTab}
        badgeCount={importQueueCount}
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
        linkFromDiskSupported={supportsLinkFromDisk()}
        onPickFiles={(kind) => {
          handlePickVaultFiles(kind);
          setIngestDialogOpen(false);
        }}
        onLinkDisk={() => { void handleLinkFromDisk(); }}
        onNewNote={() => setNoteModalOpen(true)}
        onPasteClipboard={() => { void handlePasteFromClipboard(); }}
        onImportBackup={() => { backupImportRef.current?.click(); }}
      />

      <AnimatePresence>
        {privacyOpen && <PrivacyModal key="privacy" onClose={() => setPrivacyOpen(false)} />}
      </AnimatePresence>

      {/* ── Overlays ── */}
      <AnimatePresence>
        {noteModalOpen && (
          <NoteModal
            onSave={(t, meta) => { void handleSaveTextNote(t, meta); }}
            onCancel={() => setNoteModalOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsDrawer onClose={() => setSettingsOpen(false)} actions={settingsActions}>
            <div className="settings-extras">
              <SettingsGroup title="Backup & restore">
                <BackupRestorePanel
                  itemCount={docs.filter((d) => d.source === "local").length}
                  vaultSizeBytes={vaultSizeBytes}
                  lastBackupHint={lastBackupExport || undefined}
                  busy={ingestBusy}
                  onExport={() => { void handleExportVaultZip(); }}
                  onImport={() => { backupImportRef.current?.click(); }}
                  onCheckHealth={() => { void handleCheckVaultIntegrity(); }}
                />
              </SettingsGroup>
              {storageStats && (
                <SettingsGroup title="Storage">
                  <p className="settings-meta">
                    {(storageStats.usage / (1024 * 1024)).toFixed(1)} MB used on this device
                    {storageStats.quota ? ` of ${(storageStats.quota / (1024 * 1024)).toFixed(0)} MB quota` : ""}.
                  </p>
                </SettingsGroup>
              )}
              <SettingsGroup title="Appearance">
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
              </SettingsGroup>
              <SettingsGroup title="About">
                <p className="settings-meta">
                  <a href={`${import.meta.env.BASE_URL}native/README.md`.replace(/\/{2,}/g, "/")} target="_blank" rel="noopener noreferrer">
                    Android TWA / native packaging guide
                  </a>
                </p>
              </SettingsGroup>
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
        {passphraseModal && (
          <PassphraseModal
            key={passphraseModal}
            mode={passphraseModal}
            busy={ingestBusy}
            onConfirm={(p, c) => { void handlePassphraseConfirm(p, c); }}
            onCancel={() => setPassphraseModal(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {transcriptionFallback && (
          <TranscriptionFallbackModal
            fileName={transcriptionFallback.fileName}
            busy={ingestBusy}
            onSave={(t) => { void handleTranscriptionFallbackSave(t); }}
            onSkip={() => setTranscriptionFallback(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>

    </div>
  );
}
