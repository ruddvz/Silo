import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "../design/motion.js";

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className="search-bar__icon-svg">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/**
 * Local draft updates immediately; `onChange` is debounced (300ms) for expensive search work.
 * @param {{
 *   value: string,
 *   onChange: (q: string) => void,
 *   isSearching?: boolean,
 *   semanticReady?: boolean,
 *   semanticLabel?: string,
 *   placeholder?: string,
 *   inputId?: string,
 *   resultCount?: number | null,
 *   onBlur?: () => void,
 * }} props
 */
export function SearchBar({
  value,
  onChange,
  isSearching = false,
  semanticReady = true,
  semanticLabel,
  placeholder = "Search vault…",
  inputId = "silo-global-search",
  resultCount = null,
  onBlur,
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const flush = useCallback(
    (q) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange(q), 300);
    },
    [onChange],
  );

  const handleInput = useCallback(
    (e) => {
      const v = e.target.value;
      setDraft(v);
      flush(v);
    },
    [flush],
  );

  const clear = useCallback(() => {
    clearTimeout(debounceRef.current);
    setDraft("");
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
  const shortcut = isMac ? "⌘K" : "Ctrl+K";

  return (
    <motion.div
      className={`search-bar ${focused ? "search-bar--focused" : ""}`}
      animate={
        reduced
          ? {}
          : { boxShadow: focused ? "0 0 0 2px var(--color-accent)" : "0 0 0 1px var(--color-border)" }
      }
      transition={{ duration: 0.15 }}
      role="search"
    >
      <SearchIcon />
      <input
        id={inputId}
        value={draft}
        onChange={handleInput}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        placeholder={placeholder}
        aria-label="Search documents"
        autoComplete="off"
        spellCheck="false"
      />
      <AnimatePresence>
        {isSearching && (
          <motion.div
            className="search-spinner"
            initial={reduced ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.8 }}
            aria-hidden
          />
        )}
        {draft && !isSearching && (
          <motion.button
            type="button"
            className="search-clear"
            onClick={clear}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            aria-label="Clear search"
          >
            ✕
          </motion.button>
        )}
      </AnimatePresence>
      {semanticLabel != null && semanticLabel !== "" && (
        <span className={`search-semantic-pill ${semanticReady ? "search-semantic-pill--ready" : ""}`} title="On-device embeddings">
          {semanticLabel}
        </span>
      )}
      {resultCount != null && value.trim() && !isSearching && (
        <span className="search-result-count" aria-live="polite">
          {resultCount}
        </span>
      )}
      {!focused && !draft && (
        <kbd className="search-shortcut" aria-hidden>
          {shortcut}
        </kbd>
      )}
    </motion.div>
  );
}
