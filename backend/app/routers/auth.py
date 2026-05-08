import uuid
from fastapi import APIRouter, HTTPException, Cookie, Response
from pydantic import BaseModel
from app.telegram import auth as tg_auth

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "session_id"
COOKIE_MAX_AGE = 60 * 60 * 2  # 2 hours


def _require_session(session_id: str | None) -> str:
    if not session_id:
        raise HTTPException(status_code=401, detail="No session")
    return session_id


class SendCodeRequest(BaseModel):
    phone: str


class SignInRequest(BaseModel):
    code: str
    password: str | None = None


@router.get("/status")
async def auth_status(
    response: Response,
    session_id: str | None = Cookie(default=None, alias=COOKIE_NAME),
):
    if not session_id:
        # Issue a new anonymous session cookie
        session_id = str(uuid.uuid4())
        response.set_cookie(
            key=COOKIE_NAME,
            value=session_id,
            httponly=True,
            samesite="lax",
            max_age=COOKIE_MAX_AGE,
        )
        return {"authorized": False}

    authorized = await tg_auth.is_authorized(session_id)
    return {"authorized": authorized}


@router.post("/send-code")
async def send_code(
    body: SendCodeRequest,
    response: Response,
    session_id: str | None = Cookie(default=None, alias=COOKIE_NAME),
):
    if not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie(
            key=COOKIE_NAME,
            value=session_id,
            httponly=True,
            samesite="lax",
            max_age=COOKIE_MAX_AGE,
        )
    try:
        await tg_auth.send_code(session_id, body.phone)
        return {"message": "Code sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sign-in")
async def sign_in(
    body: SignInRequest,
    session_id: str | None = Cookie(default=None, alias=COOKIE_NAME),
):
    sid = _require_session(session_id)
    try:
        await tg_auth.sign_in(sid, body.code, body.password)
        return {"message": "Signed in successfully"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/sign-out")
async def sign_out(
    response: Response,
    session_id: str | None = Cookie(default=None, alias=COOKIE_NAME),
):
    if session_id:
        await tg_auth.sign_out(session_id)
    response.delete_cookie(COOKIE_NAME)
    return {"message": "Signed out successfully"}
