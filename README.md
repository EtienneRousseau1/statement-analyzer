# Statement Analyzer

A personal finance app that turns bank and credit card statements (PDF or CSV) into categorized, searchable transactions — with a dashboard, spending breakdowns, and budgets.

**Live site: [statementanalyzer.vercel.app](https://statementanalyzer.vercel.app)**

Sign in with Google to try it.

## What it does

- **Upload a statement** (PDF or CSV, checking/savings/credit card) and it's parsed automatically — no manual data entry.
- **Auto-categorized transactions** — Food & Dining, Shopping, Transport, Entertainment, Utilities, Health, Travel, Subscriptions, Rent, Income, Other.
- **Dashboard** — monthly spending by category, income vs. spending trend, category drill-down.
- **Budgets** — set a monthly limit per category and track progress against it.
- **Multiple accounts** — track several checking/savings/credit card accounts separately, with duplicate-statement detection.

## How it was built

**Frontend**: Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind, with shadcn/base-ui components and Recharts for charts. Auth via next-auth v5 with Google OAuth. Deployed on Vercel.

**Backend**: FastAPI (Python) + SQLAlchemy + Alembic migrations, on Postgres (hosted on [Neon](https://neon.tech)). Deployed on Fly.io.

**Statement parsing**: PDFs/CSVs are extracted server-side (`pdfplumber`/`pandas`) and handed to Gemini (via Vertex AI) with a structured prompt to extract dates, amounts, merchants, and categories as JSON. Includes prompt-injection sanitization on extracted text, section-boundary detection to skip summaries/balances, and chunking for long statements.

**Auth model**: the frontend mints a short-lived signed token (shared HMAC secret) after Google sign-in; the backend verifies that token on every request rather than trusting any client-supplied identity — see `backend/app/middleware/auth.py`.

Full deployment write-up (infra choices, cost breakdown, how each piece is wired together) lives in a local `DEPLOY.md` that's intentionally gitignored — it references live infra endpoints that don't need to be public.

## How to use it

1. Visit [statementanalyzer.vercel.app](https://statementanalyzer.vercel.app) and sign in with Google.
2. **Add an account** — give it a name (e.g. "Chase Sapphire"), pick a type (checking/savings/credit card), optionally add the institution and last 4 digits.
3. **Upload a statement** — drag in a PDF or CSV from that account. Pick whether it's a bank account or credit card statement (parsing rules differ slightly — e.g. which transactions count as income vs. a transfer).
4. **Review the preview** — parsed transactions are shown before anything is saved; confirm to commit them.
5. **Check the dashboard** — see spending by category for the month, the income/spending trend, and click any category to see its underlying transactions.
6. **Set budgets** — go to Budgets, pick a category and a monthly limit; the dashboard tracks progress against it.
7. **Manage transactions** — browse, re-categorize, or delete individual transactions from the Transactions page.

## Local development

See `LOCAL_SETUP.md` for running the full stack locally (Postgres, FastAPI backend, Next.js frontend) — takes about 10 minutes with Docker.

## Project structure

```
backend/    FastAPI app, SQLAlchemy models, Alembic migrations, statement parsing
frontend/   Next.js app (App Router), UI components, auth
```
