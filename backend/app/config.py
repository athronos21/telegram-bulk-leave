from pathlib import Path
from pydantic_settings import BaseSettings

# Always resolve .env relative to this file's directory (backend/)
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    api_id: int
    api_hash: str
    session_name: str = "bulk_leave_session"

    class Config:
        env_file = str(ENV_FILE)


settings = Settings()
