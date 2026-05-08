from fastapi import APIRouter, HTTPException, Cookie
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.telegram import dialogs as tg_dialogs
from app.telegram.auth import is_authorized

router = APIRouter(prefix="/dialogs", tags=["dialogs"])

COOKIE_NAME = "session_id"


def _require_session(session_id: str | None) -> str:
    if not session_id:
        raise HTTPException(status_code=401, detail="No session")
    return session_id


class LeaveRequest(BaseModel):
    ids: list[int]


@router.get("/")
async def list_dialogs(
    session_id: str | None = Cookie(default=None, alias=COOKIE_NAME),
):
    sid = _require_session(session_id)
    if not await is_authorized(sid):
        raise HTTPException(status_code=401, detail="Not authorized")
    try:
        dialogs = await tg_dialogs.get_dialogs(sid)
        return {"dialogs": dialogs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/leave")
async def leave_dialogs(
    body: LeaveRequest,
    session_id: str | None = Cookie(default=None, alias=COOKIE_NAME),
):
    sid = _require_session(session_id)
    if not await is_authorized(sid):
        raise HTTPException(status_code=401, detail="Not authorized")
    if not body.ids:
        raise HTTPException(status_code=400, detail="No dialog IDs provided")

    return StreamingResponse(
        tg_dialogs.leave_dialogs_stream(sid, body.ids),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
