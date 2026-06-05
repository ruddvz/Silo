import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

const BODY = `Silo stores your vault on this device by default. Your files are not uploaded to Silo servers.

What stays local: original files (OPFS), extracted text, search index, and optional semantic embeddings — all computed in your browser.

Optional passphrase: encrypts indexed/extracted text at rest. It does not encrypt original file blobs unless you use full-blob encryption (planned). If you forget the passphrase, encrypted text cannot be recovered.

Shared lists (optional): if you enable Supabase in Settings → Lists, only shared checklist data goes to your connected Supabase project — not your private vault files.

Browser storage can be cleared by the browser or device. Export ZIP backups regularly from Settings.

Third-party CDNs: enabling semantic search or OCR may download open-source models directly to your browser from public model hosts.`;

/**
 * @param {{ onClose: () => void }} props
 */
export function PrivacyModal({ onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <motion.div
        className="privacy-modal__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="privacy-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
      >
        <div className="privacy-modal__header">
          <h2 id="privacy-title" className="privacy-modal__title">
            Privacy
          </h2>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="privacy-modal__body">{BODY}</div>
        <button type="button" className="btn btn--accent" onClick={onClose}>
          Close
        </button>
      </motion.div>
    </>
  );
}
