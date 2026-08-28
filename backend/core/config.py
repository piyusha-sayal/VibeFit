from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    firebase_project_id: str = ""  # Firebase project id; empty = ID-token verification disabled

    gemini_api_key: str = ""
    groq_api_key: str = ""
    ai_provider: str = "auto"  # auto | gemini | groq
    gemini_model: str = "gemini-2.5-flash"
    gemini_fallback_model: str = "gemini-2.5-flash-lite"
    groq_model: str = "llama-3.3-70b-versatile"

    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "vibefit-uploads"
    aws_region: str = "us-east-1"

    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:8081"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
