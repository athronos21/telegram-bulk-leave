import asyncio
import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, dialogs
from app.telegram.session_manager import cleanup_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure sessions directory exists
    Path("sessions").mkdir(exist_ok=True)
    # Start background session cleanup
    task = asyncio.create_task(cleanup_loop())
    yield
    task.cancel()


app = FastAPI(title="Telegram Bulk Leave Manager", lifespan=lifespan)

# Allow both local dev and deployed frontend
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:4173",
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
