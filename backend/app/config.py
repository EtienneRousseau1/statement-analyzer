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
    # No insecure default: this secret verifies every user's auth token
    # (see middleware/auth.py). A guessable fallback here would let anyone
    # forge a JWT for any email address and read/delete any user's
    # financial data, so startup must fail loudly instead of running with
    # a known secret.
    nextauth_secret: str
    google_cloud_project: str = ""
    # Gemini / google-genai settings
    genai_model: str = "gemini-3.1-flash-lite"
    genai_api_key: str | None = None
    # Raw JSON contents of a GCP service-account key, used in place of
    # `gcloud auth application-default login` in hosted environments where
    # there's no personal user session to authenticate with.
    google_application_credentials_json: str | None = None
    frontend_url: str = "http://localhost:3000"

    # Plaid — live bank connections. Empty client id/secret simply means the
    # feature is off: the API refuses to start a connection and the UI falls
    # back to statement uploads.
    plaid_client_id: str = ""
    plaid_secret: str = ""
    plaid_env: str = "sandbox"  # sandbox | production
    # Where Plaid posts transaction updates. Must be publicly reachable.
    plaid_webhook_url: str = ""
    # Must match a URI registered in the Plaid dashboard, or OAuth banks
    # (Chase, Bank of America) refuse the connection.
    plaid_redirect_uri: str = ""
    # Fernet key encrypting stored access tokens. Deliberately separate from
    # database credentials so one leak isn't enough to use the tokens.
    plaid_token_encryption_key: str = ""
    # Plaid's trial plan caps live connections app-wide, not per user.
    plaid_max_items: int = 10


settings = Settings()

if settings.google_application_credentials_json and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    _creds_file = tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, prefix="gcp-sa-"
    )
    _creds_file.write(settings.google_application_credentials_json)
    _creds_file.close()
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _creds_file.name
