from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    database_url: str = "sqlite:///./founder_brain_audit.db"
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    cerebras_api_key: str = ""
    groq_api_key: str = ""
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50
    extraction_model: str = "claude-haiku-4-5-20251001"
    similarity_threshold: float = 0.80

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
