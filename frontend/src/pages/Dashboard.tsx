import { useEffect, useState } from "react";
import { Dialog, LeaveEvent, LeaveSpeed, getDialogs, leaveDialogs, signOut, getApiCredentials, saveApiCredentials } from "../telegram/client";
import ChatList from "../components/ChatList";
import FilterBar from "../components/FilterBar";
import ProgressBar from "../components/ProgressBar";

interface Props {
  onLogout: () => void;
}

const SPEED_KEY = "tbl_speed";

export default function Dashboard({ onLogout }: Props) {
  const [dialogs,    setDialogs]    = useState<Dialog[]>([]);
  const [selected,   setSelected]   = useState<Set<number>>(new Set());
  const [filter,     setFilter]     = useState("all");
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [loadMsg,    setLoadMsg]    = useState("Loading chats…");
  const [leaving,    setLeaving]    = useState(false);
  const [speed,      setSpeed]      = useState<LeaveSpeed>((localStorage.getItem(SPEED_KEY) as LeaveSpeed) || "fast");
  const [progress,   setProgress]   = useState({ total: 0, done: 0, failed: 0 });
  const [log,        setLog]        = useState<{ name: string; status: "success" | "failed"; reason?: string }[]>([]);
  const [showLog,    setShowLog]    = useState(false);
  const [summary,    setSummary]    = useState<{ done: number; failed: number; failedItems: string[] } | null>(null);
  const [confirm,    setConfirm]    = useState(false);
  const [error,      setError]      = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [editApiId,  setEditApiId]  = useState("");
  const [editApiHash, setEditApiHash] = useState("");

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

  // Counts per type for filter badges
  const counts = dialogs.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const toggle    = (id: number) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectAll = () => setSelected(new Set(filtered.map(d => d.id)));
  const clearAll  = () => setSelected(new Set());

  const handleSpeedChange = (s: LeaveSpeed) => {
    setSpeed(s);
    localStorage.setItem(SPEED_KEY, s);
  };

  const handleLeaveConfirmed = async () => {
    setConfirm(false);
    setSummary(null);
    const toLeave = dialogs.filter(d => selected.has(d.id));
    setLeaving(true);
    setLog([]);
    setShowLog(true);
    setProgress({ total: toLeave.length, done: 0, failed: 0 });

    const failedItems: string[] = [];
    let finalDone = 0;
    let finalFailed = 0;

    try {
      for await (const ev of leaveDialogs(toLeave, speed)) {
        setProgress({ total: ev.total, done: ev.done, failed: ev.failed });
        setLog(prev => [...prev, { name: ev.name, status: ev.status, reason: ev.reason }]);
        if (ev.status === "failed") failedItems.push(ev.name);
        finalDone   = ev.done;
        finalFailed = ev.failed;
      }
      setSummary({ done: finalDone, failed: finalFailed, failedItems });
      await fetchDialogs(true);
      setSelected(new Set());
    } catch (e: any) {
      setError(e.message || "Failed to leave chats");
    } finally {
      setLeaving(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!summary) return;
    const failedDialogs = dialogs.filter(d => summary.failedItems.includes(d.name));
    setSelected(new Set(failedDialogs.map(d => d.id)));
    setSummary(null);
    setShowLog(false);
  };

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  const openSettings = () => {
    const { apiId, apiHash } = getApiCredentials();
    setEditApiId(String(apiId));
    setEditApiHash(apiHash);
    setShowSettings(true);
  };

  const saveSettings = () => {
    const id = parseInt(editApiId.trim());
    const hash = editApiHash.trim();
    if (!id || isNaN(id) || !hash) return;
    saveApiCredentials(id, hash);
    setShowSettings(false);
  };

  return (
    <main className="page-dashboard">
      <header>
        <h1>📤 Bulk Leave</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-ghost icon-btn" onClick={openSettings} title="API Settings">⚙️</button>
          <button className="btn-ghost icon-btn" onClick={() => fetchDialogs(true)} disabled={loading || leaving} title="Refresh chats">🔄</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <FilterBar filter={filter} search={search} counts={counts}
        onFilterChange={setFilter} onSearchChange={setSearch} />

      {loading && (
        <div className="loading-row">
          <span className="spinner" />
          <span>{loadMsg}</span>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      {!loading && dialogs.length === 0 && !error && (
        <div className="empty"><p style={{ fontSize: "2rem" }}>💬</p><p>No chats found.</p></div>
      )}

      {dialogs.length > 0 && (
        <ChatList dialogs={filtered} selected={selected}
          onToggle={toggle} onSelectAll={selectAll} onClearAll={clearAll} />
      )}

      {/* Live log during leaving */}
      {showLog && log.length > 0 && (
        <div className="leave-log">
          {leaving && <ProgressBar total={progress.total} done={progress.done} failed={progress.failed} />}
          <div className="leave-log-list">
            {[...log].reverse().map((e, i) => (
              <p key={i} className={e.status === "success" ? "log-success" : "log-failed"}>
                {e.status === "success" ? "✅" : "❌"} {e.name}
                {e.reason && <span className="log-reason"> — {e.reason}</span>}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Post-leave summary */}
      {summary && (
        <div className="summary-card">
          <p className="summary-title">
            {summary.failed === 0 ? "✅ All done!" : `Done — ${summary.failed} failed`}
          </p>
          <p className="summary-stats">
            Left <strong>{summary.done}</strong> chats
            {summary.failed > 0 && <>, <span style={{ color: "var(--accent)" }}>{summary.failed} failed</span></>}
          </p>
          {summary.failed > 0 && (
            <button onClick={handleRetryFailed} style={{ marginTop: "0.5rem", width: "100%" }}>
              🔁 Retry {summary.failed} failed
            </button>
          )}
          <button className="btn-ghost" onClick={() => setSummary(null)} style={{ marginTop: "0.4rem", width: "100%" }}>
            Dismiss
          </button>
        </div>
      )}

      <div className="leave-action">
        <div className="speed-selector">
          <span>Speed:</span>
          {(["safe", "fast", "turbo"] as LeaveSpeed[]).map(s => (
            <button key={s}
              className={speed === s ? "active" : "btn-ghost"}
              onClick={() => handleSpeedChange(s)}
              disabled={leaving}
              title={s === "safe" ? "0.8–1.5s delay" : s === "fast" ? "0.3–0.7s delay" : "0.1–0.3s — may trigger flood wait"}
            >
              {s === "safe" ? "🐢 Safe" : s === "fast" ? "⚡ Fast" : "🚀 Turbo"}
            </button>
          ))}
        </div>
        <button className="leave-btn" onClick={() => setConfirm(true)}
          disabled={selected.size === 0 || leaving || loading}>
          {leaving
            ? `Leaving… ${progress.done + progress.failed}/${progress.total}`
            : `Leave ${selected.size} selected`}
        </button>
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>⚠️ Confirm Leave</h2>
            <p>You're about to leave <strong>{selected.size} chat{selected.size !== 1 ? "s" : ""}</strong>.</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.4rem" }}>
              This cannot be undone for private channels and groups.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button className="btn-ghost" onClick={() => setConfirm(false)} style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleLeaveConfirmed} style={{ flex: 1, background: "var(--accent)" }}>Leave Now</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>⚙️ API Credentials</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "0.75rem" }}>
              Get from <a href="https://my.telegram.org/apps" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>my.telegram.org</a>
            </p>
            <label className="input-label">API ID</label>
            <input type="number" value={editApiId} onChange={e => setEditApiId(e.target.value)} style={{ marginBottom: "0.5rem" }} />
            <label className="input-label">API Hash</label>
            <input type="text" value={editApiHash} onChange={e => setEditApiHash(e.target.value)} />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button className="btn-ghost" onClick={() => setShowSettings(false)} style={{ flex: 1 }}>Cancel</button>
              <button onClick={saveSettings} disabled={!editApiId || !editApiHash} style={{ flex: 1 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
