import { useRef } from "react";
import { ListsTopNav } from "../components/ListsTopNav.jsx";
import * as api from "../lib/api.js";
import { getFiles, getItemsForFile } from "../lib/localStore.js";
import { serializeListMarkdown } from "../lib/markdown.js";

/**
 * @param {{ user: object, space: object, themeMode: string, onTheme: (m: string) => void, onSignOut: () => void, onImport: (raw: string) => void }} props
 */
export function SettingsPage({ user, space, themeMode, onTheme, onSignOut, onImport }) {
  const importRef = useRef(null);

  function exportAll() {
    const files = getFiles();
    const parts = files.map((file) => {
      const items = getItemsForFile(file.id);
      return serializeListMarkdown({
        title: file.title,
        items: items.map((i) => ({ text: i.text, checked: i.checked, important: i.important })),
        notes: file.notes,
      });
    });
    const blob = new Blob([parts.join("\n\n---\n\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "silo-lists-export.md";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <ListsTopNav title="Settings" />
      <div className="lists-app__scroll">
        <div className="lists-card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600 }}>Shared space</div>
          <div className="lists-file-card__meta">{space?.name}</div>
          <div className="lists-file-card__meta">{space?.members?.length || 2} members · {space?.inviteCode}</div>
        </div>
        <div className="lists-card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600 }}>Account</div>
          <div className="lists-file-card__meta">{user.name}</div>
          <div className="lists-file-card__meta">{user.email}</div>
        </div>
        <div className="lists-card">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Appearance</div>
          {["light", "dark", "system"].map((m) => (
            <button
              key={m}
              type="button"
              className="lists-settings-row"
              onClick={() => onTheme(m)}
              style={{ fontWeight: themeMode === m ? 600 : 400 }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
              {themeMode === m && <span className="lists-badge">On</span>}
            </button>
          ))}
          <div style={{ fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Privacy</div>
          <button type="button" className="lists-settings-row" onClick={exportAll}>
            Export all lists
          </button>
          <button type="button" className="lists-settings-row" onClick={() => importRef.current?.click()}>
            Import markdown list
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".md,.txt,text/markdown,text/plain"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const raw = await file.text();
              onImport(raw);
              e.target.value = "";
            }}
          />
          <div style={{ fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Partner access</div>
          <div className="lists-settings-row" style={{ cursor: "default" }}>
            Invite code
            <span className="lists-badge">{space?.inviteCode}</span>
          </div>
          <button type="button" className="lists-settings-row" style={{ color: "#ef4444" }} onClick={onSignOut}>
            Sign out
          </button>
        </div>
        {!api.hasSupabase() && (
          <p style={{ fontSize: 13, color: "var(--lists-text-secondary)", textAlign: "center", marginTop: 20 }}>
            Running in local mode. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for cloud sync.
          </p>
        )}
      </div>
    </>
  );
}
