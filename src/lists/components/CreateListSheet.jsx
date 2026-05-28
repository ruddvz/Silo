import { useState } from "react";
import { TEMPLATES } from "../pages/CreateJoinSpacePage.jsx";

const COLORS = ["#7C6CF2", "#3ecf8e", "#f5a623", "#ef4444", "#38bdf8"];

/**
 * @param {{ open: boolean, onClose: () => void, onCreate: (payload: { title: string, color: string, templateItems: string[] }) => void }} props
 */
export function CreateListSheet({ open, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  if (!open) return null;

  function submit(e) {
    e.preventDefault();
    const items = template ? TEMPLATES[template] || [] : [];
    onCreate({
      title: title.trim() || template || "New list",
      color,
      templateItems: items,
    });
    setTitle("");
    setTemplate("");
    onClose();
  }

  return (
    <>
      <div className="lists-sheet-overlay" onClick={onClose} role="presentation" />
      <div className="lists-sheet lists-sheet--desktop" role="dialog" aria-label="New list">
        <div className="lists-sheet__handle" />
        <h2 style={{ margin: "0 0 16px", fontSize: "1.25rem" }}>New list</h2>
        <form onSubmit={submit}>
          <input
            className="lists-field"
            placeholder="List name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--lists-text-secondary)" }}>Template</p>
          <div className="lists-templates">
            {Object.keys(TEMPLATES).map((name) => (
              <button
                key={name}
                type="button"
                className={`lists-template-chip ${template === name ? "lists-template-chip--active" : ""}`}
                onClick={() => {
                  setTemplate(name);
                  if (!title) setTitle(name);
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--lists-text-secondary)" }}>Color</p>
          <div className="lists-color-dots">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`lists-color-dot ${color === c ? "lists-color-dot--active" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <button type="submit" className="lists-btn">
            Create list
          </button>
        </form>
      </div>
    </>
  );
}
