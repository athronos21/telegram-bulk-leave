import { useState } from "react";
import { sendCode, signIn } from "../api/client";

interface Props {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: Props) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setError("");
    setLoading(true);
    try {
      await sendCode(phone);
      setStep("code");
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn(code, needs2FA ? password : undefined);
      onSuccess();
    } catch (e: any) {
      const detail = e.response?.data?.detail || "";
      if (detail.includes("password") || detail.includes("2FA")) {
        setNeeds2FA(true);
        setError("2FA required — enter your password below");
      } else {
        setError(detail || "Sign in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form">
      <h2>Login to Telegram</h2>
      {step === "phone" && (
        <>
          <input
            type="tel"
            placeholder="+1234567890"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button onClick={handleSendCode} disabled={loading || !phone}>
            {loading ? "Sending..." : "Send Code"}
          </button>
        </>
      )}
      {step === "code" && (
        <>
          <input
            type="text"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {needs2FA && (
            <input
              type="password"
              placeholder="2FA Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <button onClick={handleSignIn} disabled={loading || !code}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
