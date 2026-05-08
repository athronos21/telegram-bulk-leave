from telethon import TelegramClient
from app.config import settings

# Single shared client instance
_client: TelegramClient | None = None


def get_client() -> TelegramClient:
    global _client
    if _client is None:
        _client = TelegramClient(
            settings.session_name,
            settings.api_id,
            settings.api_hash,
        )
    return _client


async def connect():
    client = get_client()
    if not client.is_connected():
        await client.connect()


async def disconnect():
    client = get_client()
    if client.is_connected():
        await client.disconnect()


async def ensure_connected():
    """Call this before any Telegram request to guarantee the connection is alive."""
    client = get_client()
    if not client.is_connected():
        await client.connect()
