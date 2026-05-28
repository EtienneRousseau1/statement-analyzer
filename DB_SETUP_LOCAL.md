# Local Database Setup

## Prerequisites
- PostgreSQL installed and running
- psql CLI available

## Steps

### 1. Create Database
```bash
createdb statement_analyzer
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
3. Update `DATABASE_URL` in `.env` if using non-default credentials

## Reset Database (if needed)
```bash
dropdb statement_analyzer
createdb statement_analyzer
alembic upgrade head
```
