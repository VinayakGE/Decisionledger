"""Tests for the idempotent SQLite column migration helper."""

from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool


def _make_engine():
    return create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


def _existing_columns(conn, table):
    return {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}


def test_migration_adds_missing_columns():
    """Migration adds all 6 observability columns when they are absent."""
    from app.database import _SCHEMA_ADDITIONS

    test_engine = _make_engine()
    # Create the table WITHOUT the new columns (simulating a pre-PR#4 DB).
    with test_engine.connect() as conn:
        conn.execute(
            text(
                "CREATE TABLE conversation_sources "
                "(id INTEGER PRIMARY KEY, filename VARCHAR, source_type VARCHAR, "
                "uploaded_at DATETIME, raw_path VARCHAR, conversation_count INTEGER)"
            )
        )
        conn.commit()

    # Patch the module-level engine to use our test engine.
    import app.database as db_module

    original = db_module.engine
    db_module.engine = test_engine
    try:
        db_module._migrate_sqlite_columns()
        with test_engine.connect() as conn:
            cols = _existing_columns(conn, "conversation_sources")
    finally:
        db_module.engine = original

    for _, column, _ in _SCHEMA_ADDITIONS:
        assert column in cols, f"Expected column '{column}' to be added"


def test_migration_is_idempotent():
    """Running migration twice does not raise or create duplicate columns."""
    import app.database as db_module

    test_engine = _make_engine()
    with test_engine.connect() as conn:
        conn.execute(
            text(
                "CREATE TABLE conversation_sources "
                "(id INTEGER PRIMARY KEY, filename VARCHAR, source_type VARCHAR, "
                "uploaded_at DATETIME, raw_path VARCHAR, conversation_count INTEGER)"
            )
        )
        conn.commit()

    original = db_module.engine
    db_module.engine = test_engine
    try:
        db_module._migrate_sqlite_columns()
        db_module._migrate_sqlite_columns()  # second run must not raise
        with test_engine.connect() as conn:
            cols = _existing_columns(conn, "conversation_sources")
    finally:
        db_module.engine = original

    for _, column, _ in db_module._SCHEMA_ADDITIONS:
        assert column in cols


def test_migration_skips_existing_columns():
    """If columns already exist (fresh DB), migration runs without error."""
    import app.database as db_module
    from app.database import Base
    from app.models import orm  # noqa — register models

    test_engine = _make_engine()
    Base.metadata.create_all(bind=test_engine)  # creates table with all columns

    original = db_module.engine
    db_module.engine = test_engine
    try:
        db_module._migrate_sqlite_columns()  # should be a no-op
        with test_engine.connect() as conn:
            cols = _existing_columns(conn, "conversation_sources")
    finally:
        db_module.engine = original

    for _, column, _ in db_module._SCHEMA_ADDITIONS:
        assert column in cols
