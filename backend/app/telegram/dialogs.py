import asyncio
import json
import random
from collections.abc import AsyncGenerator
from telethon.errors import FloodWaitError
from telethon.tl.types import Channel, Chat, User
from app.telegram.session_manager import get_or_create_client


def _classify(dialog) -> str:
    entity = dialog.entity
    if isinstance(entity, Channel):
        return "group" if entity.megagroup else "channel"
    if isinstance(entity, Chat):
        return "group"
    if isinstance(entity, User) and entity.bot:
        return "bot"
    return "other"


async def get_dialogs(session_id: str) -> list[dict]:
    client = await get_or_create_client(session_id)
    dialogs = await client.get_dialogs()
    result = []
    for d in dialogs:
        dtype = _classify(d)
        if dtype == "other":
            continue
        result.append({
            "id": d.id,
            "name": d.name or "Unknown",
            "type": dtype,
            "unread_count": d.unread_count,
        })
    return result


async def leave_dialogs_stream(
    session_id: str, dialog_ids: list[int]
) -> AsyncGenerator[str, None]:
    client = await get_or_create_client(session_id)
    all_dialogs = await client.get_dialogs()
    dialog_map = {d.id: d for d in all_dialogs}

    total = len(dialog_ids)
    done = 0
    failed = 0

    for did in dialog_ids:
        dialog = dialog_map.get(did)
        name = dialog.name if dialog else str(did)

        if not dialog:
            failed += 1
            yield f"data: {json.dumps({'id': did, 'name': name, 'status': 'failed', 'reason': 'not found', 'done': done, 'failed': failed, 'total': total})}\n\n"
            continue

        try:
            await client.delete_dialog(dialog.entity)
            done += 1
            event = {"id": did, "name": name, "status": "success",
                     "done": done, "failed": failed, "total": total}
        except FloodWaitError as e:
            wait = e.seconds + 5
            yield f"data: {json.dumps({'status': 'flood_wait', 'wait': wait, 'done': done, 'failed': failed, 'total': total})}\n\n"
            await asyncio.sleep(wait)
            try:
                await client.delete_dialog(dialog.entity)
                done += 1
                event = {"id": did, "name": name, "status": "success",
                         "done": done, "failed": failed, "total": total}
            except Exception as ex:
                failed += 1
                event = {"id": did, "name": name, "status": "failed", "reason": str(ex),
                         "done": done, "failed": failed, "total": total}
        except Exception as ex:
            failed += 1
            event = {"id": did, "name": name, "status": "failed", "reason": str(ex),
                     "done": done, "failed": failed, "total": total}

        yield f"data: {json.dumps(event)}\n\n"
        await asyncio.sleep(random.uniform(1, 3))

    yield f"data: {json.dumps({'status': 'done', 'done': done, 'failed': failed, 'total': total})}\n\n"
