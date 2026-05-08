import asyncio
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,  # required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dialogs.router)


@app.get("/")
async def root():
    return {"message": "Telegram Bulk Leave Manager API"}
