import { useState, useEffect, useCallback } from "react";
import { ListsTopNav } from "../components/ListsTopNav.jsx";
import * as api from "../lib/api.js";
import { getItemsForFile, getPartnerMember, memberDisplayName } from "../lib/localStore.js";
import { formatRelativeTime } from "../lib/format.js";

/**
 * @param {{ fileId: string, user: object, space: object, onBack: () => void, onTextView: () => void, onRefresh: () => void }} props
 */
export function ListDetailPage({ fileId, user, space, onBack, onTextView, onRefresh }) {
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const partner = getPartnerMember(space, user.id);
  const partnerName = memberDisplayName(partner, "her");

  const load = useCallback(async () => {
    const files = await api.fetchLists(user.id);
    const f = files.find((x) => x.id === fileId);
    setFile(f || null);
    const its = await api.fetchListItems(fileId);
    setItems(its.length ? its : getItemsForFile(fileId));
    onRefresh();
  }, [fileId, user.id, onRefresh]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newText.trim()) return;
    await api.addListItem(fileId, newText, user);
    setNewText("");
    load();
  }

  async function toggle(itemId) {
    await api.toggleListItem(fileId, itemId, user);
    load();
  }

  async function remove(itemId) {
    await api.deleteListItem(fileId, itemId, user);
    load();
  }

  function actorLabel(createdBy) {
    if (createdBy === user.id) return "Added by you";
    return `Added by ${partnerName}`;
  }

  const open = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  if (!file) {
    return (
      <div className="lists-app">
        <ListsTopNav title="List" onBack={onBack} />
        <div className="lists-empty">Loading…</div>
      </div>
    );
  }

  return (
    <div className="lists-app">
      <ListsTopNav title={file.title} onBack={onBack} onRight={onTextView} rightLabel="Aa" />
      <div className="lists-app__scroll">
        <p style={{ color: "var(--lists-text-secondary)", fontSize: 14, margin: "0 0 16px" }}>
          {open.length} open · updated {formatRelativeTime(file.updatedAt)}
        </p>
        <form className="lists-quick-add" onSubmit={handleAdd}>
          <input
            placeholder="+ Add item…"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            aria-label="Add list item"
          />
        </form>
        {open.map((item) => (
          <div key={item.id} className="lists-check-row">
            <button
              type="button"
              className="lists-check"
              onClick={() => toggle(item.id)}
              aria-label={`Complete ${item.text}`}
            />
            <div className="lists-check-row__text">
              {editingId === item.id ? (
                <input
                  className="lists-field"
                  style={{ margin: 0 }}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={async () => {
                    await api.updateListItem(fileId, item.id, { text: editText }, user);
                    setEditingId(null);
                    load();
                  }}
                  autoFocus
                />
              ) : (
                <span
                  onDoubleClick={() => {
                    setEditingId(item.id);
                    setEditText(item.text);
                  }}
                >
                  {item.text}
                  {item.important && <span className="lists-badge" style={{ marginLeft: 8 }}>Important</span>}
                </span>
              )}
              <div className="lists-check-row__sub">{actorLabel(item.createdBy)}</div>
            </div>
            <button type="button" className="lists-link" style={{ fontSize: 12 }} onClick={() => remove(item.id)}>
              Delete
            </button>
          </div>
        ))}
        {done.length > 0 && (
          <>
            <p style={{ fontWeight: 600, margin: "20px 0 10px", fontSize: 14, color: "var(--lists-text-secondary)" }}>
              Completed
            </p>
            {done.map((item) => (
              <div key={item.id} className="lists-check-row">
                <button type="button" className="lists-check lists-check--done" onClick={() => toggle(item.id)} aria-label={`Uncomplete ${item.text}`}>
                  ✓
                </button>
                <div className="lists-check-row__text done">
                  {item.text}
                  <div className="lists-check-row__sub">
                    Completed by {item.completedBy === user.id ? "you" : partnerName}
                    {item.completedAt ? ` · ${new Date(item.completedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <button type="button" className="lists-btn lists-btn--ghost" style={{ marginTop: 24 }} onClick={onTextView}>
          View as text
        </button>
      </div>
    </div>
  );
}
