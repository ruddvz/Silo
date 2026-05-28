import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null;

export function hasSupabase() {
  return Boolean(url && key);
}

export function getSupabase() {
  if (!hasSupabase()) return null;
  if (!client) client = createClient(url, key);
  return client;
}
