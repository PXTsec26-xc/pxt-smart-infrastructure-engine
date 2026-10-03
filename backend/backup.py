import os
import shutil
import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("PXT-DatabaseBackup")

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(ROOT_DIR, "pxt_iot.db")
BACKUP_DIR = os.path.join(ROOT_DIR, "backups")

def create_database_backup() -> str:
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR, exist_ok=True)

    if not os.path.exists(DB_PATH):
        logger.warning(f"Database file not found at {DB_PATH}. Backup skipped.")
        return ""

    timestamp_str = time.strftime("%Y%m%d_%H%M%S")
    backup_filename = f"pxt_iot_backup_{timestamp_str}.db"
    dest_path = os.path.join(BACKUP_DIR, backup_filename)

    shutil.copy2(DB_PATH, dest_path)
    logger.info(f"Database backup created successfully: {dest_path}")
    return dest_path

if __name__ == "__main__":
    create_database_backup()
