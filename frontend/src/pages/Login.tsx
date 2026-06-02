import { useState } from "react";
import { sendCode, signIn, signIn2FA } from "../telegram/client";

interface Props {
  onSuccess: () => void;
}

const STEPS = ["Phone", "Code", "2FA"];
const STEP_INDEX: Record<string, number> = { phone: 0, code: 1, "2fa": 2 };

export default function Login({ onSuccess }: Props) {
  const [phone,    setPhone]    = useState("");
  const [code,     setCode]     = useState("");
  const [password, setPassword] = useState("");
  const [step,     setStep]     = useState<"phone" | "code" | "2fa">("phone");
  const [error,    setError]    = useState("");
  const [info,     setInfo]     = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSendCode = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      await sendCode(phone);
      setStep("code");
      setInfo(`Code sent to ${phone}`);
    } catch (e: any) {
      setError(e.message || "Failed to send code");
    } finally { setLoading(false); }
  };

  const handleSignIn = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      const result = await signIn(code);
      if (result === "2fa") {
        setStep("2fa");
        setInfo("2FA is enabled — enter your Telegram cloud password.");
      } else {
        onSuccess();
      }
    } catch (e: any) {
      setError(e.message || "Sign in failed");
    } finally { setLoading(false); }
  };

  const handleSubmit2FA = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      await signIn2FA(password);
      onSuccess();
    } catch (e: any) {
      setError(e.message || "Wrong password");
    } finally { setLoading(false); }
  };

  const goBack = () => {
    setError(""); setInfo("");
    if (step === "2fa") { setStep("code"); }
    else if (step === "code") { setStep("phone"); }
  };

  return (
    <main className="page-login">
      <h1>📤 Telegram Bulk Leave</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        Log in with your Telegram account to get started.
      </p>

      <div className="login-form">
        {/* Step indicator */}
        <div className="step-indicator">
          {STEPS.map((label, i) => (
            <div key={label} className="step-item">
              <div className={`step-dot ${i < STEP_INDEX[step] ? "done" : i === STEP_INDEX[step] ? "active" : ""}`}>
                {i < STEP_INDEX[step] ? "✓" : i + 1}
              </div>
              <span className={`step-label ${i === STEP_INDEX[step] ? "active" : ""}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`step-line ${i < STEP_INDEX[step] ? "done" : ""}`} />}
            </div>
          ))}
        </div>

        {/* Phone step */}
        {step === "phone" && (
          <>
            <label className="input-label">Phone number</label>
            <input type="tel" placeholder="+1234567890"
              value={phone} onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendCode()} />
            <button onClick={handleSendCode} disabled={loading || !phone}>
              {loading ? "Sending…" : "Send Code →"}
            </button>
          </>
        )}

        {/* Code step */}
        {step === "code" && (
          <>
            <label className="input-label">Verification code</label>
            <input type="text" placeholder="12345" autoFocus
              value={code} onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSignIn()} />
            <button onClick={handleSignIn} disabled={loading || !code}>
              {loading ? "Verifying…" : "Sign In →"}
            </button>
            <button className="btn-ghost" onClick={goBack} disabled={loading}>← Back</button>
          </>
        )}

        {/* 2FA step */}
        {step === "2fa" && (
          <>
            <label className="input-label">Cloud password (2FA)</label>
            <input type="password" placeholder="Your Telegram password" autoFocus
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit2FA()} />
            <button onClick={handleSubmit2FA} disabled={loading || !password}>
              {loading ? "Verifying…" : "Continue →"}
            </button>
            <button className="btn-ghost" onClick={goBack} disabled={loading}>← Back</button>
          </>
        )}

        {info  && <p className="info-msg">{info}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
