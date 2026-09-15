import plaid
from fastapi import APIRouter, Depends, HTTPException, status
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.item_remove_request import ItemRemoveRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..middleware.auth import get_current_user
from ..models.account import Account
from ..models.plaid_item import PlaidItem
from ..models.user import User
from ..schemas.plaid import CapacityOut, ExchangeIn, LinkTokenOut, PlaidItemOut
from ..services.plaid_client import get_plaid_client, plaid_enabled, plaid_error_code
from ..services.token_crypto import decrypt_token, encrypt_token

router = APIRouter(prefix="/plaid", tags=["plaid"])

# Connections that still hold a usable token. Disconnected ones were revoked at
# Plaid, so they no longer occupy a slot.
LIVE_STATUSES = ("active", "login_required")

_US = [CountryCode("US")]


def _optional(obj, key):
    """Read a field the Plaid SDK may leave unset.

    The generated models raise on absent optional attributes rather than
    returning None, which would turn a missing account mask into a 500.
    """
    try:
        value = obj[key]
    except Exception:
        return None
    return getattr(value, "value", value)


# Depository subtypes that hold money rather than spend it. Everything else
# under "depository" (checking, hsa, cash management, prepaid) behaves like a
# spending account.
_SAVINGS_SUBTYPES = {"savings", "cd", "money market"}


def _map_account_type(plaid_type: str, subtype: str | None) -> str | None:
    """Plaid's account taxonomy narrowed to what this app can represent.

    Investment and loan accounts carry no spending history worth charting, so
    they're skipped rather than imported as something they aren't.
    """
    if plaid_type == "credit":
        return "credit"
    if plaid_type == "depository":
        return "savings" if subtype in _SAVINGS_SUBTYPES else "checking"
    return None


def _require_enabled() -> None:
    if not plaid_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Live bank connections aren't configured. Upload a statement instead.",
        )


def _active_item_count(db: Session) -> int:
    # Deliberately app-wide, not per user: Plaid's trial plan caps connections
    # across the whole integration.
    return db.query(PlaidItem).filter(PlaidItem.status.in_(LIVE_STATUSES)).count()


def _require_capacity(db: Session) -> None:
    if _active_item_count(db) >= settings.plaid_max_items:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="All live bank connections are in use. Upload a statement instead.",
        )


def _lookup_institution_name(client, institution_id: str | None) -> str | None:
    if not institution_id:
        return None
    try:
        response = client.institutions_get_by_id(
            InstitutionsGetByIdRequest(institution_id=institution_id, country_codes=_US)
        )
        return response["institution"]["name"]
    except plaid.ApiException:
        # A missing display name isn't worth failing an otherwise good connection.
        return None


@router.get("/capacity", response_model=CapacityOut)
def capacity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lets the UI offer uploads instead of an action that would fail."""
    active = _active_item_count(db)
    return CapacityOut(
        can_connect=plaid_enabled() and active < settings.plaid_max_items,
        active_items=active,
        limit=settings.plaid_max_items,
    )


@router.post("/link-token", response_model=LinkTokenOut)
def create_link_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_enabled()
    # Checked before Plaid is called, so an over-cap user never reaches a bank
    # login screen they can't complete.
    _require_capacity(db)

    request_fields = {
        # Plaid asks for a non-PII identifier, so this is the internal row id
        # rather than the user's email.
        "user": LinkTokenCreateRequestUser(client_user_id=str(current_user.id)),
        "client_name": "Statement Analyzer",
        "products": [Products("transactions")],
        "country_codes": _US,
        "language": "en",
    }
    if settings.plaid_webhook_url:
        request_fields["webhook"] = settings.plaid_webhook_url
    if settings.plaid_redirect_uri:
        # Required by OAuth banks (Chase, Bank of America), which redirect out
        # to their own site and back.
        request_fields["redirect_uri"] = settings.plaid_redirect_uri

    try:
        response = get_plaid_client().link_token_create(LinkTokenCreateRequest(**request_fields))
    except plaid.ApiException as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Plaid rejected the connection request ({plaid_error_code(exc)})",
        )

    return LinkTokenOut(link_token=response["link_token"], expiration=response["expiration"])


@router.post("/exchange", response_model=PlaidItemOut, status_code=status.HTTP_201_CREATED)
def exchange_public_token(
    payload: ExchangeIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_enabled()
    client = get_plaid_client()

    try:
        exchange = client.item_public_token_exchange(
            ItemPublicTokenExchangeRequest(public_token=payload.public_token)
        )
    except plaid.ApiException as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not complete the bank connection ({plaid_error_code(exc)})",
        )

    access_token = exchange["access_token"]
    item_id = exchange["item_id"]

    item = db.query(PlaidItem).filter(PlaidItem.item_id == item_id).first()
    if item and item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That bank connection belongs to another account",
        )
    if item is None:
        # Re-linking an existing connection shouldn't be refused by the cap;
        # only genuinely new ones consume a slot.
        _require_capacity(db)
        item = PlaidItem(user_id=current_user.id, item_id=item_id)
        db.add(item)

    item.access_token_encrypted = encrypt_token(access_token)
    item.status = "active"
    item.error_code = None

    try:
        accounts_response = client.accounts_get(AccountsGetRequest(access_token=access_token))
    except plaid.ApiException as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Connected, but couldn't read accounts ({plaid_error_code(exc)})",
        )

    item.institution_id = _optional(accounts_response["item"], "institution_id")
    item.institution_name = _lookup_institution_name(client, item.institution_id)
    db.flush()  # assigns item.id for the account rows below

    for plaid_account in accounts_response["accounts"]:
        account_type = _map_account_type(
            _optional(plaid_account, "type"), _optional(plaid_account, "subtype")
        )
        if account_type is None:
            continue

        plaid_account_id = plaid_account["account_id"]
        account = db.query(Account).filter(Account.plaid_account_id == plaid_account_id).first()
        if account and account.user_id != current_user.id:
            continue
        if account is None:
            account = Account(user_id=current_user.id, plaid_account_id=plaid_account_id)
            db.add(account)

        account.plaid_item_id = item.id
        account.name = plaid_account["name"]
        account.account_type = account_type
        account.institution = item.institution_name
        account.last_four = _optional(plaid_account, "mask")

    db.commit()
    db.refresh(item)
    return item


@router.get("/items", response_model=list[PlaidItemOut])
def list_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(PlaidItem)
        .filter(PlaidItem.user_id == current_user.id)
        .order_by(PlaidItem.created_at.desc())
        .all()
    )


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stop syncing, but keep everything already imported.

    Accounts and transactions survive: losing months of categorized history
    because someone unlinked a bank is the worse failure. The account reverts
    to upload-only.
    """
    item = (
        db.query(PlaidItem)
        .filter(PlaidItem.id == item_id, PlaidItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")

    if item.access_token_encrypted:
        try:
            get_plaid_client().item_remove(
                ItemRemoveRequest(access_token=decrypt_token(item.access_token_encrypted))
            )
        except plaid.ApiException:
            # Already revoked on Plaid's side; local cleanup still has to run.
            pass

    item.access_token_encrypted = None
    item.status = "disconnected"
    # The cursor belongs to the revoked token and would be rejected on reconnect.
    item.sync_cursor = None
    db.commit()
