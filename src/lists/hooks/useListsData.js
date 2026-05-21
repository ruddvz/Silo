import { useState, useEffect, useCallback } from "react";
import * as api from "../lib/api.js";
import { getItemsForFile } from "../lib/localStore.js";
import { hasSupabase } from "../lib/supabase.js";

export function useListsData(user) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await api.fetchLists(user.id);
      setFiles(list);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh, version]);

  useEffect(() => {
    if (!user) return undefined;
    return api.subscribeToSpace(user.id, () => setVersion((v) => v + 1));
  }, [user]);

  const getStats = useCallback(
    (fileId) => {
      const items = hasSupabase() ? [] : getItemsForFile(fileId);
      if (!hasSupabase()) {
        const open = items.filter((i) => !i.checked).length;
        const done = items.filter((i) => i.checked).length;
        return { total: items.length, open, done, important: items.filter((i) => i.important).length };
      }
      return { total: 0, open: 0, done: 0, important: 0 };
    },
    []
  );

  const bump = () => setVersion((v) => v + 1);

  return { files, loading, refresh, bump, getStats, version };
}
