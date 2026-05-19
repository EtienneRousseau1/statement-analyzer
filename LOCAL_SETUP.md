# Statement Analyzer - Local Development Setup

## Prerequisites

Ensure you have installed:
- Python 3.10+ (`python3 --version`)
- Node.js 16+ (`node --version`)
- PostgreSQL 14+ (`psql --version`)

## Step 1: Database Setup

### Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql:
CREATE DATABASE statement_analyzer;
\q
```

### Verify Connection

```bash
psql -U postgres -d statement_analyzer -c "SELECT 1"
```

You should see:
```
 ?column?
----------
        1
(1 row)
```

## Step 2: Backend Setup

### Install Python Dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Create Initial Database Migration

```bash
# Generate migration from models
alembic revision --autogenerate -m "init schema"

# Apply migration to database
alembic upgrade head
```

### Verify Schema

```bash
psql -U postgres -d statement_analyzer -c "\dt"
```

You should see tables: `users`, `accounts`, `transactions`, `budgets`, `statements`.

### Set Up Backend Environment Variables

Copy `.env.example` to `.env` (or `.env.local`):

```bash
cp .env.example .env
```

Edit `backend/.env` and update these values:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/statement_analyzer
NEXTAUTH_SECRET=dev-secret-change-in-production-12345678901234567
GOOGLE_GEMINI_API_KEY=<get-from-google-ai-studio>
FRONTEND_URL=http://localhost:3000
```

### Get Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Copy the key and paste it into your `.env`

## Step 3: Frontend Setup

### Install Node Dependencies

```bash
cd frontend
npm install
```

### Set Up Frontend Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
AUTH_SECRET=dev-secret-change-in-production-12345678901234567
AUTH_GOOGLE_ID=<get-from-google-oauth>
AUTH_GOOGLE_SECRET=<get-from-google-oauth>
AUTH_URL=http://localhost:3000
```

**Important**: `AUTH_SECRET` must match `NEXTAUTH_SECRET` in backend `.env`.

### Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable **Google+ API**:
   - Click **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click **Enable**
4. Create OAuth Consent Screen:
   - Click **APIs & Services** → **Consent Screen**
   - Select **External** → **Create**
   - Fill in app name: "Statement Analyzer"
   - Add your email as test user
   - **Save & Continue** through all steps
5. Create OAuth Credentials:
   - Click **Credentials** → **+ Create Credentials** → **OAuth client ID**
   - Select **Web application**
   - Add Authorized JavaScript origins: `http://localhost:3000`
   - Add Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Click **Create**
   - Copy **Client ID** and **Client Secret**
   - Paste into `frontend/.env.local`

## Step 4: Run Local Services

### Terminal 1: Run Backend API

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### Terminal 2: Run Frontend

```bash
cd frontend
npm run dev
```

You should see:
```
  ▲ Next.js 16
  ▸ Local:        http://localhost:3000
```

## Step 5: Test the App

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **Sign in with Google**
3. You should see the dashboard after login
4. Try uploading a test statement:
   - Go to **Upload** page
   - Create a test account first (if needed - add via API):
     ```bash
     curl -X POST http://localhost:8000/accounts \
       -H "Content-Type: application/json" \
       -H "X-User-Email: your-email@gmail.com" \
       -d '{"name":"Test Account","account_type":"checking"}'
     ```
   - Upload a PDF or CSV statement
   - Review the parsed transactions
   - Click confirm to save

## Troubleshooting

### "Connection refused" on database
- Ensure PostgreSQL is running: `brew services start postgresql` (macOS)
- Check credentials in `DATABASE_URL`

### "Google OAuth: Redirect URI mismatch"
- Verify `AUTH_URL` in frontend `.env.local` matches your redirect URI
- Ensure `localhost:3000` is whitelisted in Google Cloud Console

### "API returns 401 Unauthorized"
- Check `X-User-Email` header is being sent (browser DevTools → Network tab)
- Ensure `AUTH_SECRET` matches between frontend and backend

### Gemini API errors
- Verify API key is correct in `GOOGLE_GEMINI_API_KEY`
- Check you have API key (not OAuth credentials)
- Check quota on [Google AI Studio](https://aistudio.google.com/app/apikey)

## Reset Everything

If you need a fresh start:

```bash
# Reset database
dropdb statement_analyzer
createdb statement_analyzer
cd backend && alembic upgrade head

# Clear frontend cache
cd frontend && rm -rf .next
```

## Next Steps (Optional)

- Add account management UI (currently available via API only)
- Deploy to Vercel + Railway + Neon
- Add test suites
- Implement production JWT token handling
