import os
import tempfile

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env.local", ".env"),
        env_file_encoding="utf-8",
        # Tolerate stray/legacy vars in .env files (e.g. GOOGLE_CLOUD_LOCATION,
        # which older docs referenced but no field here ever consumed) instead
        # of crashing app startup on any undeclared key.
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://user:password@localhost:5432/statement_analyzer"
    nextauth_secret: str = "change-me-in-production"
    google_cloud_project: str = ""
    # Gemini / google-genai settings
    genai_model: str = "gemini-3.1-flash-lite"
    genai_api_key: str | None = None
    # Raw JSON contents of a GCP service-account key, used in place of
    # `gcloud auth application-default login` in hosted environments where
    # there's no personal user session to authenticate with.
    google_application_credentials_json: str | None = None
    frontend_url: str = "http://localhost:3000"


settings = Settings()

if settings.google_application_credentials_json and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    _creds_file = tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, prefix="gcp-sa-"
    )
    _creds_file.write(settings.google_application_credentials_json)
    _creds_file.close()
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _creds_file.name
