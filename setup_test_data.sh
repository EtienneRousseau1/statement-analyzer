#!/bin/bash
# Quick helper to set up test data

API_URL="http://localhost:8000"
USER_EMAIL="${1:-test@example.com}"

echo "Setting up test data for: $USER_EMAIL"
echo ""

# Create a checking account
echo "1. Creating checking account..."
ACCOUNT=$(curl -s -X POST "$API_URL/accounts" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $USER_EMAIL" \
  -d '{
    "name": "My Checking Account",
    "institution": "Chase Bank",
    "account_type": "checking",
    "last_four": "1234"
  }')

ACCOUNT_ID=$(echo "$ACCOUNT" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

if [ -z "$ACCOUNT_ID" ]; then
  echo "Failed to create account. Response:"
  echo "$ACCOUNT"
  exit 1
fi

echo "✓ Created account ID: $ACCOUNT_ID"
echo ""

# Create a credit card account
echo "2. Creating credit card account..."
CARD=$(curl -s -X POST "$API_URL/accounts" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $USER_EMAIL" \
  -d '{
    "name": "My Credit Card",
    "institution": "American Express",
    "account_type": "credit",
    "last_four": "5678"
  }')

CARD_ID=$(echo "$CARD" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

if [ -z "$CARD_ID" ]; then
  echo "Failed to create card. Response:"
  echo "$CARD"
  exit 1
fi

echo "✓ Created card ID: $CARD_ID"
echo ""

# List accounts
echo "3. Listing your accounts..."
curl -s -X GET "$API_URL/accounts" \
  -H "X-User-Email: $USER_EMAIL" | python3 -m json.tool

echo ""
echo "Done! Now you can:"
echo "  1. Log into the app at http://localhost:3000"
echo "  2. Go to Upload page"
echo "  3. Select one of the accounts above"
echo "  4. Upload a CSV or PDF statement"
