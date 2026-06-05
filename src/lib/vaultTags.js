export const TAG_META = {
  Identity:  { color: "#C8963E", bg: "rgba(200,150,62,0.10)",  label: "ID"  },
  Utilities: { color: "#5B9BD5", bg: "rgba(91,155,213,0.10)",  label: "UTL" },
  Housing:   { color: "#6BBF7A", bg: "rgba(107,191,122,0.10)", label: "HSG" },
  Tax:       { color: "#C86E8A", bg: "rgba(200,110,138,0.10)", label: "TAX" },
  Finance:   { color: "#D4935A", bg: "rgba(212,147,90,0.10)",  label: "FIN" },
  Insurance: { color: "#9B7EC8", bg: "rgba(155,126,200,0.10)", label: "INS" },
  Education: { color: "#C8B43E", bg: "rgba(200,180,62,0.10)",  label: "EDU" },
  Moments:   { color: "#5BC8C4", bg: "rgba(91,200,196,0.10)",  label: "MSG" },
};

export const ALL_TAGS = ["All", ...Object.keys(TAG_META)];

/** @param {string} text */
export function inferTagGuess(text) {
  const t = text.toLowerCase();
  if (/passport|driver|license|sin card|identity|citizenship/.test(t)) return "Identity";
  if (/hydro|utility|electric|water|gas bill/.test(t)) return "Utilities";
  if (/lease|rent|landlord|tenant|housing/.test(t)) return "Housing";
  if (/\bt4\b|tax return|income tax|irs|cra/.test(t)) return "Tax";
  if (/bank|statement|cheque|check|finance|account/.test(t)) return "Finance";
  if (/insurance|policy|premium|auto coverage/.test(t)) return "Insurance";
  if (/diploma|degree|university|college|education/.test(t)) return "Education";
  if (/whatsapp|telegram|signal|imessage|slack|discord|texted|fwd:|forwarded/.test(t)) return "Moments";
  if (/screenshot|screen\s*shot|photo|camera|image|png|jpeg|jpg/.test(t)) return "Moments";
  return "Identity";
}

/** @param {string} text */
export function inferTagForNote(text) {
  const t = text.toLowerCase();
  if (/whatsapp|telegram|signal|imessage|slack|discord|texted|fwd:|forwarded|dm /.test(t)) return "Moments";
  return inferTagGuess(text);
}
