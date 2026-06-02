interface Props {
  filter: string;
  search: string;
  onFilterChange: (f: string) => void;
  onSearchChange: (s: string) => void;
}

const FILTERS: { key: string; label: string }[] = [
  { key: "all",     label: "All"      },
  { key: "channel", label: "📢 Channels" },
  { key: "group",   label: "👥 Groups"   },
  { key: "bot",     label: "🤖 Bots"     },
];

export default function FilterBar({
  filter,
  search,
  onFilterChange,
  onSearchChange,
}: Props) {
  return (
    <div className="filter-bar">
      <input
        type="text"
        placeholder="🔍  Search chats…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ flex: 1, minWidth: 160 }}
      />
      <div className="filter-buttons">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? "active" : ""}
            onClick={() => onFilterChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
