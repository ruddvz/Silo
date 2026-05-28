import { uid, inviteCode } from "./ids.js";
import { fileToMarkdown, parseListMarkdown } from "./markdown.js";

const KEYS = {
  session: "silo_lists_session",
  space: "silo_lists_space",
  files: "silo_lists_files",
  items: "silo_lists_items",
  activity: "silo_lists_activity",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function isLocalMode() {
  return !import.meta.env.VITE_SUPABASE_URL;
}

export function getSession() {
  return read(KEYS.session, null);
}

export function setSession(session) {
  write(KEYS.session, session);
}

export function clearSession() {
  localStorage.removeItem(KEYS.session);
}

export function getSpace() {
  return read(KEYS.space, null);
}

export function setSpace(space) {
  write(KEYS.space, space);
}

export function getFiles() {
  return read(KEYS.files, []);
}

export function saveFiles(files) {
  write(KEYS.files, files);
}

export function getItemsMap() {
  return read(KEYS.items, {});
}

export function saveItemsMap(map) {
  write(KEYS.items, map);
}

export function getItemsForFile(fileId) {
  const map = getItemsMap();
  return (map[fileId] || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

export function setItemsForFile(fileId, items) {
  const map = getItemsMap();
  map[fileId] = items;
  saveItemsMap(map);
}

export function getActivity() {
  return read(KEYS.activity, []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function pushActivity(entry) {
  const list = getActivity();
  list.unshift(entry);
  write(KEYS.activity, list.slice(0, 200));
}

/**
 * @param {{ email: string, password: string, name?: string }} creds
 */
export function localSignIn(creds) {
  const existing = getSession();
  const user = {
    id: existing?.id || uid("user"),
    email: creds.email.trim().toLowerCase(),
    name: creds.name?.trim() || creds.email.split("@")[0] || "You",
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
  setSession(user);
  return user;
}

export function localSignUp(creds) {
  return localSignIn({ ...creds, name: creds.name || creds.email.split("@")[0] });
}

/**
 * @param {{ yourName: string, partnerName: string, spaceName: string }} data
 */
export function localCreateSpace(data, userId) {
  const code = inviteCode();
  const space = {
    id: uid("space"),
    name: data.spaceName.trim() || "Our Lists",
    inviteCode: code,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    members: [
      { userId, name: data.yourName.trim() || "You", role: "owner" },
      { userId: uid("user"), name: data.partnerName.trim() || "Partner", role: "member", pending: true },
    ],
  };
  setSpace(space);
  return space;
}

/**
 * @param {string} code
 * @param {string} userId
 * @param {string} userName
 */
export function localJoinSpace(code, userId, userName) {
  const normalized = code.trim().toUpperCase();
  const space = getSpace();
  if (space && space.inviteCode === normalized) {
    const members = space.members.filter((m) => !m.pending || m.userId === userId);
    if (!members.some((m) => m.userId === userId)) {
      members.push({ userId, name: userName, role: "member" });
    }
    const updated = {
      ...space,
      members: members.map((m) =>
        m.pending && m.role === "member" && m.userId !== userId
          ? { ...m, pending: false, userId, name: userName }
          : m.userId === userId
            ? { ...m, pending: false, name: userName }
            : m
      ),
    };
    setSpace(updated);
    return updated;
  }
  if (!space) {
    const joined = {
      id: uid("space"),
      name: "Shared space",
      inviteCode: normalized,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      members: [{ userId, name: userName, role: "member" }],
    };
    setSpace(joined);
    return joined;
  }
  throw new Error("Invalid invite code for this device. Ask your partner to share their code.");
}

export function localCreateList({ title, color, templateItems }, user) {
  const space = getSpace();
  if (!space) throw new Error("No shared space");
  const now = new Date().toISOString();
  const fileId = uid("file");
  const items = (templateItems || []).map((text, i) => ({
    id: uid("item"),
    fileId,
    text,
    checked: false,
    important: false,
    sortOrder: i,
    createdBy: user.id,
    createdAt: now,
  }));
  const file = {
    id: fileId,
    type: "shared-list",
    title: title.trim() || "New list",
    spaceId: space.id,
    ownerId: user.id,
    createdBy: user.id,
    updatedBy: user.id,
    color: color || "#7C6CF2",
    notes: "",
    rawText: "",
    createdAt: now,
    updatedAt: now,
  };
  file.rawText = fileToMarkdown(file, items);
  const files = getFiles();
  files.unshift(file);
  saveFiles(files);
  setItemsForFile(fileId, items);
  pushActivity({
    id: uid("act"),
    spaceId: space.id,
    fileId,
    actorId: user.id,
    actorName: user.name,
    action: "created_list",
    fileTitle: file.title,
    createdAt: now,
  });
  return { file, items };
}

export function localUpdateList(fileId, patch, user) {
  const files = getFiles();
  const idx = files.findIndex((f) => f.id === fileId);
  if (idx < 0) throw new Error("List not found");
  const now = new Date().toISOString();
  const updated = {
    ...files[idx],
    ...patch,
    updatedBy: user.id,
    updatedAt: now,
  };
  const items = getItemsForFile(fileId);
  updated.rawText = fileToMarkdown(updated, items);
  files[idx] = updated;
  saveFiles(files);
  return updated;
}

export function localDeleteList(fileId, user) {
  const files = getFiles().filter((f) => f.id !== fileId);
  saveFiles(files);
  const map = getItemsMap();
  delete map[fileId];
  saveItemsMap(map);
  const space = getSpace();
  pushActivity({
    id: uid("act"),
    spaceId: space?.id,
    fileId,
    actorId: user.id,
    actorName: user.name,
    action: "deleted_list",
    createdAt: new Date().toISOString(),
  });
}

export function localAddItem(fileId, text, user) {
  const items = getItemsForFile(fileId);
  const now = new Date().toISOString();
  const item = {
    id: uid("item"),
    fileId,
    text: text.trim(),
    checked: false,
    important: false,
    sortOrder: items.length,
    createdBy: user.id,
    createdAt: now,
  };
  items.push(item);
  setItemsForFile(fileId, items);
  const file = localUpdateList(fileId, {}, user);
  const space = getSpace();
  pushActivity({
    id: uid("act"),
    spaceId: space?.id,
    fileId,
    actorId: user.id,
    actorName: user.name,
    action: "added_item",
    itemText: item.text,
    fileTitle: file.title,
    createdAt: now,
  });
  return item;
}

export function localToggleItem(fileId, itemId, user) {
  const items = getItemsForFile(fileId);
  const now = new Date().toISOString();
  const updated = items.map((it) => {
    if (it.id !== itemId) return it;
    const checked = !it.checked;
    return {
      ...it,
      checked,
      completedBy: checked ? user.id : null,
      completedAt: checked ? now : null,
      updatedAt: now,
    };
  });
  setItemsForFile(fileId, updated);
  const file = localUpdateList(fileId, {}, user);
  const item = updated.find((i) => i.id === itemId);
  const space = getSpace();
  const actorLabel = user.name;
  pushActivity({
    id: uid("act"),
    spaceId: space?.id,
    fileId,
    actorId: user.id,
    actorName: actorLabel,
    action: item?.checked ? "completed_item" : "unchecked_item",
    itemText: item?.text,
    fileTitle: file.title,
    createdAt: now,
  });
  return { file, items: updated, item };
}

export function localEditItem(fileId, itemId, patch, user) {
  const items = getItemsForFile(fileId).map((it) =>
    it.id === itemId ? { ...it, ...patch, updatedAt: new Date().toISOString() } : it
  );
  setItemsForFile(fileId, items);
  const file = localUpdateList(fileId, {}, user);
  const space = getSpace();
  const item = items.find((i) => i.id === itemId);
  pushActivity({
    id: uid("act"),
    spaceId: space?.id,
    fileId,
    actorId: user.id,
    actorName: user.name,
    action: "edited_item",
    itemText: item?.text,
    fileTitle: file.title,
    createdAt: new Date().toISOString(),
  });
  return { file, items };
}

export function localDeleteItem(fileId, itemId, user) {
  const items = getItemsForFile(fileId).filter((i) => i.id !== itemId);
  setItemsForFile(fileId, items);
  return localUpdateList(fileId, {}, user);
}

export function localImportMarkdown(raw, user) {
  const parsed = parseListMarkdown(raw);
  const { file } = localCreateList(
    { title: parsed.title, color: "#7C6CF2", templateItems: [] },
    user
  );
  const now = new Date().toISOString();
  const items = parsed.items.map((it, i) => ({
    id: uid("item"),
    fileId: file.id,
    text: it.text,
    checked: it.checked,
    important: false,
    sortOrder: i,
    createdBy: user.id,
    completedBy: it.checked ? user.id : null,
    completedAt: it.checked ? now : null,
    createdAt: now,
  }));
  setItemsForFile(file.id, items);
  return localUpdateList(file.id, { notes: parsed.notes, title: parsed.title }, user);
}

export function localApplyMarkdown(fileId, raw, user) {
  const parsed = parseListMarkdown(raw);
  const now = new Date().toISOString();
  const items = parsed.items.map((it, i) => ({
    id: uid("item"),
    fileId,
    text: it.text,
    checked: it.checked,
    important: /!important$/i.test(it.text),
    sortOrder: i,
    createdBy: user.id,
    completedBy: it.checked ? user.id : null,
    completedAt: it.checked ? now : null,
    createdAt: now,
  }));
  setItemsForFile(fileId, items);
  return localUpdateList(fileId, { title: parsed.title, notes: parsed.notes }, user);
}

export function localSearchLists(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const files = getFiles();
  const results = [];
  for (const file of files) {
    if (file.title.toLowerCase().includes(q)) {
      results.push({ type: "list", file, snippet: file.title });
    }
    const items = getItemsForFile(file.id);
    for (const item of items) {
      if (item.text.toLowerCase().includes(q) || (file.notes || "").toLowerCase().includes(q)) {
        results.push({ type: "item", file, item, snippet: item.text });
      }
    }
    if ((file.rawText || "").toLowerCase().includes(q) && !results.some((r) => r.file.id === file.id && r.type === "list")) {
      results.push({ type: "markdown", file, snippet: file.rawText.slice(0, 80) });
    }
  }
  return results;
}

export function getPartnerMember(space, userId) {
  if (!space) return null;
  return space.members.find((m) => m.userId !== userId && !m.pending) || space.members.find((m) => m.userId !== userId);
}

export function memberDisplayName(member, fallback = "Partner") {
  return member?.name || fallback;
}
