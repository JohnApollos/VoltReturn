import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "VoltReturn"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///backend.db"
    DUCKDB_PATH: str = "data/emobility.duckdb"
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
