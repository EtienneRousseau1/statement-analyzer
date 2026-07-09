from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings


engine = create_engine(
    settings.database_url,
    # Neon (and most serverless/pooled Postgres) can silently drop idle
    # connections; pre_ping avoids "server closed the connection
    # unexpectedly" errors, and recycle keeps the pool from holding
    # connections past Neon's own idle timeout.
    pool_pre_ping=True,
    pool_recycle=300,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
