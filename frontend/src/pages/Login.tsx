import { useState } from "react";
import { sendCode, signIn, signIn2FA } from "../telegram/client";

interface Props {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: Props) {
  const [phone,    setPhone]    = useState("");
  const [code,     setCode]     = useState("");
  const [password, setPassword] = useState("");
  const [step,     setStep]     = useState<"phone" | "code" | "2fa">("phone");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSendCode = async () => {
    setError(""); setLoading(true);
    try {
      await sendCode(phone);
      setStep("code");
    } catch (e: any) {
      setError(e.message || "Failed to send code");
    } finally { setLoading(false); }
  };

  const handleSignIn = async () => {
    setError(""); setLoading(true);
    try {
      const result = await signIn(code);
      if (result === "2fa") {
        setStep("2fa");
        setError("2FA required — enter your Telegram password");
      } else {
        onSuccess();
      }
    } catch (e: any) {
      setError(e.message || "Sign in failed");
    } finally { setLoading(false); }
  };

  const handleSubmit2FA = async () => {
    setError(""); setLoading(true);
    try {
      await signIn2FA(password);
      onSuccess();
    } catch (e: any) {
      setError(e.message || "Wrong password");
    } finally { setLoading(false); }
  };

  return (
    <main className="page-login">
      <h1>📤 Telegram Bulk Leave</h1>
      <p>Log in with your Telegram account to get started.</p>
      <div className="login-form">
        <h2>Login</h2>

        {step === "phone" && (
          <>
            <input type="tel" placeholder="+1234567890"
              value={phone} onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendCode()} />
            <button onClick={handleSendCode} disabled={loading || !phone}>
              {loading ? "Sending..." : "Send Code"}
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <input type="text" placeholder="Verification code"
              value={code} onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSignIn()} />
            <button onClick={handleSignIn} disabled={loading || !code}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </>
        )}

        {step === "2fa" && (
          <>
            <input type="password" placeholder="2FA Password"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit2FA()} />
            <button onClick={handleSubmit2FA} disabled={loading || !password}>
              {loading ? "Signing in..." : "Submit Password"}
            </button>
          </>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
