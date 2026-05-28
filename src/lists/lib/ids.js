/** @returns {string} */
export function uid(prefix = "id") {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/** @returns {string} */
export function inviteCode() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `SILO-${n}`;
}
