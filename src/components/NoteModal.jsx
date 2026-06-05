import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_GENTLE, useReducedMotion } from "../design/motion.js";
import { Chip } from "./ui/Chip.jsx";
import { ALL_TAGS } from "../lib/vaultTags.js";

const NOTE_TAGS = ALL_TAGS.filter((t) => t !== "All");

/**
 * @param {{
 *   onSave: (text: string, meta?: { title?: string, tag?: string }) => void,
 *   onCancel: () => void,
 * }} props
 */
export function NoteModal({ onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("Unsorted");
  const bodyRef = useRef(null);
  const reduced = useReducedMotion();
  const canSave = body.trim().length > 0;

  useEffect(() => {
    bodyRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleSave = () => {
    const text = body.trim();
    if (!text) return;
    const heading = title.trim();
    const payload = heading ? `${heading}\n\n${text}` : text;
    onSave(payload, { title: heading || undefined, tag });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        aria-hidden
      />
      <motion.div
        className="note-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-modal-title"
        initial={reduced ? false : { y: "100%" }}
        animate={{ y: 0 }}
        exit={reduced ? undefined : { y: "100%" }}
        transition={SPRING_GENTLE}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden />
        <header className="note-modal__header">
          <h2 id="note-modal-title" className="note-modal__title">New note</h2>
          <button type="button" className="note-modal__close" onClick={onCancel} aria-label="Cancel">
            Cancel
          </button>
        </header>

        <input
          className="note-modal__title-input"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Note title"
        />

        <div className="note-modal__chips" role="group" aria-label="Category">
          {NOTE_TAGS.slice(0, 8).map((t) => (
            <Chip key={t} active={tag === t} onClick={() => setTag(t)}>
              {t}
            </Chip>
          ))}
        </div>

        <textarea
          ref={bodyRef}
          className="note-modal__body"
          placeholder="Write your note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          aria-label="Note body"
        />

        <footer className="note-modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn--accent" disabled={!canSave} onClick={handleSave}>
            Save
          </button>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
