import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export function ContextMenu({ doc, onAction, onClose }) {
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const actions = [
    { label: "Summarize", icon: "≡", danger: false },
    { label: "Share", icon: "↑", danger: false },
    { label: "Download", icon: "↓", danger: false },
    { label: "Rename", icon: "✎", danger: false },
    { label: "Delete", icon: "✕", danger: true },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)", zIndex: 1100 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="settings-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Actions for ${doc.name}`}
      >
        <div style={{ width: 36, height: 4, background: "#2a2a2a", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 12, color: "#848480", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {doc.name}
        </div>
        <div style={{ fontSize: 10, color: "#3A3A38", marginBottom: 20 }}>
          {doc.date}
          {" · "}
          {doc.size}
        </div>
        {actions.map((action, i) => (
          <button
            key={action.label}
            ref={i === 0 ? firstRef : null}
            type="button"
            onClick={() => onAction(action.label, doc)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              padding: "14px 0",
              background: "transparent",
              border: "none",
              borderBottom: i < actions.length - 1 ? "1px solid #1A1A1A" : "none",
              color: action.danger ? "#C86E8A" : "#EDECEA",
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              textAlign: "left",
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
