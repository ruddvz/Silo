import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export function NoteModal({ onSave, onCancel }) {
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
        aria-label="New text note"
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
            width: "100%",
            boxSizing: "border-box",
            resize: "vertical",
            minHeight: 140,
            background: "#1A1A1A",
            border: "1px solid #2a2a2a",
            borderRadius: 12,
            padding: "12px 14px",
            color: "#EDECEA",
            fontSize: 16,
            fontFamily: "'JetBrains Mono', monospace",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handlePaste}
            style={{
              padding: "8px 14px",
              borderRadius: 12,
              border: "1px solid #282828",
              background: "transparent",
              color: "#848480",
              fontSize: 12,
              cursor: "pointer",
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
            onClick={() => {
              const t = body.trim();
              if (t) onSave(t);
            }}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 12,
              border: "none",
              background: "#5BC8C4",
              color: "#000",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
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
