import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    title: "A private vault for everything you send yourself",
    body: "Save documents, screenshots, voice memos, and notes in seconds — organized on your device.",
    icon: "🗄",
  },
  {
    title: "Local-first by default",
    body: "Files stay on this device unless you export a backup or enable optional sharing. Nothing is uploaded to Silo servers.",
    icon: "📱",
  },
  {
    title: "Back up regularly",
    body: "Browser storage can be cleared by the system or browser. Export a ZIP backup from Settings to keep your vault safe.",
    icon: "💾",
  },
  {
    title: "Ready when you are",
    body: "Add your first file, photo, note, or voice memo. You can search everything later — even text inside PDFs and images.",
    icon: "✓",
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
            <div className="onboarding__icon" aria-hidden="true">{current.icon}</div>
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
