from telethon.errors import SessionPasswordNeededError
from app.telegram.session_manager import (
    get_or_create_client,
    get_session_meta,
    set_session_meta,
    destroy_session,
)


async def send_code(session_id: str, phone: str) -> None:
    client = await get_or_create_client(session_id)
    result = await client.send_code_request(phone)
    set_session_meta(session_id, phone, result.phone_code_hash)


async def sign_in(session_id: str, code: str | None, password: str | None = None) -> bool:
    client = await get_or_create_client(session_id)
    meta = get_session_meta(session_id)
    if not meta:
        raise ValueError("Session not found")

    # If a password is provided, go straight to 2FA — the code was already
    # consumed on the previous attempt that raised SessionPasswordNeededError.
    if password and not code:
        await client.sign_in(password=password)
        return True

    try:
        await client.sign_in(
            phone=meta["phone_number"],
            code=code,
            phone_code_hash=meta["phone_code_hash"],
        )
        return True
    except SessionPasswordNeededError:
        if password:
            await client.sign_in(password=password)
            return True
        # Signal to the caller that 2FA is required
        raise


async def is_authorized(session_id: str) -> bool:
    client = await get_or_create_client(session_id)
    return await client.is_user_authorized()


async def sign_out(session_id: str) -> None:
    await destroy_session(session_id)
