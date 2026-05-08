import { motion } from "framer-motion";
import { useReducedMotion } from "../design/motion.js";

/**
 * @param {{
 *   items: Array<{ id: string, name?: string, url?: string, text?: string }>,
 *   onProcess: (item: object) => void,
 *   onDismiss: () => void,
 *   onProcessAll?: () => void,
 * }} props
 */
export function ShareQueue({ items, onProcess, onDismiss, onProcessAll }) {
  const reduced = useReducedMotion();
  if (!items?.length) return null;

  return (
    <motion.div
      className="share-queue"
      initial={reduced ? false : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      role="region"
      aria-label="Shared items queue"
    >
      <div className="share-queue__header">
        <span>
          📥 {items.length} item{items.length > 1 ? "s" : ""} shared to Silo
        </span>
        <div className="share-queue__actions">
          {onProcessAll && (
            <button type="button" className="btn btn--sm btn--accent" onClick={onProcessAll}>
              Import all
            </button>
          )}
          <button type="button" className="btn btn--sm btn--ghost" onClick={onDismiss}>
            Dismiss banner
          </button>
        </div>
      </div>
      <ul className="share-queue__list">
        {items.map((item) => (
          <li key={item.id} className="share-queue__item">
            <span className="share-queue__name">{item.name || item.url || "(text)"}</span>
            <button type="button" className="btn btn--accent btn--sm" onClick={() => onProcess(item)}>
              Add to vault
            </button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
