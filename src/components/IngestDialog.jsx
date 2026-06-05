import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { SPRING_GENTLE, useReducedMotion } from "../design/motion.js";
import { FileTypeIcon } from "./ui/FileTypeIcon.jsx";
import { IconFile, IconNote } from "./ui/icons.jsx";

/**
 * @typedef {"pdf" | "image" | "audio" | "any"} VaultFileKind
 */

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   ingestBusy: boolean,
 *   nativeLinkReady: boolean,
 *   linkFromDiskSupported?: boolean,
 *   onPickFiles: (kind: VaultFileKind) => void,
 *   onLinkDisk: () => void,
 *   onNewNote: () => void,
 *   onPasteClipboard?: () => void,
 *   onImportBackup?: () => void,
 * }} props
 */
export function IngestDialog({
  open,
  onClose,
  ingestBusy,
  nativeLinkReady,
  linkFromDiskSupported = true,
  onPickFiles,
  onLinkDisk,
  onNewNote,
  onPasteClipboard,
  onImportBackup,
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

  const fileOptions = [
    { kind: "pdf", label: "Add file", hint: "PDF, documents — text extracted for search", iconKind: "pdf", onClick: () => onPickFiles("pdf") },
    { kind: "image", label: "Add photo / screenshot", hint: "Images with on-device OCR", iconKind: "image", onClick: () => onPickFiles("image") },
    { kind: "audio", label: "Record / import voice memo", hint: "Audio transcribed locally", iconKind: "audio", onClick: () => onPickFiles("audio") },
    { kind: "any", label: "Other file", hint: "Any supported attachment", iconKind: "file", onClick: () => onPickFiles("any") },
  ];

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
            className={`ingest-dialog__panel ${isWide ? "ingest-dialog__panel--modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Add to Silo"
            initial={reduced ? false : isWide ? { scale: 0.96, opacity: 0 } : { y: "100%", opacity: 0.98 }}
            animate={isWide ? { scale: 1, opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduced ? undefined : isWide ? { scale: 0.96, opacity: 0 } : { y: "100%", opacity: 0.98 }}
            transition={SPRING_GENTLE}
            drag={reduced || isWide ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (!isWide && info.offset.y > 100) onClose();
            }}
          >
            <div className="ingest-dialog__handle" aria-hidden />
            <h2 className="ingest-dialog__title">Add to Silo</h2>
            <p className="ingest-dialog__subtitle">Files stay private on this device.</p>

            <div className="ingest-dialog__options">
              {fileOptions.map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  className="ingest-option"
                  disabled={ingestBusy}
                  onClick={opt.onClick}
                >
                  <span className="ingest-option__icon-bubble" aria-hidden>
                    <FileTypeIcon kind={opt.iconKind} size={20} />
                  </span>
                  <span className="ingest-option__text">
                    <span className="ingest-option__label">{opt.label}</span>
                    <span className="ingest-option__hint">{opt.hint}</span>
                  </span>
                  <span className="ingest-option__chevron" aria-hidden>›</span>
                </button>
              ))}

              <button type="button" className="ingest-option" disabled={ingestBusy} onClick={() => { onNewNote(); onClose(); }}>
                <span className="ingest-option__icon-bubble" aria-hidden>
                  <IconNote size={20} />
                </span>
                <span className="ingest-option__text">
                  <span className="ingest-option__label">Write note</span>
                  <span className="ingest-option__hint">Like iOS Notes — saved locally</span>
                </span>
                <span className="ingest-option__chevron" aria-hidden>›</span>
              </button>

              {onPasteClipboard && (
                <button type="button" className="ingest-option" disabled={ingestBusy} onClick={() => { onPasteClipboard(); onClose(); }}>
                  <span className="ingest-option__icon-bubble" aria-hidden>
                    <IconFile size={20} />
                  </span>
                  <span className="ingest-option__text">
                    <span className="ingest-option__label">Paste from clipboard</span>
                    <span className="ingest-option__hint">Save clipboard text as a note</span>
                  </span>
                </button>
              )}

              {onImportBackup && (
                <button type="button" className="ingest-option" disabled={ingestBusy} onClick={() => { onImportBackup(); onClose(); }}>
                  <span className="ingest-option__icon-bubble" aria-hidden>
                    <IconFile size={20} />
                  </span>
                  <span className="ingest-option__text">
                    <span className="ingest-option__label">Import backup</span>
                    <span className="ingest-option__hint">Merge a Silo export ZIP</span>
                  </span>
                </button>
              )}

              {linkFromDiskSupported && (
                <button
                  type="button"
                  className="ingest-option"
                  disabled={ingestBusy || !nativeLinkReady}
                  title={nativeLinkReady ? "Keep original on disk" : "Not available in this browser"}
                  onClick={() => { onLinkDisk(); onClose(); }}
                >
                  <span className="ingest-option__icon-bubble" aria-hidden>
                    <IconFile size={20} />
                  </span>
                  <span className="ingest-option__text">
                    <span className="ingest-option__label">Link from disk</span>
                    <span className="ingest-option__hint">
                      {nativeLinkReady ? "Chromium desktop — reads original file" : "Storage unavailable here. Try HTTPS or a supported browser."}
                    </span>
                  </span>
                </button>
              )}
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
