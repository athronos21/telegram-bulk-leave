"""
Entry point for the PyInstaller-bundled backend.
Reads PORT from env (Electron passes it), defaults to 8000.
"""
import os
import sys
import uvicorn

# When frozen, __file__ is inside the temp extraction dir.
# Make sure the app package is importable.
if getattr(sys, "frozen", False):
    bundle_dir = sys._MEIPASS  # type: ignore[attr-defined]
    sys.path.insert(0, bundle_dir)

port = int(os.environ.get("PORT", 8000))

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, log_level="warning")
