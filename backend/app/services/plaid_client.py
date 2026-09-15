import json
from functools import lru_cache

import plaid
from plaid.api import plaid_api

from ..config import settings

_HOSTS = {
    "sandbox": plaid.Environment.Sandbox,
    "production": plaid.Environment.Production,
}


def plaid_enabled() -> bool:
    """Whether live bank connections are configured at all.

    Blank credentials are a valid state: the feature switches off and the app
    falls back to statement uploads.
    """
    return bool(settings.plaid_client_id and settings.plaid_secret)


@lru_cache(maxsize=1)
def get_plaid_client() -> plaid_api.PlaidApi:
    host = _HOSTS.get(settings.plaid_env)
    if host is None:
        raise RuntimeError(
            f"PLAID_ENV must be one of {sorted(_HOSTS)}, got {settings.plaid_env!r}"
        )
    configuration = plaid.Configuration(
        host=host,
        api_key={"clientId": settings.plaid_client_id, "secret": settings.plaid_secret},
    )
    return plaid_api.PlaidApi(plaid.ApiClient(configuration))


def plaid_error_code(exc: plaid.ApiException) -> str:
    """Plaid's machine-readable error code, e.g. ITEM_LOGIN_REQUIRED.

    The body is JSON but the SDK surfaces it as a string, and a malformed or
    empty body shouldn't mask the original failure.
    """
    try:
        return json.loads(exc.body).get("error_code") or "PLAID_ERROR"
    except (ValueError, TypeError, AttributeError):
        return "PLAID_ERROR"
