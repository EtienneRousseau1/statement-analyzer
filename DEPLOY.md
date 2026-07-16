# Deploying Statement Analyzer

Stack: **Vercel** (frontend) + **Fly.io** (backend) + **Neon** (Postgres).
Estimated cost: **$0–5/month** (Vercel Hobby free, Neon free tier, Fly small VM
~$2–4/mo or $0 with scale-to-zero) plus Gemini API usage (~cents per statement
parsed).

## Current status

| Step | Status |
|---|---|
| 1. Neon DB | ✅ done — migrated, tables verified |
| 2. GCP service account | ✅ done — verified with a real Gemini call |
| 3. Fly backend | ✅ live at https://statement-analyzer-api.fly.dev |
| 4. Vercel frontend | ✅ live at https://frontend-iota-lac-79.vercel.app |
| Google OAuth redirect URI | ⏳ **pending** — sign-in won't work until this is added (see step 4) |
| 6. Smoke test | ⏳ pending on the OAuth step above |

Do these roughly in order — later steps need values produced by earlier ones.

## 1. Database: Neon

**Status: done.** The project's already created, and `alembic upgrade head`
has been run against it — `accounts`, `users`, `transactions`, `budgets`,
`statements`, and `alembic_version` all exist. Nothing left to do here except
keep the connection string for the Fly step below.

1. Create a free project at https://neon.tech.
2. Neon creates a default database named `neondb` — there's no need to
   create one called `statement_analyzer`; the app doesn't care what the
   database is named, it just uses whatever's in `DATABASE_URL`.
3. Copy the **direct** connection string from the Neon dashboard — the one
   *without* `-pooler` in the hostname. It looks like:
   ```
   postgresql://neondb_owner:<password>@ep-xxxx-xxxx.<region>.aws.neon.tech/neondb?sslmode=require
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
   postgresql+psycopg://neondb_owner:<password>@ep-xxxx-xxxx.<region>.aws.neon.tech/neondb?sslmode=require
   ```
   Save this — it's your production `DATABASE_URL`. Treat it as a secret:
   don't commit it anywhere. It only needs to live in two places — Fly
   secrets (step 3) and, optionally, `backend/.env.local` (gitignored) if
   you want to point local dev at the real Neon DB instead of the Docker
   Postgres.

## 2. Gemini auth: GCP service account

**Status: done.** Service account `statement-analyzer-backend` was created
with the `Vertex AI User` role and verified with a real Gemini call through
Vertex before being wired in.

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

**Status: done, live at https://statement-analyzer-api.fly.dev** (`/health`
returns `{"status":"ok"}`). One thing worth knowing for future deploys: Fly
launches **2 machines by default** on a fresh app for high availability, even
with `min_machines_running = 0` in `fly.toml` — that setting controls the
*idle floor*, not the initial machine count. For a personal app that's
unnecessary (idle cost is $0 either way since both scale to zero, but 2
machines means up to 2x compute cost during simultaneous traffic). After the
first deploy, scale down once:
```bash
fly scale count 1 --app statement-analyzer-api --yes
```
Fly also required a credit card on file before creating any app at all (their
free tier was removed) — note that **Fly has no spending cap or billing
alert feature**; the scale-to-zero config keeps realistic cost low but
doesn't hard-limit it. If you want a hard ceiling, set a spending alert on
the card itself, since Fly doesn't offer one.

Also note: `flyctl` versions before ~0.4.x don't understand the current
`fly.toml` schema (e.g. `auto_stop_machines` as a string) and will throw a
config validation warning — run `brew upgrade flyctl` (or equivalent) if you
hit that.

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
  DATABASE_URL="postgresql+psycopg://neondb_owner:<password>@ep-xxxx-xxxx.<region>.aws.neon.tech/neondb?sslmode=require" \
  NEXTAUTH_SECRET="$(openssl rand -hex 32)" \
  GOOGLE_CLOUD_PROJECT="your-gcp-project-id" \
  GOOGLE_APPLICATION_CREDENTIALS_JSON='<paste the minified JSON from step 2>' \
  FRONTEND_URL="https://your-app.vercel.app"
```
(`FRONTEND_URL` is a placeholder until step 4 gives you a real Vercel domain —
CORS will reject the frontend until you update it with `fly secrets set
FRONTEND_URL="https://<your-real-domain>" --app statement-analyzer-api`.
`fly secrets set` automatically restarts the machine to pick up the new
value — no separate `fly deploy` needed.)

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

**Status: deployed, live at https://frontend-iota-lac-79.vercel.app.**
Pending: adding the redirect URI below (Google sign-in won't work until
that's done — everything else is live).

Deployed via the Vercel CLI rather than the dashboard "Import" flow (works
identically, just scriptable — useful since this is a monorepo where the
dashboard import needs manual Root Directory configuration anyway):

```bash
cd frontend
npx vercel login       # opens a browser to authenticate
npx vercel link --yes  # creates/links the Vercel project
```

Add production environment variables (never printed to a terminal you don't
control — pull values from `frontend/.env.local` / the Fly secret you
already set rather than retyping them):
```bash
printf "%s" "https://statement-analyzer-api.fly.dev" | npx vercel env add NEXT_PUBLIC_API_URL production
printf "%s" "<same value as NEXTAUTH_SECRET set in Fly secrets>" | npx vercel env add AUTH_SECRET production
printf "%s" "<your Google OAuth client ID>" | npx vercel env add AUTH_GOOGLE_ID production
printf "%s" "<your Google OAuth client secret>" | npx vercel env add AUTH_GOOGLE_SECRET production
```
`AUTH_SECRET` and the backend's `NEXTAUTH_SECRET` **must be the identical
value** — they sign/verify the same session. Don't generate a fresh one here;
reuse exactly what's in the Fly secret.

`AUTH_URL` is intentionally not set — next-auth v5 infers the host from the
request and auto-trusts it when it detects the `VERCEL` env var (Vercel sets
this for you). Only add `AUTH_URL` if you later put a custom domain or
reverse proxy in front of the app.

Deploy to production:
```bash
npx vercel --prod --yes
```

**Note**: `next build` type-checks strictly, unlike `next dev` — if this is
the first production build, watch for TypeScript errors that dev mode never
surfaced. (This repo had three: `Select`'s `onValueChange` passes
`string | null`, but a few call sites wired it straight into
`Dispatch<SetStateAction<string>>` setters, which reject `null`. Fixed with
an `(v) => v && setX(v)` guard, matching the pattern already used elsewhere
in the codebase — `AccountManager.tsx`, `AccountSetup.tsx`,
`RecentUploads.tsx`.)

After deploying, update the backend's CORS allowlist to the real domain
(`fly secrets set` restarts the machine automatically, no redeploy needed):
```bash
fly secrets set FRONTEND_URL="https://<your-real-domain>.vercel.app" --app statement-analyzer-api
```

### Update Google OAuth redirect URI
Back in GCP Console → **APIs & Services** → **Credentials** → your OAuth
client:
- Add authorized JavaScript origin: `https://<your-real-domain>.vercel.app`
- Add authorized redirect URI:
  `https://<your-real-domain>.vercel.app/api/auth/callback/google`

(Keep the `localhost:3000` entries too — you'll still want local dev to work.)

This step can't be scripted via `gcloud` — Google doesn't expose OAuth
client redirect URIs through any CLI, only the Console UI.

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
