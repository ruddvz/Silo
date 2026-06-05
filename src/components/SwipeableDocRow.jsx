import { useRef, useState } from "react";

const SWIPE_THRESHOLD = 72;
const MAX_OFFSET = 120;

/**
 * @param {{
 *   children: import('react').ReactNode,
 *   onSwipeDelete?: () => void,
 *   onSwipeMore?: () => void,
 *   onSwipeBackup?: () => void,
 *   onSwipePin?: () => void,
 *   pinned?: boolean,
 * }} props
 */
export function SwipeableDocRow({ children, onSwipeDelete, onSwipeMore, onSwipeBackup, onSwipePin, pinned }) {
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const [offset, setOffset] = useState(0);

  const reset = () => setOffset(0);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    if (!t) return;
    startX.current = t.clientX;
    startY.current = t.clientY;
    dragging.current = true;
  };

  const onTouchMove = (e) => {
    if (!dragging.current) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
      dragging.current = false;
      return;
    }
    if (Math.abs(dx) > 8) {
      e.preventDefault();
      const clamped = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dx));
      setOffset(clamped);
    }
  };

  const onTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (offset <= -SWIPE_THRESHOLD) {
      if (onSwipeDelete) onSwipeDelete();
      else onSwipeMore?.();
    } else if (offset >= SWIPE_THRESHOLD) {
      if (onSwipePin) onSwipePin();
      else onSwipeBackup?.();
    }
    reset();
  };

  return (
    <div className="swipe-row">
      <div className="swipe-row__actions swipe-row__actions--left" aria-hidden={offset < 20}>
        {onSwipePin && (
          <button type="button" className="swipe-row__action swipe-row__action--pin" onClick={onSwipePin}>
            {pinned ? "Unpin" : "Pin"}
          </button>
        )}
        {onSwipeBackup && (
          <button type="button" className="swipe-row__action swipe-row__action--backup" onClick={onSwipeBackup}>
            Backup
          </button>
        )}
      </div>
      <div className="swipe-row__actions swipe-row__actions--right" aria-hidden={offset > -20}>
        {onSwipeMore && (
          <button type="button" className="swipe-row__action swipe-row__action--more" onClick={onSwipeMore}>
            More
          </button>
        )}
        {onSwipeDelete && (
          <button type="button" className="swipe-row__action swipe-row__action--delete" onClick={onSwipeDelete}>
            Delete
          </button>
        )}
      </div>
      <div
        className="swipe-row__content"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
