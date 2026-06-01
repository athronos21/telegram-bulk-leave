const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const fs = require("fs");

const PORT = 8765; // fixed internal port
let backendProcess = null;
let mainWindow = null;

// ── Resolve paths ────────────────────────────────────────────────────────────
function getResourcesPath() {
  // In production (packaged), resources are in process.resourcesPath.
  // In dev (electron .), they sit next to this file.
  return app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, "..");
}

function getBackendBin() {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, "backend", "tbl-backend")
    : path.join(__dirname, "..", "backend", "dist", "tbl-backend");
  return base;
}

function getFrontendPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "frontend", "index.html")
    : path.join(__dirname, "..", "frontend", "dist", "index.html");
}

// ── Backend lifecycle ────────────────────────────────────────────────────────
function startBackend() {
  const bin = getBackendBin();

  if (!fs.existsSync(bin)) {
    dialog.showErrorBox(
      "Backend not found",
      `Could not find backend binary at:\n${bin}\n\nRun the build script first.`
    );
    app.quit();
    return;
  }

  // Make sure it's executable
  try { fs.chmodSync(bin, 0o755); } catch (_) {}

  // Sessions folder next to the binary (or in userData for packaged)
  const sessionsDir = app.isPackaged
    ? path.join(app.getPath("userData"), "sessions")
    : path.join(__dirname, "..", "backend", "sessions");

  fs.mkdirSync(sessionsDir, { recursive: true });

  backendProcess = spawn(bin, [], {
    env: {
      ...process.env,
      PORT: String(PORT),
      SESSIONS_DIR: sessionsDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  backendProcess.stdout.on("data", (d) => console.log("[backend]", d.toString().trim()));
  backendProcess.stderr.on("data", (d) => console.error("[backend]", d.toString().trim()));

  backendProcess.on("exit", (code) => {
    console.log(`[backend] exited with code ${code}`);
  });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

// ── Wait for backend to be ready ─────────────────────────────────────────────
function waitForBackend(retries = 30, delay = 500) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      http
        .get(`http://127.0.0.1:${PORT}/`, (res) => resolve())
        .on("error", () => {
          if (n <= 0) return reject(new Error("Backend did not start in time"));
          setTimeout(() => attempt(n - 1), delay);
        });
    };
    attempt(retries);
  });
}

// ── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    title: "Telegram Bulk Leave",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(getFrontendPath());
  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── App events ───────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  startBackend();

  try {
    await waitForBackend();
  } catch (err) {
    dialog.showErrorBox("Startup error", "Backend failed to start. Check logs.");
    app.quit();
    return;
  }

  createWindow();
});

app.on("window-all-closed", () => {
  stopBackend();
  app.quit();
});

app.on("before-quit", () => stopBackend());
