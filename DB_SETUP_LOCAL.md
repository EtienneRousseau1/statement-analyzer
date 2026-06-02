# Local Database Setup

## Prerequisites
- PostgreSQL 16+ installed and running
- psql CLI available

## Steps

### 1. Create Database
```bash
createdb statement_analyzer
```

If you prefer Docker (PostgreSQL 16):

```bash
docker rm -f statement-analyzer-postgres 2>/dev/null || true
docker run --name statement-analyzer-postgres \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=statement_analyzer \
        -p 5432:5432 \
        -d postgres:16
```

If `5432` is already in use, run on `5433` instead:

```bash
docker rm -f statement-analyzer-postgres 2>/dev/null || true
docker run --name statement-analyzer-postgres \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=statement_analyzer \
        -p 5433:5432 \
        -d postgres:16
```

Then set `DATABASE_URL` accordingly:

```bash
# if mapped to 5432
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/statement_analyzer

# if mapped to 5433
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5433/statement_analyzer
```

### 2. Verify Connection
```bash
psql -U postgres -d statement_analyzer -c "SELECT 1"
```

If it works, you'll see:
```
 ?column?
----------
        1
(1 row)
```

### 3. Apply Initial Migration
From `backend/` directory:

```bash
# Apply migration
alembic upgrade head
```

### 4. Verify Schema Created
```bash
psql -U postgres -d statement_analyzer -c "\dt"
```

You should see tables: `users`, `accounts`, `transactions`, `budgets`, `statements`.

## Connection Troubleshooting

If you get a connection error, check:
1. PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
2. Default user is `postgres`
3. Update `DATABASE_URL` in `.env.local` if using non-default credentials or port `5433`

## Reset Database (if needed)
```bash
dropdb statement_analyzer
createdb statement_analyzer
alembic upgrade head
```
