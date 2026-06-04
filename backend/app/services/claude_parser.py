import json
from datetime import date
from decimal import Decimal
from google import genai
from ..config import settings
from ..schemas.transaction import TransactionPreview

# Initialize the google-genai client.
# Prefer an explicit API key (GENAI_API_KEY) if provided; otherwise use Vertex/ADC via GOOGLE_CLOUD_PROJECT.
if settings.genai_api_key:
    genai_client = genai.Client(api_key=settings.genai_api_key)
elif settings.google_cloud_project:
    genai_client = genai.Client(vertexai=True, project=settings.google_cloud_project)
else:
    raise RuntimeError("Either GOOGLE_CLOUD_PROJECT or GENAI_API_KEY must be set for Gemini parsing")

_SYSTEM_PROMPT = """You are a financial statement parser. Given raw text from a bank or credit card statement, extract every transaction from the ACCOUNT ACTIVITY section(s) only and return them as a JSON array.

Each transaction object must have exactly these fields:
- date: string in YYYY-MM-DD format
- description: string, cleaned merchant/payee name
- amount: number, always positive (use transaction_type to indicate direction)
- transaction_type: "debit" for money spent/withdrawn, "credit" for money received/refunded
- category: one of exactly: "Food & Dining", "Shopping", "Transport", "Entertainment", "Utilities", "Health", "Travel", "Subscriptions", "Income", "Other"

Rules:
- Only use the ACCOUNT ACTIVITY / ACCOUNT ACTIVITY (CONTINUED) sections; ignore ACCOUNT SUMMARY, REWARDS SUMMARY, interest charges, balances, payment warnings, and mailing/coupon text
- Ignore balance summaries, header rows, and non-transaction lines
- Round amounts to 2 decimal places
- If a date is missing the year, infer from surrounding context
- Return ONLY valid JSON — no markdown, no explanation, just the array

Example output:
[
  {"date": "2024-01-15", "description": "Whole Foods Market", "amount": 67.42, "transaction_type": "debit", "category": "Food & Dining"},
  {"date": "2024-01-16", "description": "Netflix", "amount": 15.99, "transaction_type": "debit", "category": "Subscriptions"}
]"""

# Large statements are parsed in chunks so we don't truncate or exceed output token limits.
CHUNK_SIZE = 30_000
MAX_OUTPUT_TOKENS = 8192


def _extract_account_activity_text(raw_text: str) -> str:
    text = raw_text.strip()
    start_markers = ["ACCOUNT ACTIVITY"]
    end_markers = ["INTEREST CHARGES", "ACCOUNT INFORMATION", "REWARDS SUMMARY"]

    start = -1
    for marker in start_markers:
        idx = text.find(marker)
        if idx != -1 and (start == -1 or idx < start):
            start = idx

    if start == -1:
        return text

    end_candidates = [text.find(marker, start) for marker in end_markers]
    end_candidates = [idx for idx in end_candidates if idx != -1]
    end = min(end_candidates) if end_candidates else len(text)

    return text[start:end].strip()


def _chunk_text(text: str, chunk_size: int = CHUNK_SIZE) -> list[str]:
    if len(text) <= chunk_size:
        return [text]
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]


def _extract_response_text(response) -> str:
    if hasattr(response, "text") and response.text:
        return response.text.strip()
    try:
        return response.candidates[0].content[0].text.strip()
    except Exception:
        return str(response).strip()


def _parse_json_array(raw_json: str) -> list[dict]:
    raw_json = raw_json.strip()
    if raw_json.startswith("```"):
        raw_json = raw_json.split("```")[1]
        if raw_json.startswith("json"):
            raw_json = raw_json[4:]
        raw_json = raw_json.strip()

    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Model returned invalid JSON: {exc}") from exc

    if not isinstance(data, list):
        raise ValueError("Model response was not a JSON array")
    return data


def _parse_chunk(chunk_text: str, chunk_index: int, chunk_count: int) -> list[TransactionPreview]:
    chunk_note = ""
    if chunk_count > 1:
        chunk_note = (
            f"\n\nNote: this is chunk {chunk_index + 1} of {chunk_count} from a long statement. "
            "Extract every transaction present in this chunk only."
        )

    prompt = _SYSTEM_PROMPT + chunk_note + "\n\nParse the following statement:\n\n" + chunk_text

    try:
        response = genai_client.models.generate_content(
            model=settings.genai_model or "gemini-3.1-flash-lite",
            contents=[prompt],
            config={
                "temperature": 0.2,
                "max_output_tokens": MAX_OUTPUT_TOKENS,
                "response_mime_type": "application/json",
            },
        )
    except Exception as exc:
        raise RuntimeError(f"LLM request failed: {exc}") from exc

    transactions_data = _parse_json_array(_extract_response_text(response))

    previews = []
    for t in transactions_data:
        previews.append(
            TransactionPreview(
                date=date.fromisoformat(t["date"]),
                description=t["description"],
                amount=Decimal(str(t["amount"])),
                transaction_type=t.get("transaction_type", "debit"),
                category=t.get("category", "Other"),
            )
        )
    return previews


def parse_statement(raw_text: str) -> list[TransactionPreview]:
    if not raw_text or not raw_text.strip():
        raise ValueError("No extractable text found in the uploaded file")

    activity_text = _extract_account_activity_text(raw_text)
    chunks = _chunk_text(activity_text)

    all_previews: list[TransactionPreview] = []
    seen: set[tuple[date, str, Decimal]] = set()

    for index, chunk in enumerate(chunks):
        for preview in _parse_chunk(chunk, index, len(chunks)):
            key = (preview.date, preview.description, preview.amount)
            if key in seen:
                continue
            seen.add(key)
            all_previews.append(preview)

    if not all_previews:
        raise ValueError("No transactions found in the uploaded file")

    return all_previews
