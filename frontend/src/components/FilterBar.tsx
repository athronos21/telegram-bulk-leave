interface Props {
  filter: string;
  search: string;
  counts: Record<string, number>;
  onFilterChange: (f: string) => void;
  onSearchChange: (s: string) => void;
}

const FILTERS: { key: string; label: string }[] = [
  { key: "all",     label: "All"         },
  { key: "channel", label: "📢 Channels" },
  { key: "group",   label: "👥 Groups"   },
  { key: "bot",     label: "🤖 Bots"     },
];

export default function FilterBar({ filter, search, counts, onFilterChange, onSearchChange }: Props) {
  const total = (counts.channel || 0) + (counts.group || 0) + (counts.bot || 0);

  return (
    <div className="filter-bar">
      <input
        type="text"
        placeholder="🔍  Search chats…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ flex: 1, minWidth: 140 }}
      />
      <div className="filter-buttons">
        {FILTERS.map((f) => {
          const count = f.key === "all" ? total : (counts[f.key] || 0);
          return (
            <button
              key={f.key}
              className={filter === f.key ? "active" : "btn-ghost"}
              onClick={() => onFilterChange(f.key)}
            >
              {f.label}{count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
