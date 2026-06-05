import { motion } from "framer-motion";
import { useReducedMotion } from "../design/motion.js";

const EMPTY_CONFIGS = {
  vault: {
    icon: "🗄",
    title: "Your vault is empty",
    body: "Add PDFs, images, voice memos, or notes. Everything stays on your device.",
    cta: "Add your first file",
    action: "ingest",
  },
  search: {
    icon: "🔍",
    title: "No matches found",
    body: "Try a broader word, check another category, or add more items to Silo.",
    cta: null,
  },
  "search-idle": {
    icon: "🔍",
    title: "Search anything",
    body: 'Try "passport," "rent," "bank statement," or "voice memo."',
    cta: null,
  },
  category: {
    icon: "🏷",
    title: "No documents in this category",
    body: "Tag documents to organise them here.",
    cta: null,
  },
  voice: {
    icon: "🎙",
    title: "No voice memos yet",
    body: "Record or import audio files — Silo transcribes them locally.",
    cta: "Add audio",
    action: "ingest-audio",
  },
};

/**
 * @param {{
 *   variant?: keyof typeof EMPTY_CONFIGS,
 *   onAction?: (action: string) => void,
 * }} props
 */
export function EmptyState({ variant = "vault", onAction }) {
  const cfg = EMPTY_CONFIGS[variant] || EMPTY_CONFIGS.vault;
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="empty-state"
      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="empty-state__icon" aria-hidden>
        {cfg.icon}
      </span>
      <h3 className="empty-state__title" style={{ textWrap: "balance" }}>
        {cfg.title}
      </h3>
      <p className="empty-state__body">{cfg.body}</p>
      {cfg.cta && (
        <button type="button" className="btn btn--accent" onClick={() => onAction?.(cfg.action)}>
          {cfg.cta}
        </button>
      )}
    </motion.div>
  );
}
