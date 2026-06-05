import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Prompt for manual transcript text when on-device transcription fails.
 * @param {{
 *   fileName: string,
 *   busy?: boolean,
 *   onSave: (text: string) => void,
 *   onSkip: () => void,
 * }} props
 */
export function TranscriptionFallbackModal({ fileName, busy, onSave, onSkip }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-backdrop"
        onClick={onSkip}
      />
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="modal-panel modal-panel--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transcription-fallback-title"
      >
        <div className="modal-panel__eyebrow">Transcription failed</div>
        <p id="transcription-fallback-title" className="modal-panel__hint">
          Could not transcribe <strong>{fileName}</strong>. The audio is saved — add searchable text below or skip.
        </p>
        <label className="modal-panel__field">
          <span>Transcript or notes</span>
          <textarea
            ref={inputRef}
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            placeholder="Type what was said, or keywords to find this recording later…"
          />
        </label>
        <div className="modal-panel__actions">
          <button type="button" className="btn btn--ghost" onClick={onSkip} disabled={busy}>
            Skip
          </button>
          <button
            type="button"
            className="btn btn--accent"
            disabled={busy || !text.trim()}
            onClick={() => onSave(text.trim())}
          >
            {busy ? "Saving…" : "Save text"}
          </button>
        </div>
      </motion.div>
    </>
  );
}
