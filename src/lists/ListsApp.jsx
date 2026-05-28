import { useState, useEffect, useCallback } from "react";
import "./lists.css";
import { useTheme } from "./hooks/useTheme.js";
import { useListsData } from "./hooks/useListsData.js";
import * as api from "./lib/api.js";
import { getSpace, setSpace } from "./lib/localStore.js";
import { ListsBottomNav } from "./components/ListsBottomNav.jsx";
import { CreateListSheet } from "./components/CreateListSheet.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { CreateJoinSpacePage } from "./pages/CreateJoinSpacePage.jsx";
import { ListsHomePage } from "./pages/ListsHomePage.jsx";
import { ListDetailPage } from "./pages/ListDetailPage.jsx";
import { RawTextPage } from "./pages/RawTextPage.jsx";
import { SearchPage } from "./pages/SearchPage.jsx";
import { ActivityPage } from "./pages/ActivityPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";

/**
 * Silo Lists — shared checklist files for two people.
 */
export default function ListsApp() {
  const { mode: themeMode, setMode: setTheme, resolved } = useTheme();
  const [user, setUser] = useState(null);
  const [space, setSpaceState] = useState(null);
  const [booting, setBooting] = useState(true);
  const [flow, setFlow] = useState("login");
  const [tab, setTab] = useState("lists");
  const [detailId, setDetailId] = useState(null);
  const [textViewId, setTextViewId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { files, refresh, bump } = useListsData(user);

  const loadSpace = useCallback(async (u) => {
    const sp = await api.getUserSpace(u.id);
    if (sp) {
      setSpace(sp);
      setSpaceState(sp);
    } else {
      const local = getSpace();
      setSpaceState(local);
    }
    return sp;
  }, []);

  useEffect(() => {
    (async () => {
      const u = await api.getCurrentUser();
      setUser(u);
      if (u) {
        const sp = await loadSpace(u);
        setFlow(sp ? "app" : "create");
      }
      setBooting(false);
    })();
  }, [loadSpace]);

  async function handleLoggedIn(u) {
    setUser(u);
    const sp = await loadSpace(u);
    setFlow(sp ? "app" : "create");
  }

  async function handleSpaceReady(sp) {
    setSpace(sp);
    setSpaceState(sp);
    setFlow("app");
    refresh();
  }

  async function handleCreateList(payload) {
    await api.createList(payload, user);
    bump();
    refresh();
  }

  async function handleImport(raw) {
    await api.importMarkdown(raw, user);
    bump();
    refresh();
  }

  async function handleSignOut() {
    await api.signOut();
    setUser(null);
    setSpaceState(null);
    setFlow("login");
    setTab("lists");
    setDetailId(null);
  }

  function goVault() {
    window.location.hash = "";
    window.location.reload();
  }

  if (booting) {
    return (
      <div className="lists-app" data-theme={resolved}>
        <div className="lists-empty">Loading Silo Lists…</div>
      </div>
    );
  }

  if (flow === "login") {
    return (
      <div className="lists-app" data-theme={resolved}>
        <a href="#/" className="lists-vault-link" onClick={(e) => { e.preventDefault(); goVault(); }}>
          ← Vault
        </a>
        <LoginPage onLoggedIn={handleLoggedIn} onCreateSpace={() => setFlow("create")} />
      </div>
    );
  }

  if (flow === "create") {
    return (
      <div className="lists-app" data-theme={resolved}>
        <CreateJoinSpacePage
          user={user}
          mode="create"
          onDone={handleSpaceReady}
          onBack={() => setFlow("login")}
        />
      </div>
    );
  }

  if (textViewId) {
    return (
      <div className="lists-app" data-theme={resolved}>
        <RawTextPage
          fileId={textViewId}
          user={user}
          onBack={() => setTextViewId(null)}
          onSaved={() => {
            bump();
            refresh();
          }}
        />
      </div>
    );
  }

  if (detailId) {
    return (
      <div className="lists-app" data-theme={resolved}>
        <ListDetailPage
          fileId={detailId}
          user={user}
          space={space}
          onBack={() => setDetailId(null)}
          onTextView={() => setTextViewId(detailId)}
          onRefresh={refresh}
        />
      </div>
    );
  }

  const showNav = ["lists", "search", "activity", "settings"].includes(tab);

  return (
    <div className="lists-app" data-theme={resolved}>
      <a href="#/" className="lists-vault-link" onClick={(e) => { e.preventDefault(); goVault(); }}>
        ← Vault
      </a>
      {tab === "lists" && (
        <ListsHomePage
          user={user}
          space={space}
          files={files}
          onOpenList={setDetailId}
          onSettings={() => setTab("settings")}
        />
      )}
      {tab === "search" && <SearchPage onOpenList={setDetailId} />}
      {tab === "activity" && <ActivityPage user={user} space={space} />}
      {tab === "settings" && (
        <SettingsPage
          user={user}
          space={space}
          themeMode={themeMode}
          onTheme={setTheme}
          onSignOut={handleSignOut}
          onImport={handleImport}
        />
      )}
      {showNav && (
        <ListsBottomNav
          active={tab}
          onTab={setTab}
          onAdd={() => setSheetOpen(true)}
        />
      )}
      <CreateListSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onCreate={handleCreateList} />
    </div>
  );
}
