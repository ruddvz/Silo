import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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
} from "./vault/opfs.js";
import {
  supportsNativeFileSystemLink,
  pickFilesFromDisk,
  storeLinkedFileHandle,
  getLinkedFile,
  removeLinkedFileHandle,
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
import { persistSecureText, decodeStoredText } from "./vault/secureText.js";
import { sha256HexFromBlob } from "./vault/fileHash.js";
import { textContentFingerprint } from "./vault/textFingerprint.js";
import { checkVaultIntegrity } from "./vault/integrity.js";
import { repairVaultEntry } from "./vault/repair.js";
import { summarizeExtractive } from "./vault/summarize.js";

/** Same artwork as favicon / PWA manifest (`public/icons/icon.svg`) */
const APP_ICON_SRC = `${import.meta.env.BASE_URL}icons/icon.svg`.replace(/\/{2,}/g, "/");

/** Bottom sheet: never use left:50% + translateX here — Framer Motion overwrites `transform` and breaks centering. */
const BOTTOM_SHEET_PANEL = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  marginLeft: "auto",
  marginRight: "auto",
  width: "100%",
  maxWidth: 480,
  boxSizing: "border-box",
  background: "#111",
  borderTop: "1px solid #1E1E1E",
  borderRadius: "24px 24px 0 0",
  padding: "20px 28px calc(28px + env(safe-area-inset-bottom, 0px))",
  zIndex: 1200,
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

function kindLabel(kind, storage) {
  if (storage === "linked" && kind !== "text") return "LNK";
  if (kind === "text") return "MSG";
  if (kind === "audio") return "MIC";
  if (kind === "image") return "IMG";
  if (kind === "pdf") return "PDF";
  return "FILE";
}

function buildCombinedIndexText(doc, content) {
  const k = doc.kind || "pdf";
  const base = `${doc.name} ${doc.tag} ${k}`;
  return `${base} ${content || ""}`.trim();
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

function tagMeta(tag) {
  return TAG_META[tag] || { color: "#848480", bg: "rgba(132,132,128,0.10)", label: "…" };
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
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: 20, scale: 0.95 }}
      style={{
        position: "fixed", bottom: 110, left: "50%", transform: "translateX(-50%)",
        background: "rgba(30,30,30,0.95)", border: "1px solid #2a2a2a",
        borderRadius: 14, padding: "10px 20px", fontSize: 13, color: "#EDECEA",
        zIndex: 2000, whiteSpace: "nowrap", backdropFilter: "blur(10px)",
        pointerEvents: "none",
      }}
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

function SettingsDrawer({ onClose, actions }) {
  const firstRef = useRef(null);
  useEffect(() => {
    firstRef.current?.focus();
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 1100 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={BOTTOM_SHEET_PANEL}
        role="dialog" aria-modal="true" aria-label="Settings"
      >
        <div style={{ width: 36, height: 4, background: "#2a2a2a", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 11, color: "#848480", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
          Vault tools
        </div>
        {actions.map((opt, i) => (
          <button
            key={opt.id}
            ref={i === 0 ? firstRef : null}
            type="button"
            disabled={opt.disabled}
            onClick={() => {
              opt.onSelect?.();
              if (!opt.keepOpen) onClose();
            }}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", padding: "14px 0", background: "transparent",
              border: "none", borderBottom: i < actions.length - 1 ? "1px solid #1A1A1A" : "none",
              color: opt.danger ? "#C86E8A" : opt.disabled ? "#3A3A38" : "#EDECEA",
              fontSize: 14, cursor: opt.disabled ? "not-allowed" : "pointer",
              fontFamily: "'JetBrains Mono', monospace", textAlign: "left",
            }}
          >
            <span>{opt.label}</span>
            <span style={{ color: "#3A3A38", fontSize: 16 }}>{opt.icon}</span>
          </button>
        ))}
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
        style={BOTTOM_SHEET_PANEL}
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

export default function Silo() {
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
  const searchRef        = useRef(null);
  const styleInjected    = useRef(false);
  const vaultRef         = useRef(null);
  const vaultFileInputRef = useRef(null);
  const backupImportRef = useRef(null);
  const processAllPendingSharesRef = useRef(async () => {});
  const addMenuRef = useRef(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  useEffect(() => {
    if (vaultPassphrase) sessionStorage.setItem("silo_vault_pass", vaultPassphrase);
    else sessionStorage.removeItem("silo_vault_pass");
  }, [vaultPassphrase]);

  const refreshShareQueueCount = useCallback(async () => {
    try {
      const { total, failed } = await getShareQueueStats();
      setImportQueueCount(total);
      setShareQueueFailedCount(failed);
    } catch {
      setImportQueueCount(0);
      setShareQueueFailedCount(0);
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
    if (!addMenuOpen) return;
    const close = (e) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setAddMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setAddMenuOpen(false); };
    document.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [addMenuOpen]);

  useEffect(() => {
    styleInjected.current = true;

    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      :root {
        --bg: #080808; --s1: #0D0D0D; --s2: #111111;
        --b1: #1E1E1E; --b2: #282828;
        --t1: #EDECEA; --t2: #848480; --t3: #3A3A38;
        --amber: #C8963E;
        --mono: 'JetBrains Mono', monospace;
      }
      body { background: var(--bg); color: var(--t1); font-family: var(--mono); margin: 0; }
      html { -webkit-text-size-adjust: 100%; }
      *:focus-visible {
        outline: 2px solid var(--amber);
        outline-offset: 2px;
        border-radius: 6px;
      }
      .vault-root {
        max-width: 480px; margin: 0 auto; min-height: 100svh;
        padding-top: max(10px, env(safe-area-inset-top, 0px));
        padding-bottom: 120px; position: relative;
      }
      .vault-root::after {
        content: '';
        position: fixed; inset: 0; pointer-events: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
        opacity: 0.4; z-index: 999;
      }
      .doc-card {
        background: #0D0D0D; border: 1px solid #1E1E1E; border-radius: 22px;
        padding: 16px; margin: 0 28px 10px; display: flex; align-items: center; gap: 15px;
        cursor: pointer; position: relative; overflow: hidden;
        transition: border-color 0.15s;
      }
      .doc-card:hover  { border-color: #2a2a2a; }
      .doc-card:focus  { border-color: var(--amber); }
      .search-pill {
        position: fixed;
        bottom: max(30px, env(safe-area-inset-bottom, 0px));
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 56px); max-width: 424px;
        background: rgba(17,17,17,0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        border: 1px solid #282828; border-radius: 24px; padding: 14px 20px;
        display: flex; align-items: center; gap: 12px; z-index: 1000;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      }
      .search-input {
        background: transparent; border: none; outline: none; color: #fff;
        font-family: var(--mono); font-size: 16px; flex: 1; min-height: 1.25em;
      }
      .icon-btn {
        background: transparent; border: none; cursor: pointer;
        color: #848480; padding: 4px; display: flex; align-items: center; justify-content: center;
        border-radius: 6px; transition: color 0.15s;
      }
      .icon-btn:hover { color: #EDECEA; }
      .vault-select {
        appearance: none; -webkit-appearance: none;
        background: #111 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23848480' d='M3 4.5L6 7.5L9 4.5'/%3E%3C/svg%3E") no-repeat right 12px center;
        border: 1px solid #282828; border-radius: 12px;
        padding: 10px 34px 10px 14px; color: #EDECEA; font-size: 16px;
        font-family: var(--mono); cursor: pointer; min-width: 0;
        max-width: 100%;
      }
      .vault-select:hover { border-color: #3a3a3a; }
      .vault-select:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
      .add-menu-trigger {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 10px 16px; border-radius: 12px; border: 1px solid #282828;
        background: #111; color: #EDECEA; font-size: 16px; font-family: var(--mono);
        cursor: pointer; letter-spacing: 0.04em;
      }
      .add-menu-trigger:disabled { opacity: 0.45; cursor: not-allowed; }
      .add-menu-trigger:hover:not(:disabled) { border-color: #3a3a3a; }
      .add-menu-panel {
        position: absolute; top: calc(100% + 8px); right: 0; left: auto; min-width: 220px;
        background: #111; border: 1px solid #282828; border-radius: 14px;
        padding: 6px; z-index: 60; box-shadow: 0 16px 48px rgba(0,0,0,0.55);
      }
      .add-menu-item {
        display: block; width: 100%; text-align: left; padding: 11px 14px;
        border: none; border-radius: 10px; background: transparent; color: #EDECEA;
        font-size: 16px; font-family: var(--mono); cursor: pointer;
      }
      .add-menu-item:hover:not(:disabled) { background: #1A1A1A; }
      .add-menu-item:disabled { color: #3A3A38; cursor: not-allowed; }
      .add-menu-hint { font-size: 10px; color: #3A3A38; padding: 6px 14px 4px; line-height: 1.4; }
    `;
    document.head.appendChild(style);
  }, []);

  // ── Clean up timers on unmount ──
  useEffect(() => {
    return () => {
      clearTimeout(pressTimer.current);
      clearTimeout(blurTimer.current);
    };
  }, []);

  const showToast = useCallback((msg) => setToast(msg), []);

  // ── Load user vault from OPFS (manifest + extracted text) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const vault = await getVaultRoot();
      if (cancelled) return;
      if (!vault) {
        setOpfsReady(false);
        return;
      }
      vaultRef.current = vault;
      setOpfsReady(true);
      const entries = await loadManifest(vault);
      if (cancelled || !entries.length) return;

      const localRows = [];
      const contentUpdates = {};
      for (const e of entries) {
        const raw = await loadExtractedText(vault, e.id);
        const txt = await decodeStoredText(raw ?? "", vaultPassphrase);
        localRows.push({
          id: e.id,
          name: e.name,
          tag: e.tag,
          kind: e.kind || "pdf",
          storage: e.storage || "opfs",
          contentHash: e.contentHash,
          date: formatDate(e.createdAt),
          size: formatBytes(e.sizeBytes),
          source: "local",
          createdAt: e.createdAt,
          sizeBytes: e.sizeBytes,
        });
        contentUpdates[e.id] = txt ?? "";
      }
      setDocs((prev) => mergeDocs(prev.filter((d) => d.source !== "local"), localRows));
      setContentById((prev) => ({ ...prev, ...contentUpdates }));
      const embMap = {};
      for (const e of entries) {
        const emb = await loadEmbedding(vault, e.id);
        if (emb) embMap[String(e.id)] = emb;
      }
      setEmbeddingsById((prev) => ({ ...prev, ...embMap }));
    })();
    return () => { cancelled = true; };
  }, [vaultPassphrase, vaultEpoch]);

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
    let cancelled = false;
    (async () => {
      try {
        const { embedText } = await import("./vault/embeddings.js");
        const next = {};
        for (const d of SEED_DOCS) {
          const body = d.kind === "text" && DEMO_TEXT_BODY[d.id]
            ? DEMO_TEXT_BODY[d.id]
            : `${String(d.name).replace(/\.(pdf|txt)$/i, "").replace(/_/g, " ")} ${d.tag} ${DEMO_INDEX_BOOST[d.id] || ""}`;
          const row = { ...d, kind: d.kind || "pdf" };
          next[d.id] = await embedText(buildCombinedIndexText(row, body));
        }
        if (!cancelled) setEmbeddingsById((prev) => ({ ...next, ...prev }));
      } catch (e) {
        console.warn("Demo embeddings skipped", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Query embedding (debounced) for semantic leg of search ──
  useEffect(() => {
    const t = query.trim();
    if (!t) {
      setQueryVec(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        try {
          const { embedText } = await import("./vault/embeddings.js");
          const v = await embedText(t);
          if (!cancelled) setQueryVec(v);
        } catch {
          if (!cancelled) setQueryVec(null);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

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
      if (queryVec && hasEmb) {
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
  }, [docs, activeTag, query, searchIndex, embeddingsById, queryVec, smartView, contentById, duplicateHashes, duplicateFingerprints]);

  const hasResults = Object.keys(display).length > 0;

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
    await persistEmbedding(vault, id, vec);
    setContentById((prev) => ({ ...prev, [id]: indexText }));
    setEmbeddingsById((prev) => ({ ...prev, [String(id)]: vec }));
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

  const handlePickVaultFile = useCallback(() => {
    vaultFileInputRef.current?.click();
  }, []);

  const isDuplicateContent = useCallback(async (vault, { contentHash, textFingerprint }) => {
    const existing = await loadManifest(vault);
    if (contentHash && existing.some((e) => e.contentHash === contentHash)) return true;
    if (textFingerprint && existing.some((e) => e.textFingerprint === textFingerprint)) return true;
    return false;
  }, []);

  const ingestFromFile = useCallback(async (file, options) => {
    const { vault, storage, fileHandle } = options;
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
      showToast("Reading image text…");
      const { extractTextFromImage } = await import("./vault/ocrImage.js");
      indexText = await extractTextFromImage(file);
      if (!indexText) indexText = `image screenshot ${file.name}`;
    } else if (kind === "audio") {
      showToast("Transcribing voice note…");
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
      date: formatDate(createdAt),
      size: formatBytes(file.size),
      source: "local",
      createdAt,
      sizeBytes: file.size,
      ...(contentHash ? { contentHash } : {}),
      ...(textFingerprint ? { textFingerprint } : {}),
    };
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
      if (vaultFileInputRef.current) vaultFileInputRef.current.value = "";
    }
  }, [ensureVault, ingestFromFile]);

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
        date: formatDate(createdAt),
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

  const processAllPendingShares = useCallback(async () => {
    const vault = await ensureVault();
    if (!vault) return;
    const all = await getAllPendingShares();
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
                  date: formatDate(createdAt), size: formatBytes(blob.size), source: "local", createdAt, sizeBytes: blob.size,
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
    void processAllPendingShares();
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

  const handleMergeBackupZip = useCallback(async (fileList) => {
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
    const issues = await checkVaultIntegrity(vault, entries);
    if (!issues.length) showToast("Vault integrity OK");
    else {
      showToast(
        `${issues.length} issue(s): ${issues.slice(0, 3).map((i) => i.code).join(", ")}${issues.length > 3 ? "…" : ""}`,
      );
    }
  }, [showToast]);

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
    } catch (err) {
      console.error(err);
      showToast("Repair failed");
    } finally {
      setIngestBusy(false);
    }
  }, [resolveLocalFile, vaultPassphrase, showToast]);

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
    await processAllPendingShares();
    void refreshShareQueueCount();
  }, [opfsReady, processAllPendingShares, refreshShareQueueCount, showToast]);

  const settingsActions = useMemo(() => [
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
  ], [
    handleExportVaultZip,
    handleImportFolderFromDisk,
    handleCheckVaultIntegrity,
    handleRepairVault,
    handleClearShareQueue,
    handleRetryShareImports,
    importQueueCount,
    ingestBusy,
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
      (async () => {
        if (doc.source === "local" && vaultRef.current) {
          await deleteVaultItem(vaultRef.current, String(doc.id));
          await removeLinkedFileHandle(String(doc.id));
          const entries = await loadManifest(vaultRef.current);
          await saveManifest(vaultRef.current, entries.filter((e) => String(e.id) !== String(doc.id)));
        }
      })();
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
      return;
    }
    if (action === "Share") { showToast(`Sharing ${doc.name}…`); return; }
    if (action === "Download") {
      (async () => {
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
    }
  }, [showToast, resolveLocalFile, contentById]);

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
        setEmbeddingsById((prev) => ({ ...prev, [String(docId)]: vec }));
      } catch {
        /* embeddings optional */
      }
    }
    setRenameDoc(null);
    showToast("Renamed successfully");
  }, [showToast, contentById, indexAndPersistEmbedding, vaultPassphrase]);

  const handleQueryChange = (val) => {
    setQuery(val);
    if (val && activeTag !== "All") setActiveTag("All");
  };

  const handleSearchBlur = () => {
    blurTimer.current = setTimeout(() => {
      if (!query) searchRef.current?.blur();
    }, 150);
  };

  return (
    <div className="vault-root">

      {/* ── Header + title + Add ── */}
      <div style={{ padding: "8px 28px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            <img
              src={APP_ICON_SRC}
              alt=""
              width={36}
              height={36}
              style={{ borderRadius: 10, flexShrink: 0, objectFit: "contain" }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 13, fontWeight: 600, letterSpacing: "0.14em",
                  color: "#EDECEA", fontFamily: "var(--mono)",
                }}>
                  SILO
                </span>
                <span
                  style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: opfsReady ? "#6BBF7A" : "#5a5a58",
                    boxShadow: opfsReady ? "0 0 8px rgba(107,191,122,0.5)" : "none",
                    flexShrink: 0,
                  }}
                  title={opfsReady ? "Vault ready" : "Demo mode"}
                  aria-hidden
                />
              </div>
              <div style={{ fontSize: 10, color: "#3A3A38", marginTop: 3, letterSpacing: "0.05em" }}>
                {docs.length} items · {totalGB} GB
              </div>
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            type="button"
            style={{ flexShrink: 0, marginTop: 2 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginTop: 14 }}>
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.03em",
              color: "#EDECEA", fontFamily: "var(--mono)", flex: 1, minWidth: 0,
            }}
          >
            Your vault
          </motion.h1>
          <div ref={addMenuRef} style={{ position: "relative", flexShrink: 0 }}>
            <input
              ref={backupImportRef}
              type="file"
              accept=".zip,application/zip"
              style={{ display: "none" }}
              aria-hidden="true"
              onChange={(e) => { void handleMergeBackupZip(e.target.files); }}
            />
            <input
              ref={vaultFileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.heic,.m4a,.aac,.mp3,.wav,.webm,.ogg,.opus,.flac,application/pdf,image/*,audio/*"
              style={{ display: "none" }}
              aria-hidden="true"
              onChange={(e) => { void handleVaultFiles(e.target.files); }}
            />
            <button
              type="button"
              className="add-menu-trigger"
              disabled={ingestBusy}
              aria-expanded={addMenuOpen}
              aria-haspopup="menu"
              onClick={() => setAddMenuOpen((o) => !o)}
            >
              {ingestBusy ? "Saving…" : "Add"}
              <span style={{ fontSize: 10, color: "#848480", marginLeft: 2 }} aria-hidden>▾</span>
            </button>
            <AnimatePresence>
              {addMenuOpen && !ingestBusy && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="add-menu-panel"
                >
                  <div className="add-menu-hint">Copy into vault, link a file, or save a note.</div>
                  <button
                    type="button"
                    role="menuitem"
                    className="add-menu-item"
                    onClick={() => { setAddMenuOpen(false); handlePickVaultFile(); }}
                  >
                    Add file…
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="add-menu-item"
                    disabled={!nativeLinkReady}
                    title={nativeLinkReady ? "Keep file on disk (Chrome/Edge)" : "Requires Chromium desktop"}
                    onClick={() => {
                      setAddMenuOpen(false);
                      void handleLinkFromDisk();
                    }}
                  >
                    Link from disk…
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="add-menu-item"
                    onClick={() => { setAddMenuOpen(false); setNoteModalOpen(true); }}
                  >
                    Text note…
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {(importQueueCount > 0 || !opfsReady) && (
        <div style={{ padding: "0 28px 10px", fontSize: 11, color: "#3A3A38", lineHeight: 1.45 }}>
          {importQueueCount > 0 && (
            <span style={{ color: shareQueueFailedCount > 0 ? "#C8963E" : "#5BC8C4", display: "block" }}>
              {shareQueueFailedCount > 0
                ? `${shareQueueFailedCount} share import(s) failed — Settings → Retry`
                : `${importQueueCount} share(s) queued`}
            </span>
          )}
          {!opfsReady && <span>On-device vault unavailable here — demo only.</span>}
        </div>
      )}
      {ingestError && (
        <div style={{ padding: "0 28px 12px", fontSize: 11, color: "#C86E8A" }}>
          {ingestError}
        </div>
      )}

      <div style={{ padding: "12px 28px 8px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 160px", minWidth: 0 }}>
          <span style={{ fontSize: 10, color: "#3A3A38", letterSpacing: "0.1em", textTransform: "uppercase" }}>View</span>
          <select
            className="vault-select"
            aria-label="Smart view"
            value={smartView}
            onChange={(e) => {
              const v = e.target.value;
              setSmartView(v);
              if (v) setActiveTag("All");
            }}
          >
            <option value="">All items</option>
            {SMART_VIEWS.map((sv) => (
              <option key={sv.id} value={sv.id}>{sv.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 160px", minWidth: 0 }}>
          <span style={{ fontSize: 10, color: "#3A3A38", letterSpacing: "0.1em", textTransform: "uppercase" }}>Category</span>
          <select
            className="vault-select"
            aria-label="Filter by category"
            value={activeTag}
            onChange={(e) => setActiveTag(e.target.value)}
          >
            {ALL_TAGS.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Active search note */}
      <AnimatePresence>
        {query && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ padding: "12px 28px 0", fontSize: 10, color: "#848480" }}
          >
            Hybrid search (keywords + on-device meaning) for "{query}"
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Document List ── */}
      <div style={{ marginTop: 30 }}>
        {!hasResults ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "60px 28px", color: "#3A3A38" }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>⊘</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No documents found</div>
            <div style={{ fontSize: 12, marginBottom: 20, color: "#2a2a2a" }}>
              Try a different search or filter
            </div>
            <button
              onClick={() => { setQuery(""); setActiveTag("All"); }}
              style={{
                background: "transparent", border: "1px solid #2a2a2a",
                borderRadius: 20, padding: "8px 20px", color: "#848480",
                fontSize: 12, cursor: "pointer", fontFamily: "var(--mono)",
              }}
            >
              Clear filters
            </button>
          </motion.div>
        ) : (
          <LayoutGroup>
            {Object.entries(display).map(([tag, items]) => (
              <motion.div layout key={tag} style={{ marginBottom: 30 }}>
                <div style={{
                  padding: "0 28px", fontSize: 10,
                  color: tagMeta(tag).color,
                  letterSpacing: "0.2em", marginBottom: 12, textTransform: "uppercase",
                }}>
                  {tag}
                </div>
                <AnimatePresence>
                  {items.map((doc) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1  }}
                      exit={{    opacity: 0, scale: 0.95 }}
                      whileTap={{ scale: 0.97 }}
                      key={doc.id}
                      className="doc-card"
                      role="button"
                      tabIndex={0}
                      aria-label={`${doc.name}, ${doc.tag}, ${doc.date}, ${doc.size}`}
                      onPointerDown={(e) => handlePointerDown(doc, e)}
                      onPointerUp={() => handlePointerUp(doc)}
                      onPointerCancel={handlePointerCancel}
                      onKeyDown={(e) => handleCardKeyDown(doc, e)}
                    >
                      <div style={{
                        width: 40, height: 48, borderRadius: 12, flexShrink: 0,
                        background: tagMeta(doc.tag).bg, color: tagMeta(doc.tag).color,
                        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 2, padding: 6,
                      }}>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em" }}>
                          {kindLabel(doc.kind || "pdf", doc.storage)}
                        </span>
                        <div style={{ height: 2, borderRadius: 1, background: "currentColor", width: "100%", opacity: 0.35 }} />
                        <div style={{ height: 2, borderRadius: 1, background: "currentColor", width: "55%", opacity: 0.25 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#3A3A38", marginTop: 4 }}>
                          {doc.date} · {doc.size}
                        </div>
                      </div>
                      <div style={{ fontSize: 16, color: "#3A3A38", flexShrink: 0 }} aria-hidden="true">›</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ))}
          </LayoutGroup>
        )}
      </div>

      {/* ── Search Bar ── */}
      <div className="search-pill" role="search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3A3A38" strokeWidth="2.5" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={searchRef}
          className="search-input"
          placeholder="Search silo…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onBlur={handleSearchBlur}
          aria-label="Search documents"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1   }}
              exit={{    opacity: 0, scale: 0.8  }}
              className="icon-btn"
              onClick={() => { setQuery(""); searchRef.current?.focus(); }}
              aria-label="Clear search"
            >
              ✕
            </motion.button>
          )}
        </AnimatePresence>
      </div>

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
        {settingsOpen && <SettingsDrawer onClose={() => setSettingsOpen(false)} actions={settingsActions} />}
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
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>

    </div>
  );
}
