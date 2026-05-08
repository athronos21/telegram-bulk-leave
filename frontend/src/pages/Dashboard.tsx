import { useEffect, useState } from "react";
import { Dialog, LeaveEvent, getDialogs, leaveDialogsStream, signOut } from "../api/client";
import ChatList from "../components/ChatList";
import FilterBar from "../components/FilterBar";
import ProgressBar from "../components/ProgressBar";

interface Props {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: Props) {
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState({ total: 0, done: 0, failed: 0 });
  const [lastEvent, setLastEvent] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDialogs();
  }, []);

  const fetchDialogs = async () => {
    setLoading(true);
    try {
      const res = await getDialogs();
      setDialogs(res.data.dialogs);
    } catch {
      setError("Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  const filtered = dialogs.filter((d) => {
    const matchType = filter === "all" || d.type === filter;
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((d) => d.id)));
  const clearAll = () => setSelected(new Set());

  const handleLeave = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setLeaving(true);
    setProgress({ total: ids.length, done: 0, failed: 0 });
    setLastEvent("");

    try {
      await leaveDialogsStream(ids, (event: LeaveEvent) => {
        setProgress({ total: event.total, done: event.done, failed: event.failed });
        if (event.status === "success" && event.name) {
          setLastEvent(`✅ Left: ${event.name}`);
        } else if (event.status === "failed" && event.name) {
          setLastEvent(`❌ Failed: ${event.name}`);
        } else if (event.status === "flood_wait") {
          setLastEvent(`⏳ Flood wait: ${event.wait}s...`);
        }
      });
      await fetchDialogs();
      setSelected(new Set());
    } catch {
      setError("Failed to leave chats");
    } finally {
      setLeaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  return (
    <main className="page-dashboard">
      <header>
        <h1>📤 Bulk Leave Manager</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <FilterBar
        filter={filter}
        search={search}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
      />

      {loading && <p>Loading chats...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && (
        <ChatList
          dialogs={filtered}
          selected={selected}
          onToggle={toggle}
          onSelectAll={selectAll}
          onClearAll={clearAll}
        />
      )}

      {leaving && (
        <>
          <ProgressBar
            total={progress.total}
            done={progress.done}
            failed={progress.failed}
          />
          {lastEvent && <p className="last-event">{lastEvent}</p>}
        </>
      )}

      <div className="leave-action">
        <button
          className="leave-btn"
          onClick={handleLeave}
          disabled={selected.size === 0 || leaving}
        >
          {leaving
            ? `Leaving... ${progress.done + progress.failed}/${progress.total}`
            : `Leave ${selected.size} selected`}
        </button>
      </div>
    </main>
  );
}
