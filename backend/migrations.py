import asyncio
import os
import sys
import time
import logging
from sqlalchemy import text
from backend.database import engine, Base, AsyncSessionLocal
from backend.models import SystemConfigORM

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("PXT-DatabaseMigrations")

_migrations_ran = False

async def run_migrations():
    global _migrations_ran
    if _migrations_ran:
        return
    logger.info("Running PXT Database Migrations & Schema Verification...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Check and add hardware_mode column to devices table if missing
        try:
            await conn.execute(text("ALTER TABLE devices ADD COLUMN hardware_mode VARCHAR DEFAULT 'VIRTUAL_SIMULATOR'"))
            logger.info("Migrated schema: Added 'hardware_mode' column to devices table.")
        except Exception:
            pass # Column already exists

        # Check and add resolved column to alerts table if missing
        try:
            await conn.execute(text("ALTER TABLE alerts ADD COLUMN resolved BOOLEAN DEFAULT FALSE"))
            logger.info("Migrated schema: Added 'resolved' column to alerts table.")
        except Exception:
            pass

    async with AsyncSessionLocal() as session:
        # Verify migration version key
        try:
            res = await session.execute(text("SELECT key FROM system_config WHERE key = 'schema_version'"))
            if not res.scalar_one_or_none():
                session.add(SystemConfigORM(key="schema_version", value="1.2.0"))
                await session.commit()
        except Exception as e:
            logger.warning(f"Notice verifying schema_version: {e}")

    _migrations_ran = True
    logger.info("PXT Database Migrations Completed Successfully.")

async def apply_telemetry_retention_policy(retention_days: int = 30):
    """
    Deletes telemetry records older than retention_days to maintain optimal SQLite database performance.
    """
    logger.info(f"Executing Telemetry Data Retention Cleanup (Purging records older than {retention_days} days)...")
    cutoff_timestamp = time.time() - (retention_days * 86400)
    async with engine.begin() as conn:
        res = await conn.execute(text("DELETE FROM telemetry WHERE timestamp < :cutoff"), {"cutoff": cutoff_timestamp})
        logger.info(f"Telemetry retention policy executed. Deleted {res.rowcount} expired telemetry records.")

if __name__ == "__main__":
    asyncio.run(run_migrations())
    asyncio.run(apply_telemetry_retention_policy(30))
