import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

const BODY = `Silo runs entirely in your browser. Your documents, extracted text, and search index stay on your device (Origin Private File System where supported).

We do not operate a Silo server for your vault data and do not send your file contents or index text to our servers. Optional features (such as loading open-source AI models for embeddings) may fetch assets from third-party CDNs you configure in the browser; that traffic goes directly from your browser to those hosts, not through Silo.

This build does not include hidden telemetry. If you install Silo as a PWA, your browser may apply its own update and crash-reporting policies.

You can export your vault as a ZIP backup at any time from Settings.`;

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
