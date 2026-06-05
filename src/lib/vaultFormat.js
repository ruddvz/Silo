export function parseMB(sizeStr) {
  const n = parseFloat(sizeStr);
  return sizeStr.includes("MB") ? n : n / 1024;
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatRelativeDate(iso) {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffSec = Math.round((d.getTime() - now) / 1000);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const abs = Math.abs(diffSec);
    if (abs < 60) return rtf.format(0, "second");
    if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
    if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), "day");
    if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / (86400 * 7)), "week");
    if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
    return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
  } catch {
    return formatDate(iso);
  }
}
