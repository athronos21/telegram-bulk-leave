import { useEffect, useState } from "react";
import { isAuthorized, getApiCredentials } from "./telegram/client";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ApiSetup from "./pages/ApiSetup";

export default function App() {
  const [screen, setScreen] = useState<"loading" | "api-setup" | "login" | "dashboard">("loading");

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { apiId, apiHash } = getApiCredentials();
    if (!apiId || !apiHash) {
      setScreen("api-setup");
      return;
    }
    try {
      const auth = await isAuthorized();
      setScreen(auth ? "dashboard" : "login");
    } catch {
      setScreen("login");
    }
  };

  if (screen === "loading") return <div className="page-login"><p>Loading...</p></div>;
  if (screen === "api-setup") return <ApiSetup onDone={() => setScreen("login")} />;
  if (screen === "login")     return <Login onSuccess={() => setScreen("dashboard")} />;
  return <Dashboard onLogout={() => setScreen("login")} />;
}
