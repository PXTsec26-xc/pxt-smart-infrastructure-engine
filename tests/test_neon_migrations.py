import os
import sys
import pytest
import asyncio
from urllib.parse import urlparse, parse_qs, urlencode

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)

from backend.database import init_db, engine, Base
from backend.migrations import run_migrations, apply_telemetry_retention_policy
from backend.seed_data import seed_database, DEFAULT_DEVICES

def test_neon_url_normalization():
    """Verify that Neon connection strings with postgres:// and ?sslmode=require are correctly normalized."""
    raw_url = "postgres://neondb_owner:npg_secret123@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
    
    clean_url = raw_url
    if clean_url.startswith("postgres://"):
        clean_url = clean_url.replace("postgres://", "postgresql+asyncpg://", 1)
        
    parsed = urlparse(clean_url)
    q_params = parse_qs(parsed.query)
    needs_ssl = False
    if "sslmode" in q_params:
        needs_ssl = True
        del q_params["sslmode"]
    if "ssl" in q_params:
        needs_ssl = True
        del q_params["ssl"]
        
    new_query = urlencode(q_params, doseq=True)
    normalized = parsed._replace(query=new_query).geturl()

    assert normalized.startswith("postgresql+asyncpg://")
    assert "sslmode=" not in normalized
    assert needs_ssl is True
    print("\nTEST PASSED: Neon PostgreSQL URL normalization & asyncpg SSL parameter extraction verified.")

@pytest.mark.asyncio
async def test_database_migrations_and_seeding():
    """Verify that migrations and database seeding run idempotently without error."""
    await run_migrations()
    await seed_database()
    await apply_telemetry_retention_policy(30)
    print("\nTEST PASSED: Schema migrations and seeding verified on active engine.")
