import asyncio
import os
import time
from pathlib import Path
from telethon import TelegramClient
from app.config import settings

# session_id -> {client, last_used, phone_code_hash, phone_number}
_sessions: dict[str, dict] = {}

SESSION_TTL = 60 * 60 * 2  # 2 hours of inactivity

# Sessions dir: prefer SESSIONS_DIR env var (set by Electron), then fall back
# to backend/sessions/ relative to this file — works regardless of cwd.
_SESSIONS_DIR = Path(
    os.environ.get("SESSIONS_DIR")
    or Path(__file__).resolve().parent.parent.parent / "sessions"
)


def _session_file(session_id: str) -> str:
    return str(_SESSIONS_DIR / session_id)


async def get_or_create_client(session_id: str) -> TelegramClient:
    _SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    if session_id not in _sessions:
        client = TelegramClient(
            _session_file(session_id),
            settings.api_id,
            settings.api_hash,
        )
        _sessions[session_id] = {
            "client": client,
            "last_used": time.time(),
            "phone_code_hash": None,
            "phone_number": None,
        }
    else:
        _sessions[session_id]["last_used"] = time.time()

    client: TelegramClient = _sessions[session_id]["client"]
    if not client.is_connected():
        await client.connect()
    return client


def get_session_meta(session_id: str) -> dict | None:
    return _sessions.get(session_id)


def set_session_meta(session_id: str, phone: str, phone_code_hash: str):
    if session_id in _sessions:
        _sessions[session_id]["phone_number"] = phone
        _sessions[session_id]["phone_code_hash"] = phone_code_hash


async def destroy_session(session_id: str):
    entry = _sessions.pop(session_id, None)
    if entry:
        client: TelegramClient = entry["client"]
        if client.is_connected():
            await client.log_out()
            await client.disconnect()
    # Remove the session file from disk
    session_path = Path(_session_file(session_id) + ".session")
    try:
        session_path.unlink(missing_ok=True)
    except Exception:
        pass


async def cleanup_expired():
    """Remove sessions inactive for SESSION_TTL seconds."""
    now = time.time()
    expired = [
        sid for sid, data in _sessions.items()
        if now - data["last_used"] > SESSION_TTL
    ]
    for sid in expired:
        entry = _sessions.pop(sid)
        client: TelegramClient = entry["client"]
        try:
            if client.is_connected():
                await client.disconnect()
        except Exception:
            pass
        # Remove the session file from disk
        session_path = Path(_session_file(sid) + ".session")
        try:
            session_path.unlink(missing_ok=True)
        except Exception:
            pass


async def cleanup_loop():
    """Background task that cleans up expired sessions every 30 minutes."""
    while True:
        await asyncio.sleep(60 * 30)
        await cleanup_expired()
