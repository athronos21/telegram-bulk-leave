interface Props {
  total: number;
  done: number;
  failed: number;
}

export default function ProgressBar({ total, done, failed }: Props) {
  const donePercent   = total === 0 ? 0 : Math.round((done   / total) * 100);
  const failedPercent = total === 0 ? 0 : Math.round((failed / total) * 100);
  const processed = done + failed;

  return (
    <div className="progress-bar-wrapper">
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
        <span>Processing… {processed}/{total}</span>
        <span>{donePercent + failedPercent}%</span>
      </div>
      <div className="progress-bar"
        role="progressbar"
        aria-valuenow={donePercent + failedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-fill-success" style={{ width: `${donePercent}%` }} />
        <div className="progress-fill-failed"  style={{ width: `${failedPercent}%` }} />
      </div>
      <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", marginTop: "0.4rem" }}>
        <span style={{ color: "#4caf50" }}>✅ {done} left</span>
        {failed > 0 && <span style={{ color: "var(--accent)" }}>❌ {failed} failed</span>}
      </div>
    </div>
  );
}
