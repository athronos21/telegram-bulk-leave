import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, dialogs
from app.telegram.session_manager import cleanup_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background session cleanup (sessions dir is created on first use)
    task = asyncio.create_task(cleanup_loop())
    yield
    task.cancel()


app = FastAPI(title="Telegram Bulk Leave Manager", lifespan=lifespan)

# Allow both local dev and deployed frontend, plus Electron (file://)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:8765",
    "null",  # file:// origin appears as "null" in CORS headers
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    ALLOWED_ORIGINS.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dialogs.router)


@app.get("/")
async def root():
    return {"message": "Telegram Bulk Leave Manager API"}
