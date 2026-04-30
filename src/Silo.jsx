import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  getVaultRoot,
  loadManifest,
  saveManifest,
  persistVaultBlob,
  persistExtractedText,
  loadExtractedText,
  deleteVaultItem,
  readVaultBlobFile,
} from "./vault/opfs.js";
import { buildVaultSearchIndex } from "./vault/searchIndex.js";

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

function kindLabel(kind) {
  if (kind === "text") return "MSG";
  if (kind === "audio") return "MIC";
  if (kind === "pdf") return "PDF";
  return "FILE";
}

const SETTINGS_OPTIONS = [
  { label: "Sort by name",    icon: "↑↓" },
  { label: "Sort by date",    icon: "📅" },
  { label: "Compact view",    icon: "⊟"  },
  { label: "Export all",      icon: "↑"  },
  { label: "Lock vault",      icon: "🔒" },
];

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
            padding: "10px 14px", color: "#EDECEA", fontSize: 14,
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
            padding: "12px 14px", color: "#EDECEA", fontSize: 13,
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

function SettingsDrawer({ onClose }) {
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
        style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 480,
          background: "#111", borderTop: "1px solid #1E1E1E",
          borderRadius: "24px 24px 0 0", padding: "20px 28px 48px",
          zIndex: 1200,
        }}
        role="dialog" aria-modal="true" aria-label="Settings"
      >
        <div style={{ width: 36, height: 4, background: "#2a2a2a", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 11, color: "#848480", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
          Settings
        </div>
        {SETTINGS_OPTIONS.map((opt, i) => (
          <button
            key={opt.label}
            ref={i === 0 ? firstRef : null}
            onClick={onClose}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", padding: "14px 0", background: "transparent",
              border: "none", borderBottom: i < SETTINGS_OPTIONS.length - 1 ? "1px solid #1A1A1A" : "none",
              color: "#EDECEA", fontSize: 14, cursor: "pointer",
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
        style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 480,
          background: "#111", borderTop: "1px solid #1E1E1E",
          borderRadius: "24px 24px 0 0", padding: "20px 28px 48px",
          zIndex: 1200,
        }}
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
  const [ingestBusy,    setIngestBusy]    = useState(false);
  const [ingestError,   setIngestError]   = useState(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);

  const [contextMenu,   setContextMenu]   = useState(null);
  const [renameDoc,     setRenameDoc]     = useState(null);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [toast,         setToast]         = useState(null);

  const pressTimer       = useRef(null);
  const blurTimer        = useRef(null);
  const searchRef        = useRef(null);
  const styleInjected    = useRef(false);
  const vaultRef         = useRef(null);
  const vaultFileInputRef = useRef(null);

  // ── Inject global styles once ──
  useEffect(() => {
    if (styleInjected.current) return;
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
      *:focus-visible {
        outline: 2px solid var(--amber);
        outline-offset: 2px;
        border-radius: 6px;
      }
      .vault-root {
        max-width: 480px; margin: 0 auto; min-height: 100svh;
        padding-bottom: 120px; position: relative;
      }
      .vault-root::after {
        content: '';
        position: fixed; inset: 0; pointer-events: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
        opacity: 0.4; z-index: 999;
      }
      .tag-strip { display: flex; gap: 8px; padding: 0 28px; overflow-x: auto; scrollbar-width: none; }
      .tag-strip::-webkit-scrollbar { display: none; }
      .tag-pill {
        padding: 6px 14px; border-radius: 20px; border: 1px solid #1E1E1E;
        font-size: 10px; color: #3A3A38; cursor: pointer; white-space: nowrap;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        font-family: var(--mono); background: transparent;
      }
      .tag-pill:hover { border-color: #2a2a2a; color: #848480; }
      .tag-pill.active { background: var(--amber); border-color: var(--amber); color: #000; font-weight: 600; }
      .doc-card {
        background: #0D0D0D; border: 1px solid #1E1E1E; border-radius: 22px;
        padding: 16px; margin: 0 28px 10px; display: flex; align-items: center; gap: 15px;
        cursor: pointer; position: relative; overflow: hidden;
        transition: border-color 0.15s;
      }
      .doc-card:hover  { border-color: #2a2a2a; }
      .doc-card:focus  { border-color: var(--amber); }
      .search-pill {
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        width: calc(100% - 56px); max-width: 424px;
        background: rgba(17,17,17,0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        border: 1px solid #282828; border-radius: 24px; padding: 14px 20px;
        display: flex; align-items: center; gap: 12px; z-index: 1000;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      }
      .search-input {
        background: transparent; border: none; outline: none; color: #fff;
        font-family: var(--mono); font-size: 14px; flex: 1;
      }
      .icon-btn {
        background: transparent; border: none; cursor: pointer;
        color: #848480; padding: 4px; display: flex; align-items: center; justify-content: center;
        border-radius: 6px; transition: color 0.15s;
      }
      .icon-btn:hover { color: #EDECEA; }
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
        const txt = await loadExtractedText(vault, e.id);
        localRows.push({
          id: e.id,
          name: e.name,
          tag: e.tag,
          kind: e.kind || "pdf",
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
    })();
    return () => { cancelled = true; };
  }, []);

  const searchIndex = useMemo(() => {
    const rows = docs.map((d) => ({
      id: d.id,
      name: d.name,
      tag: d.tag,
      kind: d.kind || "pdf",
      content: contentById[d.id] ?? "",
    }));
    return buildVaultSearchIndex(rows);
  }, [docs, contentById]);

  // ── Filtered display data ──
  const display = useMemo(() => {
    const q = query.trim();
    const idSet = q ? searchIndex.matchingDocIds(q) : null;
    const filtered = docs.filter((d) => {
      const tagOk = activeTag === "All" || d.tag === activeTag;
      const idOk = idSet == null || idSet.has(String(d.id));
      return tagOk && idOk;
    });
    const tagOrder = Object.keys(TAG_META);
    const extra = [...new Set(filtered.map((d) => d.tag))].filter((t) => !TAG_META[t]).sort();
    const orderedTags = [...tagOrder.filter((t) => filtered.some((d) => d.tag === t)), ...extra];
    return orderedTags.reduce((acc, tag) => {
      const items = filtered.filter((doc) => doc.tag === tag);
      if (items.length) acc[tag] = items;
      return acc;
    }, {});
  }, [docs, activeTag, query, searchIndex]);

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
          body = (await loadExtractedText(vaultRef.current, String(doc.id))) ?? "";
        }
        showToast(body ? `Note: ${body.slice(0, 120)}${body.length > 120 ? "…" : ""}` : "Empty note");
        return;
      }
      const file = await readVaultBlobFile(vaultRef.current, String(doc.id));
      if (file) {
        const url = URL.createObjectURL(file);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        showToast(`Opened ${doc.name}`);
        return;
      }
    }
    showToast(`Opening ${doc.name}…`);
  }, [showToast, contentById]);

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

  const handleVaultFiles = useCallback(async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    const vault = await ensureVault();
    if (!vault) {
      setIngestError("Private on-device storage (OPFS) is not available here. Use HTTPS or a supported browser.");
      if (vaultFileInputRef.current) vaultFileInputRef.current.value = "";
      return;
    }
    const lower = file.name.toLowerCase();
    let kind = "file";
    if (lower.endsWith(".pdf")) kind = "pdf";
    else if (/\.(m4a|aac|mp3|wav|webm|ogg|opus|flac)$/i.test(lower)) kind = "audio";

    setIngestError(null);
    setIngestBusy(true);
    try {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      let indexText = "";

      if (kind === "pdf") {
        const buffer = await file.arrayBuffer();
        const { extractTextFromPdfBuffer } = await import("./vault/extractPdfText.js");
        indexText = await extractTextFromPdfBuffer(buffer);
      } else if (kind === "audio") {
        indexText = `voice note audio recording ${file.name}`;
      } else {
        indexText = `file attachment ${file.type || "binary"} ${file.name}`;
      }

      const tag = inferTagGuess(`${indexText} ${file.name}`);
      await persistVaultBlob(vault, id, file);
      await persistExtractedText(vault, id, indexText);
      const entries = await loadManifest(vault);
      entries.push({
        id,
        name: file.name,
        tag,
        kind,
        createdAt,
        sizeBytes: file.size,
        mimeType: file.type || undefined,
      });
      await saveManifest(vault, entries);

      const row = {
        id,
        name: file.name,
        tag,
        kind,
        date: formatDate(createdAt),
        size: formatBytes(file.size),
        source: "local",
        createdAt,
        sizeBytes: file.size,
      };
      setDocs((prev) => mergeDocs(prev, [row]));
      setContentById((prev) => ({ ...prev, [id]: indexText }));
      showToast(kind === "pdf" ? "PDF indexed locally" : kind === "audio" ? "Voice note saved" : "File saved to vault");
    } catch (err) {
      console.error(err);
      setIngestError(err?.message || "Could not save this file.");
    } finally {
      setIngestBusy(false);
      if (vaultFileInputRef.current) vaultFileInputRef.current.value = "";
    }
  }, [ensureVault, showToast]);

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

      await persistVaultBlob(vault, id, blob);
      await persistExtractedText(vault, id, text);
      const entries = await loadManifest(vault);
      entries.push({
        id,
        name,
        tag,
        kind: "text",
        createdAt,
        sizeBytes,
        mimeType: "text/plain",
      });
      await saveManifest(vault, entries);

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
      };
      setDocs((prev) => mergeDocs(prev, [row]));
      setContentById((prev) => ({ ...prev, [id]: text }));
      showToast("Text note saved");
    } catch (err) {
      console.error(err);
      setIngestError(err?.message || "Could not save note.");
    } finally {
      setIngestBusy(false);
    }
  }, [ensureVault, showToast]);

  // ── Press handlers (tap vs long-press) ──
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
    if (action === "Rename") { setRenameDoc(doc); return; }
    if (action === "Delete") {
      (async () => {
        if (doc.source === "local" && vaultRef.current) {
          await deleteVaultItem(vaultRef.current, String(doc.id));
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
      showToast(`Deleted ${doc.name}`);
      return;
    }
    if (action === "Share") { showToast(`Sharing ${doc.name}…`); return; }
    if (action === "Download") {
      (async () => {
        if (doc.source === "local" && vaultRef.current) {
          const f = await readVaultBlobFile(vaultRef.current, String(doc.id));
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
  }, [showToast]);

  const handleRename = useCallback(async (renamedDoc, newName) => {
    const docId = renamedDoc.id;
    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, name: newName } : d)));
    if (renamedDoc.source === "local" && vaultRef.current) {
      const entries = await loadManifest(vaultRef.current);
      await saveManifest(
        vaultRef.current,
        entries.map((e) => (e.id === String(docId) ? { ...e, name: newName } : e)),
      );
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
    }
    setRenameDoc(null);
    showToast("Renamed successfully");
  }, [showToast]);

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

      {/* ── Top Bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "60px 28px 20px", alignItems: "center" }}>

        {/* SILO wordmark with icon + live dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">
            {/* dome cap */}
            <rect x="0" y="4" width="16" height="5" rx="8" fill="#EDECEA" opacity="0.92" />
            {/* body */}
            <rect x="2" y="7" width="12" height="12" rx="1" fill="#EDECEA" opacity="0.92" />
          </svg>
          <span style={{
            fontSize: 13, fontWeight: 700, letterSpacing: "0.25em",
            color: "#EDECEA", fontFamily: "'JetBrains Mono', monospace",
          }}>
            SILO
          </span>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "#6BBF7A", boxShadow: "0 0 7px #6BBF7A",
          }} />
        </div>

        {/* Settings gear */}
        <button
          className="icon-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* ── Hero — split layout ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: "0 28px 30px" }}
      >
        {/* Row 1: "Your"  ←→  "12 files" */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "baseline", lineHeight: 1,
        }}>
          <span style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.05em" }}>
            Your
          </span>
          <span style={{ fontSize: 10, color: "#3A3A38", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {docs.length} items
          </span>
        </div>

        {/* Row 2: "documents."  ←→  "X.X GB total" */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "baseline", lineHeight: 1, marginTop: 2,
        }}>
          <em style={{ fontSize: 38, fontStyle: "italic", fontWeight: 300, color: "#848480", letterSpacing: "-0.05em" }}>
            vault.
          </em>
          <span style={{ fontSize: 10, color: "#3A3A38", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {totalGB} GB total
          </span>
        </div>
      </motion.div>

      <div style={{ padding: "0 28px 16px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input
          ref={vaultFileInputRef}
          type="file"
          accept=".pdf,.m4a,.aac,.mp3,.wav,.webm,.ogg,.opus,.flac,application/pdf,audio/*"
          style={{ display: "none" }}
          aria-hidden="true"
          onChange={(e) => { void handleVaultFiles(e.target.files); }}
        />
        <button
          type="button"
          onClick={handlePickVaultFile}
          disabled={ingestBusy}
          style={{
            padding: "10px 18px",
            borderRadius: 20,
            border: "1px solid #282828",
            background: "rgba(17,17,17,0.6)",
            color: ingestBusy ? "#3A3A38" : "#EDECEA",
            fontSize: 11,
            cursor: ingestBusy ? "wait" : "pointer",
            fontFamily: "var(--mono)",
            letterSpacing: "0.04em",
          }}
        >
          {ingestBusy ? "Saving…" : "+ Add file"}
        </button>
        <button
          type="button"
          onClick={() => setNoteModalOpen(true)}
          disabled={ingestBusy}
          style={{
            padding: "10px 18px",
            borderRadius: 20,
            border: "1px solid #2a3a38",
            background: "rgba(91,200,196,0.08)",
            color: ingestBusy ? "#3A3A38" : "#5BC8C4",
            fontSize: 11,
            cursor: ingestBusy ? "wait" : "pointer",
            fontFamily: "var(--mono)",
            letterSpacing: "0.04em",
          }}
        >
          Text note
        </button>
        <span style={{ fontSize: 9, color: "#3A3A38", letterSpacing: "0.06em", flex: "1 1 140px" }}>
          {opfsReady ? "PDF · voice · paste like “message to self”" : "OPFS unavailable — demo only"}
        </span>
      </div>
      {ingestError && (
        <div style={{ padding: "0 28px 12px", fontSize: 11, color: "#C86E8A" }}>
          {ingestError}
        </div>
      )}

      {/* ── Filter Strip ── */}
      <div className="tag-strip" role="tablist" aria-label="Filter by category">
        {ALL_TAGS.map((tag) => (
          <button
            key={tag}
            role="tab"
            aria-selected={activeTag === tag}
            className={`tag-pill ${activeTag === tag ? "active" : ""}`}
            onClick={() => setActiveTag(tag)}
          >
            {tag}
          </button>
        ))}
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
            Full-text search (titles + message / PDF text) for "{query}"
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
                          {kindLabel(doc.kind || "pdf")}
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
        {settingsOpen && <SettingsDrawer onClose={() => setSettingsOpen(false)} />}
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
