import { hasSupabase } from "../lib/supabase.js";

/**
 * Reminds users that Silo Lists is separate from the on-device document vault.
 */
export function ListsPrivacyBanner() {
  const synced = hasSupabase();

  return (
    <aside className="lists-privacy-banner" role="note" aria-label="Privacy notice">
      <strong>Vault stays private.</strong>{" "}
      {synced
        ? "Checklist titles and items sync through your Supabase project only."
        : "Lists run in local mode on this browser — nothing leaves this device."}{" "}
      Document vault files (PDFs, photos, notes) are never uploaded to Silo Lists.
    </aside>
  );
}
