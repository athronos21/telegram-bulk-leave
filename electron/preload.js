// Context bridge — nothing needed for now since the frontend
// talks to the backend over localhost HTTP, not via IPC.
// Kept as a placeholder for future native integrations.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("appInfo", {
  version: process.env.npm_package_version ?? "1.0.0",
});
