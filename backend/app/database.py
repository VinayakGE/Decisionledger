from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import orm  # noqa: F401 — registers all models
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite_columns()
    _reset_stuck_pending_sources()


def _reset_stuck_pending_sources():
    """On startup, reset any sources stuck in 'pending' to 'failed'.

    If the server crashed or was killed mid-extraction the background task is
    gone but the source record remains pending forever. This runs once at boot
    so users see a clear 'failed' state instead of infinite spinner.
    """
    from app.models.orm import ConversationSource
    db = SessionLocal()
    try:
        stuck = db.query(ConversationSource).filter(
            ConversationSource.extraction_status == "pending"
        ).all()
        for src in stuck:
            src.extraction_status = "failed"
            src.entities_extracted = src.entities_extracted or 0
        if stuck:
            import logging
            logging.getLogger(__name__).warning(
                "Reset %d stuck 'pending' source(s) to 'failed' on startup.", len(stuck)
            )
        db.commit()
    finally:
        db.close()


# Columns added after initial schema. Each entry: (table, column, sqlite_type).
# Extend this list whenever a new nullable column is added to an existing table.
_SCHEMA_ADDITIONS = [
    ("conversation_sources", "extraction_status",         "VARCHAR"),
    ("conversation_sources", "provider_used",             "VARCHAR"),
    ("conversation_sources", "entities_extracted",        "INTEGER"),
    ("conversation_sources", "extraction_confidence_avg", "FLOAT"),
    ("conversation_sources", "extraction_duration_ms",    "INTEGER"),
    ("conversation_sources", "fallback_chain_json",       "TEXT"),
]


def _migrate_sqlite_columns():
    """Idempotent ALTER TABLE helper for SQLite.

    create_all() creates missing tables but never alters existing ones.
    This adds any new nullable columns so users with an older DB don't need
    to reset. Safe to run on every startup — skips columns that already exist.
    """
    with engine.connect() as conn:
        for table, column, col_type in _SCHEMA_ADDITIONS:
            existing = {
                row[1]
                for row in conn.execute(text(f"PRAGMA table_info({table})"))
            }
            if column not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                conn.commit()
