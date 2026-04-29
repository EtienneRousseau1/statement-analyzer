import io
import pandas as pd


# Known column name mappings for major banks
_COLUMN_MAP = {
    # Chase credit card
    "transaction date": "date",
    "post date": "post_date",
    "merchant name or transaction description": "description",
    # Chase checking
    "posting date": "date",
    "details": "transaction_type",
    # Amex
    "date": "date",
    "amount": "amount",
    "description": "description",
    # BofA
    "posted date": "date",
    "payee": "description",
    "amount": "amount",
}


def normalize_csv(file_bytes: bytes) -> str:
    """Read a CSV and return a plain-text table for Claude to parse."""
    df = pd.read_csv(io.BytesIO(file_bytes))
    df.columns = [c.strip().lower() for c in df.columns]
    df.rename(columns={k: v for k, v in _COLUMN_MAP.items() if k in df.columns}, inplace=True)
    return df.to_string(index=False)
