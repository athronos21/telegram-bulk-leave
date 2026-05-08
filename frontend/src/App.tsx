import { useEffect, useState } from "react";
import { getAuthStatus } from "./api/client";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await getAuthStatus();
      setAuthorized(res.data.authorized);
    } catch {
      setAuthorized(false);
    }
  };

  if (authorized === null) return <p>Loading...</p>;

  return authorized ? (
    <Dashboard onLogout={() => setAuthorized(false)} />
  ) : (
    <Login onSuccess={() => setAuthorized(true)} />
  );
}
