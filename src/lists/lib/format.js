export function formatRelativeTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function greetingName(name) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name || "there"}`;
}

export function activityMessage(entry, partnerName, selfName) {
  const who = entry.actorName === selfName ? "You" : partnerName || "Partner";
  const her = entry.actorName !== selfName && entry.actorName?.toLowerCase() !== selfName?.toLowerCase();
  const label = her ? "Her" : who;
  switch (entry.action) {
    case "completed_item":
      return `${label} completed “${entry.itemText}”`;
    case "added_item":
      return `${who} added “${entry.itemText}”`;
    case "edited_item":
      return `${who} edited “${entry.itemText || entry.fileTitle || "a list"}”`;
    case "created_list":
      return `${who} created “${entry.fileTitle}”`;
    case "deleted_list":
      return `${who} removed a list`;
    default:
      return `${who} updated the space`;
  }
}
