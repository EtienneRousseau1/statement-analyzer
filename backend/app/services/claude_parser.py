import json
from datetime import date
from decimal import Decimal
import google.generativeai as genai
from ..config import settings
from ..schemas.transaction import TransactionPreview

# Initialize Gemini client
genai.configure(api_key=settings.google_gemini_api_key)

_SYSTEM_PROMPT = """You are a financial statement parser. Given raw text from a bank or credit card statement, extract every transaction and return them as a JSON array.

Each transaction object must have exactly these fields:
- date: string in YYYY-MM-DD format
- description: string, cleaned merchant/payee name
- amount: number, always positive (use transaction_type to indicate direction)
- transaction_type: "debit" for money spent/withdrawn, "credit" for money received/refunded
- category: one of exactly: "Food & Dining", "Shopping", "Transport", "Entertainment", "Utilities", "Health", "Travel", "Subscriptions", "Income", "Other"

Rules:
- Ignore balance summaries, header rows, and non-transaction lines
- Round amounts to 2 decimal places
- If a date is missing the year, infer from surrounding context
- Return ONLY valid JSON — no markdown, no explanation, just the array

Example output:
[
  {"date": "2024-01-15", "description": "Whole Foods Market", "amount": 67.42, "transaction_type": "debit", "category": "Food & Dining"},
  {"date": "2024-01-16", "description": "Netflix", "amount": 15.99, "transaction_type": "debit", "category": "Subscriptions"}
]"""


def parse_statement(raw_text: str) -> list[TransactionPreview]:
    # Use Gemini Flash 2.0 for faster, cheaper processing
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=_SYSTEM_PROMPT,
        generation_config={
            "max_output_tokens": 4096,
            "temperature": 0.2,  # Low temperature for consistent extraction
        },
    )

    # Truncate input to be more cost-efficient (last 50k chars should cover most statements)
    truncated_text = raw_text[-50000:] if len(raw_text) > 50000 else raw_text

    response = model.generate_content(
        f"Parse the following statement:\n\n{truncated_text}"
    )

    raw_json = response.text.strip()
    # Strip markdown fences if Gemini adds them
    if raw_json.startswith("```"):
        raw_json = raw_json.split("```")[1]
        if raw_json.startswith("json"):
            raw_json = raw_json[4:]
        raw_json = raw_json.strip()

    transactions_data = json.loads(raw_json)

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
