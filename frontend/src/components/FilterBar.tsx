interface Props {
  filter: string;
  search: string;
  onFilterChange: (f: string) => void;
  onSearchChange: (s: string) => void;
}

const FILTERS = ["all", "channel", "group", "bot"];

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
        placeholder="Search by name..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="filter-buttons">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={filter === f ? "active" : ""}
            onClick={() => onFilterChange(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
