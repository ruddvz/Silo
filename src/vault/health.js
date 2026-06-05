import { readVaultBlobFile, loadExtractedText, readTextSidecar } from "./opfs.js";
import { sha256HexFromBlob } from "./fileHash.js";
import { normalizeTextForFingerprint } from "./textFingerprint.js";

/**
 * @typedef {"critical" | "warning" | "info"} HealthSeverity
 * @typedef {{
 *   id?: string,
 *   code: string,
 *   severity: HealthSeverity,
 *   detail: string,
 * }} VaultHealthIssue
 */

/**
 * @param {FileSystemDirectoryHandle | null} vault
 * @param {Array<import("./manifestMeta.js").VaultManifestEntry>} entries
 * @param {{ semanticSearchEnabled?: boolean }} [options]
 */
export async function checkVaultHealth(vault, entries, options = {}) {
  const { semanticSearchEnabled = false } = options;
  /** @type {VaultHealthIssue[]} */
  const issues = [];

  if (!vault) {
    issues.push({
      code: "no_vault",
      severity: "critical",
      detail: "OPFS vault is unavailable on this browser or profile.",
    });
    return buildHealthReport(issues);
  }

  const raw = await import("./manifestMeta.js").then((m) => m.loadRawManifest(vault));
  if (!raw) {
    if (entries.length > 0) {
      issues.push({
        code: "missing_manifest",
        severity: "critical",
        detail: "Manifest file is missing but entries were expected.",
      });
    }
    return buildHealthReport(issues);
  }

  if (!Array.isArray(raw.entries)) {
    issues.push({
      code: "invalid_manifest",
      severity: "critical",
      detail: "Manifest exists but has no entries array.",
    });
    return buildHealthReport(issues);
  }

  for (const e of entries) {
    const id = String(e.id);
    const storage = e.storage === "linked" ? "linked" : "opfs";

    if (storage === "opfs") {
      const blob = await readVaultBlobFile(vault, id);
      if (!blob || blob.size === 0) {
        issues.push({
          id,
          code: "missing_blob",
          severity: "critical",
          detail: `"${e.name}" has no file blob in local storage.`,
        });
      } else if (e.contentHash) {
        try {
          const hash = await sha256HexFromBlob(blob);
          if (hash !== e.contentHash) {
            issues.push({
              id,
              code: "hash_mismatch",
              severity: "warning",
              detail: `"${e.name}" blob hash does not match manifest.`,
            });
          }
        } catch {
          issues.push({
            id,
            code: "hash_check_failed",
            severity: "info",
            detail: `Could not verify hash for "${e.name}".`,
          });
        }
      }
    } else if (storage === "linked") {
      issues.push({
        id,
        code: "linked_storage",
        severity: "info",
        detail: `"${e.name}" is linked from disk — access may require permission again.`,
      });
    }

    const txt = await loadExtractedText(vault, id);
    if (e.extractionError) {
      issues.push({
        id,
        code: "extraction_error",
        severity: "warning",
        detail: `"${e.name}": ${e.extractionError}`,
      });
    } else if (txt == null || txt === "") {
      const pending = e.extractionStatus === "pending" || e.extractionStatus === "unknown";
      issues.push({
        id,
        code: pending ? "text_pending" : "missing_text",
        severity: pending ? "info" : "warning",
        detail: pending
          ? `"${e.name}" text extraction is still pending.`
          : `"${e.name}" has no extracted text sidecar.`,
      });
    }

    if (e.textFingerprint && txt) {
      const normalized = normalizeTextForFingerprint(txt);
      if (!normalized) {
        issues.push({
          id,
          code: "empty_fingerprint_source",
          severity: "info",
          detail: `"${e.name}" has empty indexable text.`,
        });
      }
    }

    if (semanticSearchEnabled) {
      const emb = await readTextSidecar(vault, `${id}.emb.json`);
      if (emb == null || emb === "") {
        issues.push({
          id,
          code: "missing_embedding",
          severity: "info",
          detail: `"${e.name}" has no semantic embedding (search may be keyword-only).`,
        });
      }
    }
  }

  return buildHealthReport(issues);
}

/** @param {VaultHealthIssue[]} issues */
function buildHealthReport(issues) {
  const critical = issues.filter((i) => i.severity === "critical");
  const warning = issues.filter((i) => i.severity === "warning");
  const info = issues.filter((i) => i.severity === "info");
  return {
    healthy: critical.length === 0,
    issues,
    summary: {
      total: issues.length,
      critical: critical.length,
      warning: warning.length,
      info: info.length,
    },
  };
}

/** @deprecated use checkVaultHealth */
export async function checkVaultIntegrity(vault, entries, options) {
  const report = await checkVaultHealth(vault, entries, options);
  return report.issues.map((i) => ({
    id: i.id || "",
    code: i.code,
    detail: i.detail,
  }));
}
