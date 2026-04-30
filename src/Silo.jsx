import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

// ─── Data ────────────────────────────────────────────────────────────────────

const DOCS = [
  { id: 1,  name: "passport_scan.pdf",      tag: "Identity",  date: "Mar 12, 2024", size: "2.1 MB" },
  { id: 2,  name: "drivers_license.pdf",    tag: "Identity",  date: "Jan 08, 2024", size: "980 KB" },
  { id: 11, name: "sincard.pdf",            tag: "Identity",  date: "May 01, 2023", size: "150 KB" },
  { id: 3,  name: "hydro_bill_feb.pdf",     tag: "Utilities", date: "Feb 28, 2024", size: "340 KB" },
  { id: 8,  name: "hydro_bill_jan.pdf",     tag: "Utilities", date: "Jan 29, 2024", size: "310 KB" },
  { id: 4,  name: "lease_agreement.pdf",    tag: "Housing",   date: "Sep 01, 2023", size: "4.8 MB" },
  { id: 12, name: "lease_renewal_2024.pdf", tag: "Housing",   date: "Mar 15, 2024", size: "3.1 MB" },
  { id: 5,  name: "t4_2023.pdf",            tag: "Tax",       date: "Feb 20, 2024", size: "1.2 MB" },
  { id: 9,  name: "bank_statement_mar.pdf", tag: "Finance",   date: "Mar 31, 2024", size: "890 KB" },
  { id: 10, name: "void_cheque.pdf",        tag: "Finance",   date: "Nov 10, 2023", size: "220 KB" },
  { id: 6,  name: "insurance_auto.pdf",     tag: "Insurance", date: "Jan 15, 2024", size: "2.6 MB" },
  { id: 7,  name: "college_diploma.pdf",    tag: "Education", date: "Jun 15, 2022", size: "5.3 MB" },
];

const TAG_META = {
  Identity:  { color: "#C8963E", bg: "rgba(200,150,62,0.10)",  label: "ID"  },
  Utilities: { color: "#5B9BD5", bg: "rgba(91,155,213,0.10)",  label: "UTL" },
  Housing:   { color: "#6BBF7A", bg: "rgba(107,191,122,0.10)", label: "HSG" },
  Tax:       { color: "#C86E8A", bg: "rgba(200,110,138,0.10)", label: "TAX" },
  Finance:   { color: "#D4935A", bg: "rgba(212,147,90,0.10)",  label: "FIN" },
  Insurance: { color: "#9B7EC8", bg: "rgba(155,126,200,0.10)", label: "INS" },
  Education: { color: "#C8B43E", bg: "rgba(200,180,62,0.10)",  label: "EDU" },
};

const ALL_TAGS = ["All", ...Object.keys(TAG_META)];

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
  const [value, setValue] = useState(doc.name.replace(".pdf", ""));
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter")  onConfirm(value.trim() + ".pdf");
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
        role="dialog" aria-modal="true" aria-label="Rename document"
      >
        <div style={{ fontSize: 11, color: "#848480", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
          Rename document
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
            onClick={() => onConfirm(value.trim() + ".pdf")}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
              background: "#C8963E", color: "#000", fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Rename
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
  const [docs,          setDocs]          = useState(DOCS);
  const [contextMenu,   setContextMenu]   = useState(null);
  const [renameDoc,     setRenameDoc]     = useState(null);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [toast,         setToast]         = useState(null);

  const pressTimer    = useRef(null);
  const blurTimer     = useRef(null);
  const searchRef     = useRef(null);
  const styleInjected = useRef(false);

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

  // ── Filtered display data ──
  const display = useMemo(() => {
    const filtered = docs.filter((d) => {
      const tagOk = activeTag === "All" || d.tag === activeTag;
      const qOk   = !query || d.name.toLowerCase().includes(query.toLowerCase());
      return tagOk && qOk;
    });
    return Object.keys(TAG_META).reduce((acc, tag) => {
      const items = filtered.filter((d) => d.tag === tag);
      if (items.length) acc[tag] = items;
      return acc;
    }, {});
  }, [docs, activeTag, query]);

  const hasResults = Object.keys(display).length > 0;

  // Total converted to GB for the hero stat
  const totalGB = useMemo(() => {
    const mb = docs.reduce((a, d) => a + parseMB(d.size), 0);
    return (mb / 1024).toFixed(1);
  }, [docs]);

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
      showToast(`Opening ${doc.name}…`);
    }
  }, [showToast]);

  const handlePointerCancel = useCallback(() => {
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }, []);

  const handleCardKeyDown = useCallback((doc, e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      showToast(`Opening ${doc.name}…`);
    }
    if (e.key === "ContextMenu") {
      e.preventDefault();
      setContextMenu({ doc });
    }
  }, [showToast]);

  const handleAction = useCallback((action, doc) => {
    setContextMenu(null);
    if (action === "Rename")   { setRenameDoc(doc); return; }
    if (action === "Delete")   { setDocs((prev) => prev.filter((d) => d.id !== doc.id)); showToast(`Deleted ${doc.name}`); return; }
    if (action === "Share")    { showToast(`Sharing ${doc.name}…`);     return; }
    if (action === "Download") { showToast(`Downloading ${doc.name}…`); return; }
  }, [showToast]);

  const handleRename = useCallback((docId, newName) => {
    setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, name: newName } : d));
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
            {docs.length} files
          </span>
        </div>

        {/* Row 2: "documents."  ←→  "X.X GB total" */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "baseline", lineHeight: 1, marginTop: 2,
        }}>
          <em style={{ fontSize: 38, fontStyle: "italic", fontWeight: 300, color: "#848480", letterSpacing: "-0.05em" }}>
            documents.
          </em>
          <span style={{ fontSize: 10, color: "#3A3A38", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {totalGB} GB total
          </span>
        </div>
      </motion.div>

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
            Searching all categories for "{query}"
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
                  color: TAG_META[tag].color,
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
                        background: TAG_META[doc.tag].bg, color: TAG_META[doc.tag].color,
                        display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, padding: 8,
                      }}>
                        <div style={{ height: 2, borderRadius: 1, background: "currentColor", width: "100%" }} />
                        <div style={{ height: 2, borderRadius: 1, background: "currentColor", width: "60%", opacity: 0.5 }} />
                        <div style={{ height: 2, borderRadius: 1, background: "currentColor", width: "85%", opacity: 0.8 }} />
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
            onConfirm={(newName) => handleRename(renameDoc.id, newName)}
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
