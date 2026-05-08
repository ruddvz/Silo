import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { SPRING_GENTLE, useReducedMotion } from "../design/motion.js";

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   ingestBusy: boolean,
 *   nativeLinkReady: boolean,
 *   onAddFile: () => void,
 *   onLinkDisk: () => void,
 *   onNewNote: () => void,
 * }} props
 */
export function IngestDialog({
  open,
  onClose,
  ingestBusy,
  nativeLinkReady,
  onAddFile,
  onLinkDisk,
  onNewNote,
}) {
  const reduced = useReducedMotion();
  const [isWide, setIsWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const fn = () => setIsWide(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="ingest-dialog__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            className="ingest-dialog__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Add to vault"
            initial={reduced ? false : { y: "100%", opacity: 0.98 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? undefined : { y: "100%", opacity: 0.98 }}
            transition={SPRING_GENTLE}
            drag={reduced || isWide ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
          >
            <div className="ingest-dialog__handle" />
            <h2 className="ingest-dialog__title">Add to vault</h2>
            <p className="ingest-dialog__subtitle">Files stay on this device.</p>

            <div className="ingest-dialog__options">
              <button
                type="button"
                className="ingest-option"
                disabled={ingestBusy}
                onClick={() => {
                  onAddFile();
                  onClose();
                }}
              >
                <span className="ingest-option__icon" aria-hidden>
                  📄
                </span>
                <span className="ingest-option__text">
                  <span className="ingest-option__label">File</span>
                  <span className="ingest-option__hint">PDF, image, or audio — copied into vault</span>
                </span>
              </button>

              <button
                type="button"
                className="ingest-option"
                disabled={ingestBusy || !nativeLinkReady}
                title={nativeLinkReady ? "Keep original on disk (Chromium)" : "Requires Chrome, Edge, or Brave desktop"}
                onClick={() => {
                  onLinkDisk();
                  onClose();
                }}
              >
                <span className="ingest-option__icon" aria-hidden>
                  🔗
                </span>
                <span className="ingest-option__text">
                  <span className="ingest-option__label">Link from disk</span>
                  <span className="ingest-option__hint">Chromium desktop only</span>
                </span>
              </button>

              <button
                type="button"
                className="ingest-option"
                disabled={ingestBusy}
                onClick={() => {
                  onNewNote();
                  onClose();
                }}
              >
                <span className="ingest-option__icon" aria-hidden>
                  📝
                </span>
                <span className="ingest-option__text">
                  <span className="ingest-option__label">Text note</span>
                  <span className="ingest-option__hint">Type or paste</span>
                </span>
              </button>
            </div>

            <button type="button" className="btn btn--ghost ingest-dialog__cancel" onClick={onClose}>
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
