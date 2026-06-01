import { useEffect, useState } from "react";
import { Dialog, LeaveEvent, getDialogs, leaveDialogs, signOut } from "../telegram/client";
import ChatList from "../components/ChatList";
import FilterBar from "../components/FilterBar";
import ProgressBar from "../components/ProgressBar";

interface Props {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: Props) {
  const [dialogs,   setDialogs]   = useState<Dialog[]>([]);
  const [selected,  setSelected]  = useState<Set<number>>(new Set());
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");
  const [loading,   setLoading]   = useState(true);
  const [leaving,   setLeaving]   = useState(false);
  const [progress,  setProgress]  = useState({ total: 0, done: 0, failed: 0 });
  const [lastEvent, setLastEvent] = useState("");
  const [error,     setError]     = useState("");

  useEffect(() => { fetchDialogs(); }, []);

  const fetchDialogs = async () => {
    setLoading(true); setError("");
    try {
      setDialogs(await getDialogs());
    } catch (e: any) {
      setError(e.message || "Failed to load chats");
    } finally { setLoading(false); }
  };

  const filtered = dialogs.filter(d => {
    const matchType   = filter === "all" || d.type === filter;
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const toggle    = (id: number) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectAll = () => setSelected(new Set(filtered.map(d => d.id)));
  const clearAll  = () => setSelected(new Set());

  const handleLeave = async () => {
    if (selected.size === 0) return;
    const toLeave = dialogs.filter(d => selected.has(d.id));
    setLeaving(true);
    setProgress({ total: toLeave.length, done: 0, failed: 0 });
    setLastEvent("");

    try {
      for await (const ev of leaveDialogs(toLeave)) {
        setProgress({ total: ev.total, done: ev.done, failed: ev.failed });
        if (ev.status === "success") setLastEvent(`✅ Left: ${ev.name}`);
        else                         setLastEvent(`❌ Failed: ${ev.name}`);
      }
      await fetchDialogs();
      setSelected(new Set());
    } catch (e: any) {
      setError(e.message || "Failed to leave chats");
    } finally { setLeaving(false); }
  };

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  return (
    <main className="page-dashboard">
      <header>
        <h1>📤 Bulk Leave Manager</h1>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </header>

      <FilterBar filter={filter} search={search}
        onFilterChange={setFilter} onSearchChange={setSearch} />

      {loading && <p>Loading chats...</p>}
      {error   && <p className="error">{error}</p>}

      {!loading && (
        <ChatList dialogs={filtered} selected={selected}
          onToggle={toggle} onSelectAll={selectAll} onClearAll={clearAll} />
      )}

      {leaving && (
        <>
          <ProgressBar total={progress.total} done={progress.done} failed={progress.failed} />
          {lastEvent && <p className="last-event">{lastEvent}</p>}
        </>
      )}

      <div className="leave-action">
        <button className="leave-btn" onClick={handleLeave}
          disabled={selected.size === 0 || leaving}>
          {leaving
            ? `Leaving... ${progress.done + progress.failed}/${progress.total}`
            : `Leave ${selected.size} selected`}
        </button>
      </div>
    </main>
  );
}
