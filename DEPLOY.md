# Deploying Statement Analyzer

Stack: **Vercel** (frontend) + **Fly.io** (backend) + **Neon** (Postgres).
Estimated cost: **$0–5/month** (Vercel Hobby free, Neon free tier, Fly small VM
~$2–4/mo or $0 with scale-to-zero) plus Gemini API usage (~cents per statement
parsed).

Do these roughly in order — later steps need values produced by earlier ones.

## 1. Database: Neon

1. Create a free project at https://neon.tech.
2. Create a database named `statement_analyzer` (or use the default one Neon
   creates).
3. Copy the **direct** connection string from the Neon dashboard — the one
   *without* `-pooler` in the hostname. It looks like:
   ```
   postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/statement_analyzer?sslmode=require
   ```
   Use the direct string, not the pooled one, even though Neon's UI often
   surfaces the pooled string first. Reason: Neon's pooled endpoint runs
   PgBouncer in transaction mode, which doesn't preserve session state —
   Alembic's migrations (run automatically on every `fly deploy`, see below)
   need that session state and can fail intermittently against it. The
   pooled endpoint exists to let many short-lived serverless connections
   share a small pool; this app is a single, persistent Fly machine using
   SQLAlchemy's own connection pool, so it doesn't need PgBouncer on top —
   the direct connection is both simpler and more correct here.
4. Convert it to the SQLAlchemy/psycopg form the app expects (swap the
   scheme, keep everything else):
   ```
   postgresql+psycopg://user:password@ep-xxxx.us-east-1.aws.neon.tech/statement_analyzer?sslmode=require
   ```
   Save this — it's your production `DATABASE_URL`.

## 2. Gemini auth: GCP service account

The app talks to Gemini through Vertex AI. Locally it uses your personal
`gcloud auth application-default login` session — that doesn't exist in a
hosted container, so production needs a service account key instead.

1. In the [GCP Console](https://console.cloud.google.com) → **IAM & Admin** →
   **Service Accounts** → **Create Service Account**.
   - Name: `statement-analyzer-backend`.
   - Grant it the **Vertex AI User** role (`roles/aiplatform.user`).
2. Open the new service account → **Keys** → **Add Key** → **Create new key**
   → JSON. This downloads a `.json` file — treat it as a secret, don't commit
   it.
3. Confirm `aiplatform.googleapis.com` is enabled on the project (**APIs &
   Services** → **Enabled APIs**; enable it if missing).
4. Minify the JSON to one line (needed for pasting into an env var):
   ```bash
   python3 -c "import json;print(json.dumps(json.load(open('/path/to/key.json'))))"
   ```
   Save the output — it's your `GOOGLE_APPLICATION_CREDENTIALS_JSON` value.

This works without any further code changes: `backend/app/config.py` writes
that JSON to a temp file at startup and points
`GOOGLE_APPLICATION_CREDENTIALS` at it, which `google-genai`'s Vertex client
picks up automatically via standard Google auth credential discovery.

## 3. Backend: Fly.io

Install the CLI and log in:
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

First, edit `app = "statement-analyzer-api"` in `backend/fly.toml` to a name
that's globally unique on Fly (all app names share one namespace).

From the `backend/` directory, register the app (this just reserves the name
and creates the app shell — it does not deploy anything or prompt you to
attach a Fly Postgres, so there's no risk of accidentally provisioning a
database you don't want):
```bash
cd backend
fly apps create statement-analyzer-api   # use the same name as in fly.toml
```

Set secrets (never put these in `fly.toml`, which can end up in git):
```bash
fly secrets set \
  DATABASE_URL="postgresql+psycopg://user:password@ep-xxxx.us-east-1.aws.neon.tech/statement_analyzer?sslmode=require" \
  NEXTAUTH_SECRET="$(openssl rand -hex 32)" \
  GOOGLE_CLOUD_PROJECT="your-gcp-project-id" \
  GOOGLE_APPLICATION_CREDENTIALS_JSON='<paste the minified JSON from step 2>' \
  FRONTEND_URL="https://your-app.vercel.app"
```

Deploy:
```bash
fly deploy
```

`fly.toml` runs `alembic upgrade head` before starting Uvicorn on every
deploy, so schema migrations apply automatically — no manual migration step.

Verify:
```bash
curl https://statement-analyzer-api.fly.dev/health
# {"status":"ok"}
```

**Cost note**: `fly.toml` sets `min_machines_running = 0`, so the machine
suspends when idle and restarts on the next request (a few seconds of cold
start) — this is what gets you close to $0/month for low personal traffic.
Neon's free tier also autosuspends its compute after 5 minutes idle, so the
very first request after a period of inactivity can be slower still (Fly
cold start + Neon resume, stacked) — still just seconds, not a functional
problem, just worth expecting rather than mistaking for a bug. If cold
starts bother you, set `min_machines_running = 1` in `fly.toml`; expect
~$2–4/month for the smallest VM running continuously (Neon will still
autosuspend independently unless you're on a paid plan).

## 4. Frontend: Vercel

1. Import the repo at https://vercel.com/new.
2. **Root Directory**: set to `frontend` (this is a monorepo — Vercel needs
   to know where the Next.js app lives). `frontend/vercel.json` handles the
   rest (framework detection, build command, basic security headers).
3. Add environment variables (Project Settings → Environment Variables):
   ```
   NEXT_PUBLIC_API_URL=https://statement-analyzer-api.fly.dev
   AUTH_SECRET=<same value as NEXTAUTH_SECRET set in Fly secrets>
   AUTH_GOOGLE_ID=<your Google OAuth client ID>
   AUTH_GOOGLE_SECRET=<your Google OAuth client secret>
   ```
   `AUTH_SECRET` and the backend's `NEXTAUTH_SECRET` **must match** — they
   sign/verify the same session.

   `AUTH_URL` is optional on Vercel — next-auth v5 infers the host from the
   request and auto-trusts it when it detects the `VERCEL` env var (which
   Vercel sets for you). Only add `AUTH_URL` explicitly if you later put a
   custom domain or reverse proxy in front of the app.
4. Deploy.

### Update Google OAuth redirect URI
Back in GCP Console → **APIs & Services** → **Credentials** → your OAuth
client:
- Add authorized JavaScript origin: `https://your-app.vercel.app`
- Add authorized redirect URI:
  `https://your-app.vercel.app/api/auth/callback/google`

(Keep the `localhost:3000` entries too — you'll still want local dev to work.)

## 5. CORS

The backend only allows requests from `settings.frontend_url`
(`backend/app/main.py`). Make sure the `FRONTEND_URL` secret set in the
Fly.io section above exactly matches your Vercel domain (including
`https://`, no trailing slash), or the browser will get CORS errors calling
the API.

## 6. Smoke test production

1. Visit your Vercel URL, sign in with Google.
2. Create an account via the UI (Accounts page).
3. Upload a test statement and confirm parsed transactions save.
4. Check `fly logs` if anything 500s — most first-deploy issues are a
   mismatched `DATABASE_URL`, `FRONTEND_URL`, or a missing/expired service
   account JSON.

## Ongoing costs to watch

| Item | Free tier limit | What happens past it |
|---|---|---|
| Vercel Hobby | 100GB bandwidth/mo | Soft-blocked, upgrade prompt (~$20/mo Pro) |
| Neon free | 0.5GB storage, autosuspend after 5 min idle | Upgrade prompt (~$19/mo) — a personal finance app's data is tiny, unlikely to hit this |
| Fly.io | No free tier anymore (removed 2024) | Billed per-second for VM + minimal bandwidth; scale-to-zero keeps this to a couple dollars/month |
| Gemini (Vertex) | Pay-per-token | Flash-lite is cheap; a handful of statement uploads/month should be well under $1 |
