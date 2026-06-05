import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    title: "Your private drop zone",
    body: "Save the documents, screenshots, notes, and voice memos you usually send yourself.",
    step: "welcome",
  },
  {
    title: "Stored on this device by default",
    body: "Silo keeps your vault in browser storage when supported. Files are not uploaded to Silo servers unless you enable optional sharing.",
    step: "local",
  },
  {
    title: "Backups matter",
    body: "Browser storage can be cleared by your device or browser. Export a backup regularly so your vault is recoverable.",
    step: "backup",
  },
  {
    title: "Lock indexed text (optional)",
    body: "A passphrase can protect searchable extracted text. Keep it safe — forgotten passphrases cannot be recovered.",
    step: "passphrase",
  },
  {
    title: "Drop in your first item",
    body: "Add a file, photo, note, or voice memo. You can search everything later — even text inside PDFs and images.",
    step: "ready",
  },
];

/**
 * @param {{
 *   onComplete: () => void,
 *   onAddFirst?: () => void,
 *   storageLimited?: boolean,
 * }} props
 */
export function OnboardingScreen({ onComplete, onAddFirst, storageLimited = false }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step >= STEPS.length - 1;

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <motion.div className="onboarding__card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {storageLimited && (
          <div className="onboarding__banner" role="status">
            On-device storage is limited in this browser. You can still use Silo, but export backups often.
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="onboarding__step"
          >
            <div className="onboarding__icon onboarding__icon--mark" aria-hidden="true">
              {step === 0 ? "S" : step + 1}
            </div>
            <h2 id="onboarding-title" className="onboarding__title">{current.title}</h2>
            <p className="onboarding__body">{current.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="onboarding__dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding__dot ${i === step ? "onboarding__dot--active" : ""}`} />
          ))}
        </div>

        <div className="onboarding__actions">
          {!isLast ? (
            <>
              <button type="button" className="onboarding__btn onboarding__btn--ghost" onClick={onComplete}>
                Skip
              </button>
              <button type="button" className="onboarding__btn onboarding__btn--primary" onClick={() => setStep((s) => s + 1)}>
                Continue
              </button>
            </>
          ) : (
            <>
              <button type="button" className="onboarding__btn onboarding__btn--primary" onClick={() => { onComplete(); onAddFirst?.(); }}>
                Add first item
              </button>
              <button type="button" className="onboarding__btn onboarding__btn--ghost" onClick={onComplete}>
                Explore empty vault
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
