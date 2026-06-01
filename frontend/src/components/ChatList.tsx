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

export default function ChatList({ dialogs, selected, onToggle, onSelectAll, onClearAll }: Props) {
  if (dialogs.length === 0) return <p className="empty">No chats found.</p>;

  return (
    <div className="chat-list">
      <div className="chat-list-actions">
        <button onClick={onSelectAll}>Select All</button>
        <button onClick={onClearAll}>Clear</button>
        <span>{selected.size} selected</span>
      </div>
      <ul>
        {dialogs.map(d => (
          <li key={d.id} className={selected.has(d.id) ? "selected" : ""}
            onClick={() => onToggle(d.id)}>
            <input type="checkbox" checked={selected.has(d.id)}
              onChange={() => onToggle(d.id)}
              onClick={e => e.stopPropagation()} />
            <span className="type-icon">{TYPE_EMOJI[d.type] ?? "💬"}</span>
            <span className="chat-name">{d.name}</span>
            {d.unreadCount > 0 && (
              <span className="unread-badge">{d.unreadCount}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
