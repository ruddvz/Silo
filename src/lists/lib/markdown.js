/**
 * Parse markdown checklist into structured list data.
 * @param {string} raw
 * @returns {{ title: string, items: Array<{ text: string, checked: boolean }>, notes: string }}
 */
export function parseListMarkdown(raw) {
  const lines = (raw || "").split(/\r?\n/);
  let title = "Untitled list";
  const items = [];
  let notes = "";
  let inNotes = false;
  const noteLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed && !inNotes) continue;

    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h1) {
      title = h1[1].trim();
      inNotes = false;
      continue;
    }

    const notesHeader = trimmed.match(/^##\s+notes\s*$/i);
    if (notesHeader) {
      inNotes = true;
      continue;
    }

    const item = trimmed.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (item) {
      inNotes = false;
      items.push({ text: item[2].trim(), checked: item[1].toLowerCase() === "x" });
      continue;
    }

    if (inNotes) noteLines.push(line);
    else if (trimmed && items.length === 0 && !title) title = trimmed;
  }

  notes = noteLines.join("\n").trim();
  return { title, items, notes };
}

/**
 * @param {{ title: string, items: Array<{ text: string, checked: boolean, important?: boolean }>, notes?: string }} list
 * @returns {string}
 */
export function serializeListMarkdown({ title, items, notes }) {
  const lines = [`# ${title || "Untitled list"}`, ""];
  for (const item of items || []) {
    const mark = item.checked ? "x" : " ";
    let line = `- [${mark}] ${item.text}`;
    if (item.important) line += " !important";
    lines.push(line);
  }
  if (notes?.trim()) {
    lines.push("", "## Notes", notes.trim());
  }
  return lines.join("\n").trim() + "\n";
}

/**
 * @param {import('./types.js').SharedListFile} file
 * @param {import('./types.js').ListItem[]} items
 */
export function fileToMarkdown(file, items) {
  return serializeListMarkdown({
    title: file.title,
    items: (items || []).map((i) => ({
      text: i.text,
      checked: i.checked,
      important: i.important,
    })),
    notes: file.notes || "",
  });
}
