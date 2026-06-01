import { useState } from "react";
import { saveApiCredentials } from "../telegram/client";

interface Props {
  onDone: () => void;
}

export default function ApiSetup({ onDone }: Props) {
  const [apiId, setApiId]     = useState("");
  const [apiHash, setApiHash] = useState("");
  const [error, setError]     = useState("");

  const handleSubmit = () => {
    const id = parseInt(apiId.trim());
    const hash = apiHash.trim();
    if (!id || isNaN(id)) { setError("API ID must be a number"); return; }
    if (!hash)             { setError("API Hash is required");   return; }
    saveApiCredentials(id, hash);
    onDone();
  };

  return (
    <main className="page-login">
      <h1>📤 Telegram Bulk Leave</h1>
      <div className="login-form">
        <h2>App Credentials</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>
          Get your <strong>API ID</strong> and <strong>API Hash</strong> from{" "}
          <a href="https://my.telegram.org/apps" target="_blank" rel="noreferrer"
             style={{ color: "var(--accent)" }}>
            my.telegram.org
          </a>
          . These are stored only on this device.
        </p>
        <input
          type="number"
          placeholder="API ID (e.g. 12345678)"
          value={apiId}
          onChange={e => setApiId(e.target.value)}
        />
        <input
          type="text"
          placeholder="API Hash"
          value={apiHash}
          onChange={e => setApiHash(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />
        {error && <p className="error">{error}</p>}
        <button onClick={handleSubmit} disabled={!apiId || !apiHash}>
          Continue
        </button>
      </div>
    </main>
  );
}
