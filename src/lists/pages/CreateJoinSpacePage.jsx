import { useState } from "react";
import * as api from "../lib/api.js";
import { ListsTopNav } from "../components/ListsTopNav.jsx";

const TEMPLATES = {
  Groceries: ["Milk", "Eggs", "Bread"],
  Travel: ["Passport", "Chargers", "Snacks"],
  Home: ["Laundry", "Trash", "Plants"],
  "Date Ideas": ["Dinner", "Movie", "Walk"],
  "Things to Buy": [],
};

/**
 * @param {{ user: object, mode: 'create' | 'join' | 'invite', space?: object, onDone: (space: object) => void, onBack: () => void }} props
 */
export function CreateJoinSpacePage({ user, mode: initialMode, space, onDone, onBack }) {
  const [mode, setMode] = useState(initialMode);
  const [yourName, setYourName] = useState(user?.name || "");
  const [partnerName, setPartnerName] = useState("Partner");
  const [spaceName, setSpaceName] = useState("Our Lists");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdSpace, setCreatedSpace] = useState(space || null);

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const sp = await api.createSpace({ yourName, partnerName, spaceName }, user);
      setCreatedSpace(sp);
      setMode("invite");
    } catch (err) {
      setError(err?.message || "Could not create space");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const sp = await api.joinSpace(code, user);
      onDone(sp);
    } catch (err) {
      setError(err?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    const c = createdSpace?.inviteCode;
    if (c) navigator.clipboard?.writeText(c);
  }

  if (mode === "invite" && createdSpace) {
    return (
      <div className="lists-app">
        <ListsTopNav title="Invite partner" onBack={onBack} />
        <div className="lists-app__scroll">
          <p style={{ textAlign: "center", color: "var(--lists-text-secondary)" }}>Share this code with your partner</p>
          <div className="lists-card" style={{ marginTop: 16 }}>
            <p style={{ textAlign: "center", margin: 0, color: "var(--lists-text-secondary)" }}>Invite code</p>
            <div className="lists-invite-code">{createdSpace.inviteCode}</div>
            <button type="button" className="lists-btn" onClick={copyCode}>
              Copy code
            </button>
            <button
              type="button"
              className="lists-btn lists-btn--ghost"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: "Silo Lists invite",
                    text: `Join our Silo space with code ${createdSpace.inviteCode}`,
                  });
                }
              }}
            >
              Share invite
            </button>
            <button type="button" className="lists-btn" style={{ marginTop: 12 }} onClick={() => onDone(createdSpace)}>
              Continue to lists
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="lists-app">
        <ListsTopNav title="Join space" onBack={() => setMode("create")} />
        <div className="lists-app__scroll">
          <form className="lists-card" onSubmit={handleJoin}>
            <input
              className="lists-field"
              placeholder="Invite code (e.g. SILO-4821)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <input className="lists-field" placeholder="Your name" value={yourName} onChange={(e) => setYourName(e.target.value)} />
            {error && <p style={{ color: "#ef4444", fontSize: 14 }}>{error}</p>}
            <button type="submit" className="lists-btn" disabled={loading}>
              Join space
            </button>
          </form>
          <button type="button" className="lists-link" style={{ display: "block", margin: "20px auto" }} onClick={() => setMode("create")}>
            Create a new space instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lists-app">
      <ListsTopNav title="Create your space" onBack={onBack} />
      <div className="lists-app__scroll">
        <form className="lists-card" onSubmit={handleCreate}>
          <input className="lists-field" placeholder="Your name" value={yourName} onChange={(e) => setYourName(e.target.value)} required />
          <input className="lists-field" placeholder="Partner name" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
          <input className="lists-field" placeholder="Space name" value={spaceName} onChange={(e) => setSpaceName(e.target.value)} />
          {error && <p style={{ color: "#ef4444", fontSize: 14 }}>{error}</p>}
          <button type="submit" className="lists-btn" disabled={loading}>
            Create space
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20 }}>
          <button type="button" className="lists-link" onClick={() => setMode("join")}>
            Already have a code? Join space
          </button>
        </p>
      </div>
    </div>
  );
}

export { TEMPLATES };
