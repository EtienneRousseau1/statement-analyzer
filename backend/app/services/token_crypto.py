from functools import lru_cache
from cryptography.fernet import Fernet
from ..config import settings


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    # Built lazily rather than at import: a deployment that never uses Plaid
    # shouldn't fail to boot over a key it doesn't need.
    if not settings.plaid_token_encryption_key:
        raise RuntimeError(
            "PLAID_TOKEN_ENCRYPTION_KEY is not set — refusing to store bank access tokens in the clear"
        )
    return Fernet(settings.plaid_token_encryption_key.encode())


def encrypt_token(token: str) -> str:
    return _fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    return _fernet().decrypt(encrypted.encode()).decode()
