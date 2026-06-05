import { motion } from "framer-motion";
import { useReducedMotion } from "../design/motion.js";
import { Button } from "./ui/Button.jsx";

const EMPTY_CONFIGS = {
  vault: {
    iconClass: "empty-state__glyph--vault",
    title: "Empty vault",
    body: "Add a file, screenshot, note, or voice memo. Silo will keep it searchable on this device.",
    primary: { label: "Add to Silo", action: "ingest" },
  },
  search: {
    iconClass: "empty-state__glyph--search",
    title: "No results",
    body: "Nothing matched this search. Try a different word or add a note with this information.",
    primary: { label: "Add note", action: "note" },
    secondary: { label: "Clear search", action: "clear" },
  },
  "search-idle": {
    iconClass: "empty-state__glyph--search",
    title: "Search your private vault",
    body: 'Try "passport," "rent," "bank statement," or a word from a screenshot.',
  },
  category: {
    iconClass: "empty-state__glyph--tag",
    title: "No documents in this category",
    body: "Tag documents to organise them here.",
  },
  voice: {
    iconClass: "empty-state__glyph--voice",
    title: "No voice notes yet",
    body: "Record or import audio files — Silo transcribes them locally.",
    primary: { label: "Add voice memo", action: "ingest-audio" },
  },
  screenshots: {
    iconClass: "empty-state__glyph--image",
    title: "No screenshots yet",
    body: "Save screenshots to Silo and search the text inside them.",
    primary: { label: "Add photo", action: "ingest-image" },
  },
  backup: {
    iconClass: "empty-state__glyph--backup",
    title: "No backup yet",
    body: "Export a ZIP so you can restore Silo on this or another device.",
    primary: { label: "Export backup", action: "backup" },
  },
  storage: {
    iconClass: "empty-state__glyph--warning",
    title: "Storage unavailable",
    body: "This browser cannot open private device storage here. Use HTTPS or try another supported browser.",
    primary: { label: "Retry", action: "retry" },
    secondary: { label: "Learn more", action: "learn" },
  },
  semantic: {
    iconClass: "empty-state__glyph--search",
    title: "Semantic search is off",
    body: "Turn it on in Settings to search by meaning, not just keywords.",
  },
  preview: {
    iconClass: "empty-state__glyph--vault",
    title: "Nothing selected",
    body: "Choose a document to preview details and actions.",
  },
  recovery: {
    iconClass: "empty-state__glyph--success",
    title: "Vault looks healthy",
    body: "No critical issues found. Export a backup periodically for peace of mind.",
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
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.18, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className={`empty-state__glyph ${cfg.iconClass}`} aria-hidden />
      <h3 className="empty-state__title">{cfg.title}</h3>
      <p className="empty-state__body">{cfg.body}</p>
      <div className="empty-state__actions">
        {cfg.primary && (
          <Button variant="primary" size="md" onClick={() => onAction?.(cfg.primary.action)}>
            {cfg.primary.label}
          </Button>
        )}
        {cfg.secondary && (
          <Button variant="ghost" size="md" onClick={() => onAction?.(cfg.secondary.action)}>
            {cfg.secondary.label}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
