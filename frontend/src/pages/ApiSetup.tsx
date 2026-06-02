import { useState } from "react";
import { saveApiCredentials } from "../telegram/client";

interface Props {
  onDone: () => void;
}

const steps = [
  {
    num: 1,
    title: "Open Telegram API portal",
    body: (
      <>
        Go to{" "}
        <a
          href="https://my.telegram.org/apps"
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--accent)" }}
        >
          my.telegram.org/apps
        </a>{" "}
        in your browser.
      </>
    ),
  },
  {
    num: 2,
    title: "Log in with your phone number",
    body: "Enter your Telegram phone number (with country code, e.g. +1234567890). Telegram will send you a confirmation code — enter it to log in.",
  },
  {
    num: 3,
    title: "Create a new application",
    body: 'Click "Create new application". Fill in any App title (e.g. "MyApp") and Short name. The platform and URL fields don\'t matter — leave them as-is.',
  },
  {
    num: 4,
    title: "Copy your credentials",
    body: 'After creating the app, you\'ll see your App api_id (a number) and App api_hash (a long string). Copy both — you\'ll paste them below.',
  },
];

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
    <main className="page-login" style={{ justifyContent: "flex-start", paddingTop: "2.5rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>📤 Telegram Bulk Leave</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        First-time setup — takes about 2 minutes.
      </p>

      {/* Step-by-step guide */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        marginBottom: "1.5rem",
      }}>
        {steps.map(step => (
          <div key={step.num} style={{
            display: "flex",
            gap: "1rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "0.9rem 1rem",
            alignItems: "flex-start",
          }}>
            <span style={{
              minWidth: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.85rem",
              flexShrink: 0,
              marginTop: 1,
            }}>
              {step.num}
            </span>
            <div>
              <p style={{ fontWeight: 600, marginBottom: "0.3rem", fontSize: "0.95rem" }}>
                {step.title}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.55 }}>
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Credential inputs */}
      <div className="login-form" style={{ width: "100%", maxWidth: 420 }}>
        <h2 style={{ marginBottom: "0.25rem" }}>Enter your credentials</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          Stored locally on this device only — never sent anywhere else.
        </p>
        <input
          type="number"
          placeholder="API ID  (e.g. 12345678)"
          value={apiId}
          onChange={e => setApiId(e.target.value)}
        />
        <input
          type="text"
          placeholder="API Hash  (e.g. a1b2c3d4e5f6...)"
          value={apiHash}
          onChange={e => setApiHash(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />
        {error && <p className="error">{error}</p>}
        <button onClick={handleSubmit} disabled={!apiId || !apiHash}>
          Continue →
        </button>
      </div>
    </main>
  );
}
