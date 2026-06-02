import { Dialog } from "../telegram/client";

interface Props {
  dialogs: Dialog[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

const TYPE_EMOJI: Record<string, string> = {
  channel: "📢",
  group:   "👥",
  bot:     "🤖",
};

const TYPE_LABEL: Record<string, string> = {
  channel: "Channel",
  group:   "Group",
  bot:     "Bot",
};

export default function ChatList({ dialogs, selected, onToggle, onSelectAll, onClearAll }: Props) {
  if (dialogs.length === 0) return (
    <div className="empty">
      <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</p>
      <p>No chats found.</p>
    </div>
  );

  return (
    <div className="chat-list">
      <div className="chat-list-actions">
        <button onClick={onSelectAll}>Select All</button>
        <button onClick={onClearAll} className="btn-ghost">Clear</button>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {selected.size > 0
            ? <><strong style={{ color: "var(--accent)" }}>{selected.size}</strong> selected of {dialogs.length}</>
            : <>{dialogs.length} chats</>}
        </span>
      </div>
      <ul>
        {dialogs.map(d => (
          <li key={d.id}
            className={selected.has(d.id) ? "selected" : ""}
            onClick={() => onToggle(d.id)}
            title={TYPE_LABEL[d.type]}
          >
            <input
              type="checkbox"
              checked={selected.has(d.id)}
              onChange={() => onToggle(d.id)}
              onClick={e => e.stopPropagation()}
            />
            <span className="type-icon">{TYPE_EMOJI[d.type] ?? "💬"}</span>
            <span className="chat-name">{d.name}</span>
            <span className="chat-type-badge">{TYPE_LABEL[d.type]}</span>
            {d.unreadCount > 0 && (
              <span className="unread-badge">{d.unreadCount}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
