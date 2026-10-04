import asyncio
import os
import sys
import logging

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import engine, init_db
from backend.migrations import run_migrations, apply_telemetry_retention_policy
from backend.seed_data import seed_database

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("PXT-DB-Provisioner")

async def main():
    logger.info("Starting automated database provisioning for PXT Smart Infrastructure...")
    logger.info(f"Target Database Engine: {engine.url.drivername}")
    try:
        await run_migrations()
        await seed_database()
        await apply_telemetry_retention_policy(30)
        logger.info("Database provisioning, migrations, and seeding completed successfully!")
    except Exception as e:
        logger.error(f"Database provisioning encountered an error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
