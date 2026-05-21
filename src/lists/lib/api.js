import { getSupabase } from "./supabase.js";
import * as local from "./localStore.js";
import { uid } from "./ids.js";
import { fileToMarkdown } from "./markdown.js";

export { isLocalMode } from "./localStore.js";
export { hasSupabase } from "./supabase.js";

export async function signIn(email, password) {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await fetchProfile(data.user.id);
    return profile || { id: data.user.id, email: data.user.email, name: data.user.email?.split("@")[0] };
  }
  return local.localSignIn({ email, password });
}

export async function signUp(email, password, name) {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    if (data.user) {
      await ensureProfile(data.user.id, name || email.split("@")[0], email);
      return { id: data.user.id, email, name: name || email.split("@")[0] };
    }
    throw new Error("Check your email to confirm signup.");
  }
  return local.localSignUp({ email, password, name });
}

export async function signOut() {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
  local.clearSession();
}

export async function getCurrentUser() {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.auth.getSession();
    if (!data.session?.user) return null;
    const profile = await fetchProfile(data.session.user.id);
    return profile || { id: data.session.user.id, email: data.session.user.email, name: "You" };
  }
  return local.getSession();
}

async function fetchProfile(userId) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("profiles").select("id, name, email").eq("id", userId).maybeSingle();
  return data;
}

async function ensureProfile(userId, name, email) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("profiles").upsert({ id: userId, name, email });
}

export async function getUserSpace(userId) {
  const sb = getSupabase();
  if (sb) {
    const { data: member } = await sb
      .from("space_members")
      .select("space_id, spaces(id, name, invite_code, created_by, created_at)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (!member?.spaces) return null;
    const sp = member.spaces;
    const { data: members } = await sb
      .from("space_members")
      .select("user_id, role, profiles(name)")
      .eq("space_id", sp.id);
    return {
      id: sp.id,
      name: sp.name,
      inviteCode: sp.invite_code,
      createdBy: sp.created_by,
      createdAt: sp.created_at,
      members: (members || []).map((m) => ({
        userId: m.user_id,
        name: m.profiles?.name || "Member",
        role: m.role,
      })),
    };
  }
  return local.getSpace();
}

export async function createSpace(data, user) {
  const sb = getSupabase();
  if (sb) {
    const code = `SILO-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: space, error } = await sb
      .from("spaces")
      .insert({
        name: data.spaceName.trim() || "Our Lists",
        invite_code: code,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) throw error;
    await sb.from("space_members").insert({
      space_id: space.id,
      user_id: user.id,
      role: "owner",
    });
    await sb.from("profiles").upsert({ id: user.id, name: data.yourName.trim() || user.name, email: user.email });
    return getUserSpace(user.id);
  }
  return local.localCreateSpace(data, user.id);
}

export async function joinSpace(code, user) {
  const sb = getSupabase();
  if (sb) {
    const { data: space, error } = await sb
      .from("spaces")
      .select("id, name, invite_code, created_by, created_at")
      .eq("invite_code", code.trim().toUpperCase())
      .maybeSingle();
    if (error || !space) throw new Error("Invalid invite code");
    await sb.from("space_members").upsert({
      space_id: space.id,
      user_id: user.id,
      role: "member",
    });
    return getUserSpace(user.id);
  }
  return local.localJoinSpace(code, user.id, user.name);
}

export async function fetchLists(userId) {
  const sb = getSupabase();
  if (sb) {
    const space = await getUserSpace(userId);
    if (!space) return [];
    const { data, error } = await sb
      .from("files")
      .select("*")
      .eq("space_id", space.id)
      .eq("type", "shared-list")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapFileRow);
  }
  return local.getFiles();
}

function mapFileRow(row) {
  return {
    id: row.id,
    type: "shared-list",
    title: row.title,
    spaceId: row.space_id,
    ownerId: row.created_by,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    color: row.color,
    notes: row.notes,
    rawText: row.raw_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchListItems(fileId) {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("list_items")
      .select("*")
      .eq("file_id", fileId)
      .order("sort_order");
    if (error) throw error;
    return (data || []).map(mapItemRow);
  }
  return local.getItemsForFile(fileId);
}

function mapItemRow(row) {
  return {
    id: row.id,
    fileId: row.file_id,
    text: row.text,
    checked: row.checked,
    important: row.important,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    completedBy: row.completed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export async function createList(payload, user) {
  const sb = getSupabase();
  if (sb) {
    const space = await getUserSpace(user.id);
    if (!space) throw new Error("No shared space");
    const now = new Date().toISOString();
    const fileId = uid("file");
    const items = (payload.templateItems || []).map((text, i) => ({
      id: uid("item"),
      file_id: fileId,
      text,
      checked: false,
      sort_order: i,
      created_by: user.id,
      created_at: now,
    }));
    const file = {
      id: fileId,
      space_id: space.id,
      type: "shared-list",
      title: payload.title,
      color: payload.color,
      notes: "",
      raw_text: "",
      created_by: user.id,
      updated_by: user.id,
      created_at: now,
      updated_at: now,
    };
    file.raw_text = fileToMarkdown(
      { title: file.title, notes: "" },
      items.map((i) => ({ text: i.text, checked: false }))
    );
    await sb.from("files").insert(file);
    if (items.length) await sb.from("list_items").insert(items);
    await logActivity(sb, space.id, fileId, user, "created_list", null, payload.title);
    return { file: mapFileRow({ ...file, space_id: space.id }), items: items.map((i) => mapItemRow({ ...i, important: false, completed_by: null, updated_at: null, completed_at: null })) };
  }
  return local.localCreateList(payload, user);
}

async function logActivity(sb, spaceId, fileId, user, action, itemText) {
  await sb.from("activity").insert({
    id: uid("act"),
    space_id: spaceId,
    file_id: fileId,
    actor_id: user.id,
    action,
    item_text: itemText,
    created_at: new Date().toISOString(),
  });
}

export async function addListItem(fileId, text, user) {
  const sb = getSupabase();
  if (sb) {
    const items = await fetchListItems(fileId);
    const now = new Date().toISOString();
    const row = {
      id: uid("item"),
      file_id: fileId,
      text: text.trim(),
      checked: false,
      sort_order: items.length,
      created_by: user.id,
      created_at: now,
    };
    await sb.from("list_items").insert(row);
    await sb.from("files").update({ updated_at: now, updated_by: user.id }).eq("id", fileId);
    const space = await getUserSpace(user.id);
    await logActivity(sb, space?.id, fileId, user, "added_item", text, null);
    return mapItemRow({ ...row, important: false, completed_by: null, updated_at: null, completed_at: null });
  }
  return local.localAddItem(fileId, text, user);
}

export async function toggleListItem(fileId, itemId, user) {
  const sb = getSupabase();
  if (sb) {
    const items = await fetchListItems(fileId);
    const item = items.find((i) => i.id === itemId);
    if (!item) throw new Error("Item not found");
    const checked = !item.checked;
    const now = new Date().toISOString();
    await sb
      .from("list_items")
      .update({
        checked,
        completed_by: checked ? user.id : null,
        completed_at: checked ? now : null,
        updated_at: now,
      })
      .eq("id", itemId);
    await sb.from("files").update({ updated_at: now, updated_by: user.id }).eq("id", fileId);
    const space = await getUserSpace(user.id);
    await logActivity(sb, space?.id, fileId, user, checked ? "completed_item" : "unchecked_item", item.text, null);
    return fetchListItems(fileId);
  }
  return local.localToggleItem(fileId, itemId, user).then((r) => r.items);
}

export async function updateListItem(fileId, itemId, patch, user) {
  const sb = getSupabase();
  if (sb) {
    await sb.from("list_items").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", itemId);
    await sb.from("files").update({ updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", fileId);
    return fetchListItems(fileId);
  }
  return local.localEditItem(fileId, itemId, patch, user).then((r) => r.items);
}

export async function deleteListItem(fileId, itemId, user) {
  const sb = getSupabase();
  if (sb) {
    await sb.from("list_items").delete().eq("id", itemId);
    await sb.from("files").update({ updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", fileId);
    return fetchListItems(fileId);
  }
  local.localDeleteItem(fileId, itemId, user);
  return local.getItemsForFile(fileId);
}

export async function deleteList(fileId, user) {
  const sb = getSupabase();
  if (sb) {
    await sb.from("list_items").delete().eq("file_id", fileId);
    await sb.from("files").delete().eq("id", fileId);
    return;
  }
  local.localDeleteList(fileId, user);
}

export async function applyMarkdown(fileId, raw, user) {
  const sb = getSupabase();
  if (sb) {
    const { parseListMarkdown } = await import("./markdown.js");
    const parsed = parseListMarkdown(raw);
    await sb.from("list_items").delete().eq("file_id", fileId);
    const now = new Date().toISOString();
    const rows = parsed.items.map((it, i) => ({
      id: uid("item"),
      file_id: fileId,
      text: it.text,
      checked: it.checked,
      sort_order: i,
      created_by: user.id,
      completed_by: it.checked ? user.id : null,
      completed_at: it.checked ? now : null,
      created_at: now,
    }));
    if (rows.length) await sb.from("list_items").insert(rows);
    await sb
      .from("files")
      .update({
        title: parsed.title,
        notes: parsed.notes,
        raw_text: raw,
        updated_at: now,
        updated_by: user.id,
      })
      .eq("id", fileId);
    return;
  }
  local.localApplyMarkdown(fileId, raw, user);
}

export async function importMarkdown(raw, user) {
  const sb = getSupabase();
  if (sb) {
    const { parseListMarkdown } = await import("./markdown.js");
    const parsed = parseListMarkdown(raw);
    return createList({ title: parsed.title, color: "#7C6CF2", templateItems: parsed.items.map((i) => i.text) }, user);
  }
  return local.localImportMarkdown(raw, user);
}

export async function fetchActivity(userId) {
  const sb = getSupabase();
  if (sb) {
    const space = await getUserSpace(userId);
    if (!space) return [];
    const { data } = await sb
      .from("activity")
      .select("*, profiles(name)")
      .eq("space_id", space.id)
      .order("created_at", { ascending: false })
      .limit(100);
    return (data || []).map((a) => ({
      id: a.id,
      spaceId: a.space_id,
      fileId: a.file_id,
      actorId: a.actor_id,
      actorName: a.profiles?.name || "Someone",
      action: a.action,
      itemText: a.item_text,
      createdAt: a.created_at,
    }));
  }
  return local.getActivity();
}

export async function searchLists(query) {
  return local.localSearchLists(query);
}

export function subscribeToSpace(userId, onChange) {
  const sb = getSupabase();
  if (!sb) {
    const interval = setInterval(onChange, 3000);
    return () => clearInterval(interval);
  }
  let channel;
  (async () => {
    const space = await getUserSpace(userId);
    if (!space) return;
    channel = sb
      .channel(`space-${space.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "files", filter: `space_id=eq.${space.id}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "list_items" }, onChange)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity", filter: `space_id=eq.${space.id}` }, onChange)
      .subscribe();
  })();
  return () => {
    if (channel) sb.removeChannel(channel);
  };
}
