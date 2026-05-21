import { useMemo } from "react";
import { ListsTopNav } from "../components/ListsTopNav.jsx";
import { ListFileCard } from "../components/ListFileCard.jsx";
import { getItemsForFile, getPartnerMember, memberDisplayName } from "../lib/localStore.js";
import { greetingName, formatRelativeTime } from "../lib/format.js";

/**
 * @param {{ user: object, space: object, files: object[], onOpenList: (id: string) => void, onSettings: () => void }} props
 */
export function ListsHomePage({ user, space, files, onOpenList, onSettings }) {
  const partner = getPartnerMember(space, user.id);
  const partnerName = memberDisplayName(partner, "her");

  const { openItems, listsWithStats } = useMemo(() => {
    let open = 0;
    const rows = files.map((file) => {
      const items = getItemsForFile(file.id);
      const stats = {
        total: items.length,
        open: items.filter((i) => !i.checked).length,
        done: items.filter((i) => i.checked).length,
        important: items.filter((i) => i.important).length,
      };
      open += stats.open;
      const updatedBy = file.updatedBy === user.id ? "you" : partnerName;
      const updatedLabel = `Updated by ${updatedBy} · ${formatRelativeTime(file.updatedAt)}`;
      return { file, stats, updatedLabel };
    });
    return { openItems: open, listsWithStats: rows };
  }, [files, user.id, partnerName]);

  return (
    <>
      <ListsTopNav title="Our Lists" onRight={onSettings} rightLabel="⚙" />
      <div className="lists-app__scroll">
        <div className="lists-greeting">
          <h2>{greetingName(user.name)}</h2>
          <p>
            {files.length} shared lists · {openItems} open items
          </p>
        </div>
        {listsWithStats.length === 0 ? (
          <div className="lists-empty">
            <p>No lists yet.</p>
            <p>Tap + to create your first shared list.</p>
          </div>
        ) : (
          listsWithStats.map(({ file, stats, updatedLabel }) => (
            <ListFileCard
              key={file.id}
              file={file}
              stats={stats}
              updatedLabel={updatedLabel}
              onOpen={() => onOpenList(file.id)}
            />
          ))
        )}
      </div>
    </>
  );
}
