from datetime import datetime, timezone
from decimal import Decimal

import plaid
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from sqlalchemy.orm import Session

from ..models.account import Account
from ..models.plaid_item import PlaidItem
from ..models.transaction import Transaction
from .plaid_client import get_plaid_client, optional_field, plaid_error_code
from .token_crypto import decrypt_token


class ItemNeedsReauth(Exception):
    """The bank login expired. Only the user can resolve this."""


class SyncFailed(Exception):
    """Sync couldn't complete. The cursor is untouched, so a retry replays."""


class _StreamMutated(Exception):
    """Plaid's data changed mid-pagination; the run must restart."""


# Plaid's category taxonomy collapsed onto this app's. A plain lookup rather
# than an LLM call, so live sync costs nothing per transaction.
_CATEGORY_BY_PRIMARY = {
    "FOOD_AND_DRINK": "Food & Dining",
    "GENERAL_MERCHANDISE": "Shopping",
    "HOME_IMPROVEMENT": "Shopping",
    "TRANSPORTATION": "Transport",
    "ENTERTAINMENT": "Entertainment",
    "RENT_AND_UTILITIES": "Utilities",
    "MEDICAL": "Health",
    "PERSONAL_CARE": "Health",
    "TRAVEL": "Travel",
    "INCOME": "Income",
    # Money moving between the user's own accounts. Kept out of spending so a
    # card payment isn't counted in checking and again as the charges it settles.
    "TRANSFER_IN": "Transfers",
    "TRANSFER_OUT": "Transfers",
    "LOAN_PAYMENTS": "Transfers",
    "BANK_FEES": "Other",
    "GENERAL_SERVICES": "Other",
    "GOVERNMENT_AND_NON_PROFIT": "Other",
}

# Rent and utilities share a primary category, so rent needs the finer one.
_RENT_DETAILED = "RENT_AND_UTILITIES_RENT"

_PAGE_SIZE = 500
# A couple of restarts absorbs normal churn; beyond that something else is wrong
# and looping would just hammer Plaid.
_MAX_RESTARTS = 3


def _map_category(plaid_txn) -> tuple[str, str | None]:
    pfc = optional_field(plaid_txn, "personal_finance_category")
    if pfc is None:
        return "Other", None
    primary = optional_field(pfc, "primary") or ""
    detailed = optional_field(pfc, "detailed")
    if detailed == _RENT_DETAILED:
        return "Rent", detailed
    return _CATEGORY_BY_PRIMARY.get(primary, "Other"), detailed or primary or None


def _upsert(db: Session, item: PlaidItem, plaid_txn, accounts: dict[str, Account]) -> bool | None:
    """Insert or update one transaction. True if inserted, None if not ours."""
    account = accounts.get(plaid_txn["account_id"])
    if account is None:
        # An account type this app doesn't track (investment, loan).
        return None

    transaction_id = plaid_txn["transaction_id"]
    txn = (
        db.query(Transaction)
        .filter(Transaction.plaid_transaction_id == transaction_id)
        .first()
    )
    created = txn is None
    if created:
        txn = Transaction(
            user_id=item.user_id,
            plaid_transaction_id=transaction_id,
            source="plaid",
            # Synced rows skip the upload flow's review step — they came from
            # the bank, and the dashboard only counts confirmed transactions.
            confirmed=True,
        )
        db.add(txn)

    amount = Decimal(str(plaid_txn["amount"]))
    category, raw_category = _map_category(plaid_txn)

    txn.account_id = account.id
    txn.date = plaid_txn["date"]
    txn.description = optional_field(plaid_txn, "merchant_name") or plaid_txn["name"]
    # Plaid's sign convention is inverted: positive means money leaving.
    txn.transaction_type = "debit" if amount > 0 else "credit"
    txn.amount = abs(amount)
    txn.pending = bool(optional_field(plaid_txn, "pending"))
    txn.raw_category = raw_category
    # A hand-picked category outranks anything Plaid sends later.
    if not txn.category_overridden:
        txn.category = category
    return created


def _mark_needs_reauth(db: Session, item_id: int, error_code: str) -> None:
    db.rollback()
    item = db.query(PlaidItem).filter(PlaidItem.id == item_id).one()
    item.status = "login_required"
    item.error_code = error_code
    db.commit()


def _sync_once(db: Session, item_id: int) -> dict[str, object]:
    # Locked for the duration: a webhook arriving while the user clicks
    # "Sync now" waits its turn instead of importing the same window twice.
    item = db.query(PlaidItem).filter(PlaidItem.id == item_id).with_for_update().one()
    if not item.access_token_encrypted:
        raise SyncFailed("This connection has been disconnected")

    access_token = decrypt_token(item.access_token_encrypted)
    accounts = {
        account.plaid_account_id: account
        for account in db.query(Account).filter(Account.plaid_item_id == item.id).all()
        if account.plaid_account_id
    }

    client = get_plaid_client()
    cursor = item.sync_cursor
    # `update_status` rides along because connecting a bank always races Plaid's
    # initial backfill: without it, a first sync that legitimately returns
    # nothing is indistinguishable from an account with no transactions.
    counts: dict[str, object] = {"added": 0, "modified": 0, "removed": 0, "update_status": None}

    while True:
        request_fields = {"access_token": access_token, "count": _PAGE_SIZE}
        if cursor:
            request_fields["cursor"] = cursor

        try:
            response = client.transactions_sync(TransactionsSyncRequest(**request_fields))
        except plaid.ApiException as exc:
            code = plaid_error_code(exc)
            if code == "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION":
                raise _StreamMutated
            if code in ("ITEM_LOGIN_REQUIRED", "ITEM_LOCKED", "PENDING_EXPIRATION"):
                _mark_needs_reauth(db, item_id, code)
                raise ItemNeedsReauth(code)
            raise SyncFailed(f"Plaid sync failed ({code})")

        for plaid_txn in list(response["added"]) + list(response["modified"]):
            created = _upsert(db, item, plaid_txn, accounts)
            if created is None:
                continue
            counts["added" if created else "modified"] += 1

        for removed in response["removed"]:
            counts["removed"] += (
                db.query(Transaction)
                .filter(Transaction.plaid_transaction_id == removed["transaction_id"])
                .delete(synchronize_session=False)
            )

        counts["update_status"] = optional_field(response, "transactions_update_status")
        cursor = response["next_cursor"]
        if not response["has_more"]:
            break

    # The cursor is persisted in the same commit as the rows it accounts for.
    # Crash before this and the next run replays the window rather than skipping
    # it — replay is harmless because plaid_transaction_id is unique.
    item.sync_cursor = cursor
    item.last_synced_at = datetime.now(timezone.utc)
    item.status = "active"
    item.error_code = None
    db.commit()
    return counts


def sync_item(db: Session, item_id: int) -> dict[str, object]:
    """Pull every transaction change for one connection.

    Safe to call concurrently and safe to interrupt: see the row lock and the
    cursor ordering in `_sync_once`.
    """
    for _ in range(_MAX_RESTARTS):
        try:
            return _sync_once(db, item_id)
        except _StreamMutated:
            # Nothing was committed, so restarting from the stored cursor
            # re-reads the window cleanly.
            db.rollback()
    raise SyncFailed("Plaid's transaction stream kept changing during pagination")
