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
import { buildVaultSearchIndex } from "./vault/searchIndex.js";
import { topMatchingDocIds } from "./vault/vectorSearch.js";
import { mergeSearchIds } from "./vault/hybridSearch.js";
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
import { useStorageMode } from "./hooks/useStorageMode.js";
import { usePWAInstall, bumpMeaningfulInteraction } from "./hooks/usePWAInstall.js";
import "./silo-app.css";

/** Same artwork as favicon / PWA manifest (`public/icons/icon.svg`) */
const APP_ICON_SRC = `${import.meta.env.BASE_URL}icons/icon.svg`.replace(/\/{2,}/g, "/");

const DEFAULT_VAULT_FILE_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.heic,.heif,.m4a,.aac,.mp3,.wav,.webm,.ogg,.opus,.flac,application/pdf,image/*,audio/*";

/** @type {Record<string, string>} */
const VAULT_FILE_ACCEPT_BY_KIND = {
  pdf: ".pdf,application/pdf",
  image: ".png,.jpg,.jpeg,.gif,.webp,.bmp,.heic,.heif,image/*",
  audio: ".m4a,.aac,.mp3,.wav,.webm,.ogg,.opus,.flac,audio/*",
  any: DEFAULT_VAULT_FILE_ACCEPT,
};

// ─── Data ────────────────────────────────────────────────────────────────────

const SEED_DOCS = [
  { id: 1,  name: "passport_scan.pdf",      tag: "Identity",  kind: "pdf",  date: "Mar 12, 2024", size: "2.1 MB",  source: "demo", createdAt: "2024-03-12T12:00:00.000Z" },
  { id: 2,  name: "drivers_license.pdf",    tag: "Identity",  kind: "pdf",  date: "Jan 08, 2024", size: "980 KB", source: "demo", createdAt: "2024-01-08T12:00:00.000Z" },
  { id: 11, name: "sincard.pdf",            tag: "Identity",  kind: "pdf",  date: "May 01, 2023", size: "150 KB", source: "demo", createdAt: "2023-05-01T12:00:00.000Z" },
  { id: 3,  name: "hydro_bill_feb.pdf",     tag: "Utilities", kind: "pdf",  date: "Feb 28, 2024", size: "340 KB", source: "demo", createdAt: "2024-02-28T12:00:00.000Z" },
  { id: 8,  name: "hydro_bill_jan.pdf",     tag: "Utilities", kind: "pdf",  date: "Jan 29, 2024", size: "310 KB", source: "demo", createdAt: "2024-01-29T12:00:00.000Z" },
  { id: 4,  name: "lease_agreement.pdf",    tag: "Housing",   kind: "pdf",  date: "Sep 01, 2023", size: "4.8 MB", source: "demo", createdAt: "2023-09-01T12:00:00.000Z" },
  { id: 12, name: "lease_renewal_2024.pdf", tag: "Housing",   kind: "pdf",  date: "Mar 15, 2024", size: "3.1 MB", source: "demo", createdAt: "2024-03-15T12:00:00.000Z" },
  { id: 5,  name: "t4_2023.pdf",            tag: "Tax",       kind: "pdf",  date: "Feb 20, 2024", size: "1.2 MB", source: "demo", createdAt: "2024-02-20T12:00:00.000Z" },
  { id: 9,  name: "bank_statement_mar.pdf", tag: "Finance",   kind: "pdf",  date: "Mar 31, 2024", size: "890 KB", source: "demo", createdAt: "2024-03-31T12:00:00.000Z" },
  { id: 10, name: "void_cheque.pdf",        tag: "Finance",   kind: "pdf",  date: "Nov 10, 2023", size: "220 KB", source: "demo", createdAt: "2023-11-10T12:00:00.000Z" },
  { id: 6,  name: "insurance_auto.pdf",     tag: "Insurance", kind: "pdf",  date: "Jan 15, 2024", size: "2.6 MB", source: "demo", createdAt: "2024-01-15T12:00:00.000Z" },
  { id: 7,  name: "college_diploma.pdf",    tag: "Education", kind: "pdf",  date: "Jun 15, 2022", size: "5.3 MB", source: "demo", createdAt: "2022-06-15T12:00:00.000Z" },
  {
    id: 20,
    name: "WhatsApp — rent reminder.txt",
    tag: "Moments",
    kind: "text",
    date: "Apr 02, 2024",
    size: "420 B",
    source: "demo",
    createdAt: "2024-04-02T18:30:00.000Z",
  },
];

/** Extra phrases so demo search behaves more like semantic "concepts" */
const DEMO_INDEX_BOOST = {
  1: "passport travel identity citizenship",
  2: "driver license driving permit identification",
  11: "social insurance national identity card",
  3: "hydro electricity utility bill power",
  8: "hydro electricity utility bill power",
  4: "lease rent housing apartment landlord",
  12: "lease renewal housing rent",
  5: "income tax t4 employment earnings",
  9: "bank account statement finance",
  10: "cheque checking account void finance",
  6: "auto vehicle car insurance policy",
  7: "university college degree diploma education",
  20: "whatsapp message forwarded note self chat reminder landlord rent due april",
};

const TAG_META = {
  Identity:  { color: "#C8963E", bg: "rgba(200,150,62,0.10)",  label: "ID"  },
  Utilities: { color: "#5B9BD5", bg: "rgba(91,155,213,0.10)",  label: "UTL" },
  Housing:   { color: "#6BBF7A", bg: "rgba(107,191,122,0.10)", label: "HSG" },
  Tax:       { color: "#C86E8A", bg: "rgba(200,110,138,0.10)", label: "TAX" },
  Finance:   { color: "#D4935A", bg: "rgba(212,147,90,0.10)",  label: "FIN" },
  Insurance: { color: "#9B7EC8", bg: "rgba(155,126,200,0.10)", label: "INS" },
  Education: { color: "#C8B43E", bg: "rgba(200,180,62,0.10)",  label: "EDU" },
  Moments:   { color: "#5BC8C4", bg: "rgba(91,200,196,0.10)",  label: "MSG" },
};

const ALL_TAGS = ["All", ...Object.keys(TAG_META)];

const DEMO_TEXT_BODY = {
  20: "Hey — reminder rent is due April 5. E-transfer to the usual address. Thx!",
};

function buildCombinedIndexText(doc, content) {
  const k = doc.kind || "pdf";
  const base = `${doc.name} ${doc.tag} ${k}`;
  return `${base} ${content || ""}`.trim();
}

function mergeDocs(seed, local) {
  const byId = new Map();
  for (const d of seed) byId.set(String(d.id), d);
  for (const d of local) byId.set(String(d.id), d);
  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
}

const SMART_VIEWS = [
  { id: "Recent",    label: "Recent",    match: (d) => daysSince(d.createdAt) <= 7 },
  { id: "Voice",     label: "Voice",     match: (d) => (d.kind || "") === "audio" },
  { id: "Screenshots", label: "Shots",   match: (d, ctx) => (d.kind || "") === "image" || /screenshot|screen\s*shot/i.test(d.name + (ctx.contentById?.[d.id] || "")) },
  { id: "LowOCR",    label: "Low OCR",   match: (d, ctx) => (d.kind || "") === "image" && String(ctx.contentById?.[d.id] || "").trim().length < 24 },
  { id: "Duplicates", label: "Dupes",   match: (d, ctx) => d.source === "local" && ((d.contentHash && ctx.duplicateHashes?.has(d.contentHash)) || (d.textFingerprint && ctx.duplicateFingerprints?.has(d.textFingerprint))) },
];

function daysSince(iso) {
  const t = new Date(iso || 0).getTime();
  if (!Number.isFinite(t)) return 999;
  return (Date.now() - t) / (86400 * 1000);
}

function supportsDirectoryPicker() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseMB(sizeStr) {
  const n = parseFloat(sizeStr);
  return sizeStr.includes("MB") ? n : n / 1024;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatRelativeDate(iso) {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffSec = Math.round((d.getTime() - now) / 1000);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const abs = Math.abs(diffSec);
    if (abs < 60) return rtf.format(0, "second");
    if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
    if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), "day");
    if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / (86400 * 7)), "week");
    if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
    return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
  } catch {
    return formatDate(iso);
  }
}

/** @param {string} text */
function inferTagGuess(text) {
  const t = text.toLowerCase();
  if (/passport|driver|license|sin card|identity|citizenship/.test(t)) return "Identity";
  if (/hydro|utility|electric|water|gas bill/.test(t)) return "Utilities";
  if (/lease|rent|landlord|tenant|housing/.test(t)) return "Housing";
  if (/\bt4\b|tax return|income tax|irs|cra/.test(t)) return "Tax";
  if (/bank|statement|cheque|check|finance|account/.test(t)) return "Finance";
  if (/insurance|policy|premium|auto coverage/.test(t)) return "Insurance";
  if (/diploma|degree|university|college|education/.test(t)) return "Education";
  if (/whatsapp|telegram|signal|imessage|slack|discord|texted|fwd:|forwarded/.test(t)) return "Moments";
  if (/screenshot|screen\s*shot|photo|camera|image|png|jpeg|jpg/.test(t)) return "Moments";
  return "Identity";
}

/** @param {string} text */
function inferTagForNote(text) {
  const t = text.toLowerCase();
  if (/whatsapp|telegram|signal|imessage|slack|discord|texted|fwd:|forwarded|dm /.test(t)) return "Moments";
  return inferTagGuess(text);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="toast-fixed"
    >
      {message}
    </motion.div>
  );
}

function RenameModal({ doc, onConfirm, onCancel }) {
  const extMatch = doc.name.match(/(\.[^.]+)$/);
  let ext = extMatch ? extMatch[1] : "";
  if (doc.kind === "text") ext = ".txt";
  else if (!ext) ext = doc.kind === "pdf" ? ".pdf" : "";
  const baseInitial = ext ? doc.name.slice(0, doc.name.length - ext.length) : doc.name;
  const [value, setValue] = useState(baseInitial);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e) => {
    const next = (value.trim() || "untitled") + ext;
    if (e.key === "Enter")  onConfirm(next);
    if (e.key === "Escape") onCancel();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", zIndex: 1300 }}
        onClick={onCancel}
      />
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: "calc(100% - 56px)", maxWidth: 400,
          background: "#111", border: "1px solid #282828", borderRadius: 24, padding: 24, zIndex: 1400,
        }}
        role="dialog" aria-modal="true" aria-label="Rename item"
      >
        <div style={{ fontSize: 11, color: "#848480", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
          Rename
        </div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 12,
          padding: "10px 14px", color: "#EDECEA", fontSize: 16,
          fontFamily: "'JetBrains Mono', monospace", outline: "none",
        }}
        />
        <div style={{ fontSize: 10, color: "#3A3A38", marginTop: 8 }}>{ext ? `Keeps extension ${ext}` : "No extension enforced"}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid #282828",
              background: "transparent", color: "#848480", fontSize: 13, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm((value.trim() || "untitled") + ext)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
              background: "#C8963E", color: "#000", fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Save
          </button>
        </div>
      </motion.div>
    </>
  );
}

function NoteModal({ onSave, onCancel }) {
  const [body, setBody] = useState("");
  const taRef = useRef(null);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const handlePaste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setBody((b) => (b ? `${b}\n${t}` : t));
    } catch {
      /* no permission */
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const t = body.trim();
      if (t) onSave(t);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", zIndex: 1300 }}
        onClick={onCancel}
      />
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: "calc(100% - 56px)", maxWidth: 400,
          background: "#111", border: "1px solid #282828", borderRadius: 24, padding: 24, zIndex: 1400,
        }}
        role="dialog" aria-modal="true" aria-label="New text note"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 11, color: "#848480", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Text note
        </div>
        <div style={{ fontSize: 10, color: "#3A3A38", marginBottom: 12 }}>
          Paste a message you would have sent yourself — like WhatsApp to self.
        </div>
        <textarea
          ref={taRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={8}
          placeholder="Type or paste…"
          style={{
            width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 140,
            background: "#1A1A1A", border: "1px solid #2a2a2a", borderRadius: 12,
            padding: "12px 14px", color: "#EDECEA", fontSize: 16,
            fontFamily: "'JetBrains Mono', monospace", outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handlePaste}
            style={{
              padding: "8px 14px", borderRadius: 12, border: "1px solid #282828",
              background: "transparent", color: "#848480", fontSize: 12, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Paste from clipboard
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid #282828",
              background: "transparent", color: "#848480", fontSize: 13, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { const t = body.trim(); if (t) onSave(t); }}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
              background: "#5BC8C4", color: "#000", fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Save to vault
          </button>
        </div>
      </motion.div>
    </>
  );
}

function ContextMenu({ doc, onAction, onClose }) {
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const actions = [
    { label: "Summarize", icon: "≡", danger: false },
    { label: "Share",    icon: "↑", danger: false },
    { label: "Download", icon: "↓", danger: false },
    { label: "Rename",   icon: "✎", danger: false },
    { label: "Delete",   icon: "✕", danger: true  },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)", zIndex: 1100 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="settings-sheet-panel"
        role="dialog" aria-modal="true" aria-label={`Actions for ${doc.name}`}
      >
        <div style={{ width: 36, height: 4, background: "#2a2a2a", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 12, color: "#848480", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {doc.name}
        </div>
        <div style={{ fontSize: 10, color: "#3A3A38", marginBottom: 20 }}>{doc.date} · {doc.size}</div>
        {actions.map((action, i) => (
          <button
            key={action.label}
            ref={i === 0 ? firstRef : null}
            onClick={() => onAction(action.label, doc)}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", padding: "14px 0", background: "transparent",
              border: "none", borderBottom: i < actions.length - 1 ? "1px solid #1A1A1A" : "none",
              color: action.danger ? "#C86E8A" : "#EDECEA",
              fontSize: 14, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", textAlign: "left",
            }}
          >
            <span>{action.label}</span>
            <span style={{ fontSize: 16, opacity: 0.6 }}>{action.icon}</span>
          </button>
        ))}
      </motion.div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/** @param {{ onOpenLists?: () => void }} props */
export default function Silo({ onOpenLists }) {
  const [activeTag,     setActiveTag]     = useState("All");
  const [query,         setQuery]         = useState("");
  const [docs,          setDocs]          = useState(() => SEED_DOCS.map((d) => ({ ...d, kind: d.kind || "pdf" })));
  const [contentById,  setContentById]   = useState(() => {
    const o = {};
    for (const d of SEED_DOCS) {
      if (d.kind === "text" && DEMO_TEXT_BODY[d.id]) o[d.id] = DEMO_TEXT_BODY[d.id];
      else o[d.id] = `${String(d.name).replace(/\.(pdf|txt)$/i, "").replace(/_/g, " ")} ${d.tag} ${DEMO_INDEX_BOOST[d.id] || ""}`;
    }
    return o;
  });
  const [opfsReady,     setOpfsReady]     = useState(false);
  const [nativeLinkReady, setNativeLinkReady] = useState(false);
  const [ingestBusy,    setIngestBusy]    = useState(false);
  const [ingestError,   setIngestError]   = useState(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [embeddingsById, setEmbeddingsById] = useState({});
  const [queryVec, setQueryVec] = useState(null);

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
  const [embeddingSearchBusy, setEmbeddingSearchBusy] = useState(false);
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

  const searchIndex = useMemo(() => {
    const rows = docs.map((d) => ({
      id: d.id,
      name: d.name,
      tag: d.tag,
      kind: d.kind || "pdf",
      content: buildCombinedIndexText(d, contentById[d.id] ?? ""),
    }));
    return buildVaultSearchIndex(rows);
  }, [docs, contentById]);

  // ── Demo docs: local embeddings for hybrid semantic search ──
  useEffect(() => {
    if (!semanticSearchEnabled) return;
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

  // ── Query embedding (debounced) for semantic leg of search ──
  useEffect(() => {
    const t = query.trim();
    if (!t || !semanticSearchEnabled) {
      setQueryVec(null);
      setEmbeddingSearchBusy(false);
      return;
    }
    setEmbeddingSearchBusy(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { embedText } = await import("./vault/embeddings.js");
          const v = await embedText(t);
          if (!cancelled) setQueryVec(v);
        } catch {
          if (!cancelled) setQueryVec(null);
        } finally {
          if (!cancelled) setEmbeddingSearchBusy(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, semanticSearchEnabled]);

  const duplicateHashes = useMemo(() => {
    const counts = new Map();
    for (const d of docs) {
      if (d.source !== "local" || !d.contentHash) continue;
      counts.set(d.contentHash, (counts.get(d.contentHash) || 0) + 1);
    }
    const dup = new Set();
    for (const [h, c] of counts) if (c > 1) dup.add(h);
    return dup;
  }, [docs]);

  const duplicateFingerprints = useMemo(() => {
    const counts = new Map();
    for (const d of docs) {
      if (d.source !== "local" || !d.textFingerprint) continue;
      counts.set(d.textFingerprint, (counts.get(d.textFingerprint) || 0) + 1);
    }
    const dup = new Set();
    for (const [h, c] of counts) if (c > 1) dup.add(h);
    return dup;
  }, [docs]);

  // ── Filtered display data ──
  const display = useMemo(() => {
    const q = query.trim();
    let idSet = null;
    if (q) {
      const textIds = searchIndex.matchingDocIds(q);
      const hasEmb = Object.keys(embeddingsById).length > 0;
      if (semanticSearchEnabled && queryVec && hasEmb) {
        const vecIds = topMatchingDocIds(embeddingsById, queryVec, 0.28, 120);
        idSet = mergeSearchIds(textIds, vecIds, 0.42);
      } else {
        idSet = textIds;
      }
    }
    const filtered = docs.filter((d) => {
      const tagOk = activeTag === "All" || d.tag === activeTag;
      const idOk = idSet == null || idSet.has(String(d.id));
      if (!tagOk || !idOk) return false;
      if (!smartView) return true;
      const sv = SMART_VIEWS.find((s) => s.id === smartView);
      if (!sv) return true;
      const ctx = { contentById, duplicateHashes, duplicateFingerprints };
      return sv.match(d, ctx);
    });
    const tagOrder = Object.keys(TAG_META);
    const extra = [...new Set(filtered.map((d) => d.tag))].filter((t) => !TAG_META[t]).sort();
    const orderedTags = [...tagOrder.filter((t) => filtered.some((d) => d.tag === t)), ...extra];
    return orderedTags.reduce((acc, tag) => {
      const items = filtered.filter((doc) => doc.tag === tag);
      if (items.length) acc[tag] = items;
      return acc;
    }, {});
  }, [docs, activeTag, query, searchIndex, embeddingsById, queryVec, smartView, contentById, duplicateHashes, duplicateFingerprints, semanticSearchEnabled]);

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
      setDocs(SEED_DOCS.map((d) => ({ ...d, kind: d.kind || "pdf" })));
      const demoContent = {};
      for (const d of SEED_DOCS) {
        if (d.kind === "text" && DEMO_TEXT_BODY[d.id]) demoContent[d.id] = DEMO_TEXT_BODY[d.id];
        else demoContent[d.id] = `${String(d.name).replace(/\.(pdf|txt)$/i, "").replace(/_/g, " ")} ${d.tag} ${DEMO_INDEX_BOOST[d.id] || ""}`;
      }
      setContentById(demoContent);
      setEmbeddingsById({});
      setPreviewDoc(null);
      setVaultUnlockGate(false);
      setVaultEpoch((x) => x + 1);
      showToast("Vault reset — demo items restored");
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
                    title={opfsReady ? "Vault ready" : "Demo mode"}
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
