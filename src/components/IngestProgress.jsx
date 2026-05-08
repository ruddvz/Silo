import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "../design/motion.js";

const STAGES = [
  { id: "reading", label: "Reading file…" },
  { id: "ocr", label: "Running OCR…" },
  { id: "transcribe", label: "Transcribing audio…" },
  { id: "embed", label: "Building index…" },
  { id: "store", label: "Saving to vault…" },
];

/**
 * @param {{
 *   stage: string | null,
 *   progress?: number | null,
 *   fileName?: string | null,
 *   error?: string | null,
 * }} props
 */
export function IngestProgress({ stage, progress, fileName, error }) {
  const stageIndex = STAGES.findIndex((s) => s.id === stage);
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {stage && (
        <motion.div
          className="ingest-overlay"
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: 10 }}
        >
          <div className="ingest-panel">
            {fileName && <p className="ingest-filename">{fileName}</p>}

            <div className="ingest-stages">
              {STAGES.map((s, i) => (
                <div
                  key={s.id}
                  className={`ingest-stage ${i < stageIndex ? "ingest-stage--done" : ""} ${i === stageIndex ? "ingest-stage--active" : ""}`}
                >
                  <span className="ingest-stage__dot" />
                  <span className="ingest-stage__label">{s.label}</span>
                  {i === stageIndex && typeof progress === "number" && (
                    <span className="ingest-stage__pct">{Math.round(progress)}%</span>
                  )}
                </div>
              ))}
            </div>

            {typeof progress === "number" && (
              <div className="ingest-bar">
                <motion.div
                  className="ingest-bar__fill"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear", duration: reduced ? 0 : 0.3 }}
                />
              </div>
            )}

            {error && <p className="ingest-error">{error}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
