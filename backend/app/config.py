from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env.local", ".env"),
        env_file_encoding="utf-8",
    )

    database_url: str = "postgresql+psycopg://user:password@localhost:5432/statement_analyzer"
    nextauth_secret: str = "change-me-in-production"
    google_cloud_project: str = ""
    # Gemini / google-genai settings
    genai_model: str = "gemini-3.1-flash-lite"
    genai_api_key: str | None = None
    frontend_url: str = "http://localhost:3000"


settings = Settings()
