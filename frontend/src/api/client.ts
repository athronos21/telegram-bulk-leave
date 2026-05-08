import axios from "axios";

const api = axios.create({
  baseURL: "/",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send session cookie with every request
});

export interface Dialog {
  id: number;
  name: string;
  type: "channel" | "group" | "bot";
  unread_count: number;
}

export interface LeaveEvent {
  id?: number;
  name?: string;
  status: "success" | "failed" | "flood_wait" | "done";
  reason?: string;
  wait?: number;
  done: number;
  failed: number;
  total: number;
}

// Auth
export const getAuthStatus = () =>
  api.get<{ authorized: boolean }>("/auth/status");

export const sendCode = (phone: string) =>
  api.post("/auth/send-code", { phone });

export const signIn = (code: string, password?: string) =>
  api.post("/auth/sign-in", { code, password });

export const signOut = () => api.post("/auth/sign-out");

// Dialogs
export const getDialogs = () =>
  api.get<{ dialogs: Dialog[] }>("/dialogs/");

/**
 * Leave dialogs via SSE stream.
 * Calls onProgress for each event, resolves when done.
 */
export function leaveDialogsStream(
  ids: number[],
  onProgress: (event: LeaveEvent) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    fetch("/dialogs/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // send session cookie
      body: JSON.stringify({ ids }),
    })
      .then((res) => {
        if (!res.ok) return reject(new Error(`HTTP ${res.status}`));
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const pump = (): Promise<void> =>
          reader.read().then(({ done, value }) => {
            if (done) { resolve(); return; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const event: LeaveEvent = JSON.parse(line.slice(6));
                  onProgress(event);
                  if (event.status === "done") { resolve(); return; }
                } catch { /* skip malformed */ }
              }
            }
            return pump();
          });

        return pump();
      })
      .catch(reject);
  });
}
