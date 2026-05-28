import { useState, useEffect } from "react";
import { ListsTopNav } from "../components/ListsTopNav.jsx";
import * as api from "../lib/api.js";
import { fileToMarkdown } from "../lib/markdown.js";
import { getItemsForFile } from "../lib/localStore.js";

/**
 * @param {{ fileId: string, user: object, onBack: () => void, onSaved: () => void }} props
 */
export function RawTextPage({ fileId, user, onBack, onSaved }) {
  const [raw, setRaw] = useState("");
  const [title, setTitle] = useState("Text view");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const files = await api.fetchLists(user.id);
      const file = files.find((f) => f.id === fileId);
      if (!file) return;
      setTitle(file.title);
      const items = await api.fetchListItems(fileId);
      const list = items.length ? items : getItemsForFile(fileId);
      setRaw(fileToMarkdown(file, list));
    })();
  }, [fileId, user.id]);

  async function save() {
    setSaving(true);
    try {
      await api.applyMarkdown(fileId, raw, user);
      onSaved();
      onBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="lists-app">
      <ListsTopNav title="Text view" onBack={onBack} />
      <div className="lists-app__scroll">
        <p style={{ color: "var(--lists-text-secondary)", fontSize: 14 }}>{title} — markdown checklist</p>
        <textarea className="lists-textarea" value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false} />
        <button type="button" className="lists-btn" style={{ marginTop: 16 }} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save from text"}
        </button>
      </div>
    </div>
  );
}
