import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export function RenameModal({ doc, onConfirm, onCancel }) {
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
    if (e.key === "Enter") onConfirm(next);
    if (e.key === "Escape") onCancel();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", zIndex: 1300 }}
        onClick={onCancel}
      />
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: "calc(100% - 56px)",
          maxWidth: 400,
          background: "#111",
          border: "1px solid #282828",
          borderRadius: 24,
          padding: 24,
          zIndex: 1400,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Rename item"
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
            width: "100%",
            boxSizing: "border-box",
            background: "#1A1A1A",
            border: "1px solid #2a2a2a",
            borderRadius: 12,
            padding: "10px 14px",
            color: "#EDECEA",
            fontSize: 16,
            fontFamily: "'JetBrains Mono', monospace",
            outline: "none",
          }}
        />
        <div style={{ fontSize: 10, color: "#3A3A38", marginTop: 8 }}>{ext ? `Keeps extension ${ext}` : "No extension enforced"}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 12,
              border: "1px solid #282828",
              background: "transparent",
              color: "#848480",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm((value.trim() || "untitled") + ext)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 12,
              border: "none",
              background: "#C8963E",
              color: "#000",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
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
