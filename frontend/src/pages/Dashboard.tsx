import { useEffect, useState } from "react";
import { Dialog, LeaveEvent, LeaveSpeed, getDialogs, leaveDialogs, signOut } from "../telegram/client";
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
  const [loadMsg,   setLoadMsg]   = useState("Loading chats…");
  const [leaving,   setLeaving]   = useState(false);
  const [speed,     setSpeed]     = useState<LeaveSpeed>("fast");
  const [progress,  setProgress]  = useState({ total: 0, done: 0, failed: 0 });
  const [lastEvent, setLastEvent] = useState("");
  const [error,     setError]     = useState("");

  useEffect(() => { fetchDialogs(); }, []);

  const fetchDialogs = async (forceRefresh = false) => {
    setLoading(true); setError(""); setLoadMsg("Loading chats…");
    try {
      await getDialogs((batch) => {
        setDialogs([...batch]);
        setLoadMsg(`Loading chats… ${batch.length} found`);
      }, forceRefresh);
    } catch (e: any) {
      setError(e.message || "Failed to load chats");
    } finally {
      setLoading(false);
      setLoadMsg("");
    }
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
      for await (const ev of leaveDialogs(toLeave, speed)) {
        setProgress({ total: ev.total, done: ev.done, failed: ev.failed });
        if (ev.status === "success") setLastEvent(`✅ Left: ${ev.name}`);
        else                         setLastEvent(`❌ Failed: ${ev.name}`);
      }
      await fetchDialogs(true); // force refresh after leaving
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
        <h1>📤 Bulk Leave</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-ghost" onClick={() => fetchDialogs(true)} disabled={loading || leaving}
            title="Refresh chats">
            🔄
          </button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <FilterBar filter={filter} search={search}
        onFilterChange={setFilter} onSearchChange={setSearch} />

      {loading && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          {loadMsg}
        </p>
      )}
      {error && <p className="error">{error}</p>}

      {dialogs.length > 0 && (
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
        <div className="speed-selector">
          <span>Speed:</span>
          {(["safe", "fast", "turbo"] as LeaveSpeed[]).map(s => (
            <button
              key={s}
              className={speed === s ? "active" : "btn-ghost"}
              onClick={() => setSpeed(s)}
              disabled={leaving}
              title={s === "safe" ? "0.8–1.5s delay" : s === "fast" ? "0.3–0.7s delay" : "0.1–0.3s delay — may trigger flood wait"}
            >
              {s === "safe" ? "🐢 Safe" : s === "fast" ? "⚡ Fast" : "🚀 Turbo"}
            </button>
          ))}
        </div>
        <button className="leave-btn" onClick={handleLeave}
          disabled={selected.size === 0 || leaving || loading}>
          {leaving
            ? `Leaving… ${progress.done + progress.failed}/${progress.total}`
            : `Leave ${selected.size} selected`}
        </button>
      </div>
    </main>
  );
}
