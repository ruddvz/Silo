import { useState } from "react";
import * as api from "../lib/api.js";

const ICON = `${import.meta.env.BASE_URL}icons/icon.svg`.replace(/\/{2,}/g, "/");

/**
 * @param {{ onLoggedIn: (user: object) => void, onCreateSpace: () => void }} props
 */
export function LoginPage({ onLoggedIn, onCreateSpace }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await api.signIn(email, password);
      onLoggedIn(user);
    } catch (err) {
      setError(err?.message || "Could not unlock Silo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lists-login-bg">
      <img src={ICON} alt="" className="lists-logo" width={72} height={72} />
      <h1 className="lists-title">Silo</h1>
      <p className="lists-subtitle">Private lists for two.</p>
      <form className="lists-card" style={{ width: "100%", maxWidth: 400, borderRadius: 34 }} onSubmit={handleSubmit}>
        <input
          className="lists-field"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="lists-field"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={{ color: "#ef4444", fontSize: 14, margin: "0 0 12px" }}>{error}</p>}
        {!api.hasSupabase() && (
          <p style={{ color: "var(--lists-text-secondary)", fontSize: 13, margin: "0 0 12px" }}>
            Local mode — any email/password unlocks on this device.
          </p>
        )}
        <button type="submit" className="lists-btn" disabled={loading}>
          {loading ? "Unlocking…" : "Unlock Silo"}
        </button>
        <button type="button" className="lists-btn lists-btn--ghost" onClick={onCreateSpace}>
          Create shared space
        </button>
      </form>
    </div>
  );
}
