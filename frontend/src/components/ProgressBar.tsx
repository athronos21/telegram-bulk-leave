interface Props {
  total: number;
  done: number;
  failed: number;
}

export default function ProgressBar({ total, done, failed }: Props) {
  const percent = total === 0 ? 0 : Math.round(((done + failed) / total) * 100);

  return (
    <div className="progress-bar-wrapper">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p>
        {done + failed} / {total} processed — {done} left ✅, {failed} failed ❌
      </p>
    </div>
  );
}
