import { useSyncExternalStore } from "react";

export const SPRING_GENTLE = { type: "spring", stiffness: 260, damping: 26 };
export const SPRING_SNAPPY = { type: "spring", stiffness: 400, damping: 32 };
export const EASE_OUT = { duration: 0.22, ease: [0.22, 1, 0.36, 1] };
export const EASE_IN_OUT = { duration: 0.3, ease: [0.4, 0, 0.2, 1] };

export const PAGE_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: EASE_OUT },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

export const STAGGER_CONTAINER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: EASE_OUT },
};

function subscribeReducedMotion(cb) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

/** React hook — use for Framer Motion `transition` overrides. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
}
