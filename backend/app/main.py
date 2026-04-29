from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import auth, accounts, upload, transactions, budgets, dashboard

app = FastAPI(title="Statement Analyzer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(upload.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
