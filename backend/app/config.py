from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+psycopg://user:password@localhost:5432/statement_analyzer"
    nextauth_secret: str = "change-me-in-production"
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    frontend_url: str = "http://localhost:3000"


settings = Settings()
