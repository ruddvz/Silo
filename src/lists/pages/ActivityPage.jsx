import { useState, useEffect } from "react";
import { ListsTopNav } from "../components/ListsTopNav.jsx";
import * as api from "../lib/api.js";
import { activityMessage, formatRelativeTime } from "../lib/format.js";
import { getPartnerMember, memberDisplayName } from "../lib/localStore.js";

/**
 * @param {{ user: object, space: object }} props
 */
export function ActivityPage({ user, space }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    api.fetchActivity(user.id).then(setEntries);
  }, [user.id]);

  const partner = getPartnerMember(space, user.id);
  const partnerName = memberDisplayName(partner, "her");

  const grouped = entries.reduce((acc, e) => {
    const day = new Date(e.createdAt).toDateString();
    const label =
      day === new Date().toDateString()
        ? "Today"
        : day === new Date(Date.now() - 86400000).toDateString()
          ? "Yesterday"
          : new Date(e.createdAt).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    if (!acc[label]) acc[label] = [];
    acc[label].push(e);
    return acc;
  }, {});

  return (
    <>
      <ListsTopNav title="Activity" />
      <div className="lists-app__scroll">
        {entries.length === 0 ? (
          <div className="lists-empty">Activity from you and your partner will show up here.</div>
        ) : (
          Object.entries(grouped).map(([day, list]) => (
            <section key={day}>
              <p style={{ fontWeight: 600, color: "var(--lists-text-secondary)", fontSize: 13 }}>{day}</p>
              {list.map((e) => (
                <div key={e.id} className="lists-activity-item">
                  <div>{activityMessage(e, partnerName, user.name)}</div>
                  <div className="lists-file-card__meta">
                    {e.fileTitle || "List"} · {formatRelativeTime(e.createdAt)}
                  </div>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </>
  );
}
