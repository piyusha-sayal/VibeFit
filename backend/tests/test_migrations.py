"""The alembic chain must actually run.

Regression test for a real outage: 0001_baseline called
Base.metadata.create_all() with no table filter, so it created whatever the
models defined *at that moment* — including the four tables 0002 owns. Once
0002 was written, `alembic upgrade head` always died with DuplicateTableError.
Nothing caught it because conftest builds schema with create_all() directly and
never invokes alembic, so the chain was first exercised against a real database
at deploy time.

These tests are deliberately synchronous: alembic's env.py calls asyncio.run(),
which raises if a loop is already running under pytest-asyncio.
"""
import asyncio
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from core.config import settings

BACKEND_DIR = Path(__file__).resolve().parent.parent

EXPECTED_TABLES = {
    "users", "analyses", "recommendations", "chat_sessions", "chat_messages",
    "onboarding_responses", "profile_corrections", "plan_actions", "action_feedback",
}


def _config(db_path: Path) -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    return cfg


@pytest.fixture
def scratch_db(tmp_path, monkeypatch):
    """Point env.py at a throwaway SQLite file instead of the real database.

    alembic's env.py calls asyncio.run(), which closes the loop it creates and
    leaves no current event loop behind. That would poison every async test that
    runs after this module, so the session's loop is restored on teardown.
    """
    db_file = tmp_path / "migrations.db"
    monkeypatch.setattr(settings, "database_url", f"sqlite+aiosqlite:///{db_file}")

    try:
        previous_loop = asyncio.get_event_loop_policy().get_event_loop()
    except RuntimeError:
        previous_loop = None

    yield db_file

    if previous_loop is not None and not previous_loop.is_closed():
        asyncio.set_event_loop(previous_loop)


def test_upgrade_head_creates_every_table(scratch_db):
    command.upgrade(_config(scratch_db), "head")

    engine = create_engine(f"sqlite:///{scratch_db}")
    try:
        tables = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()

    missing = EXPECTED_TABLES - tables
    assert not missing, f"migration did not create: {sorted(missing)}"
    assert "alembic_version" in tables


def test_upgrade_then_downgrade_is_reversible(scratch_db):
    cfg = _config(scratch_db)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")

    engine = create_engine(f"sqlite:///{scratch_db}")
    try:
        tables = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()

    leftover = EXPECTED_TABLES & tables
    assert not leftover, f"downgrade left tables behind: {sorted(leftover)}"


def test_baseline_revision_does_not_own_later_tables():
    """0001 must stay a frozen snapshot. If someone adds a new model and this
    list silently grows again, the next migration breaks exactly as before.
    """
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "baseline_rev", BACKEND_DIR / "alembic" / "versions" / "0001_add_skin_and_quality.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    later_tables = {
        "onboarding_responses", "profile_corrections", "plan_actions", "action_feedback",
    }
    assert not (set(module.BASELINE_TABLES) & later_tables), (
        "0001_baseline must not create tables introduced by later revisions"
    )
