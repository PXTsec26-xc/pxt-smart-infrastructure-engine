import os
import sys
from urllib.parse import urlparse, parse_qs, urlencode
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(ROOT_DIR, "pxt_iot.db")

raw_db_url = os.getenv("DATABASE_URL", "").strip()

if not raw_db_url:
    # If running in Vercel serverless environment without configured DB, use /tmp
    if os.getenv("VERCEL") == "1":
        DATABASE_URL = "sqlite+aiosqlite:////tmp/pxt_iot.db"
    else:
        DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"
else:
    # Normalize PostgreSQL URL for asyncpg
    clean_url = raw_db_url
    if clean_url.startswith("postgres://"):
        clean_url = clean_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif clean_url.startswith("postgresql://") and not clean_url.startswith("postgresql+asyncpg://"):
        clean_url = clean_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Strip sslmode parameter from query string as asyncpg expects connect_args instead
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
    DATABASE_URL = parsed._replace(query=new_query).geturl()

# Configure engine arguments based on database dialect
if "sqlite" in DATABASE_URL:
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL / Neon configuration with connection pooling for serverless execution
    connect_args = {}
    if needs_ssl or "neon.tech" in DATABASE_URL or "aws.neon" in DATABASE_URL:
        connect_args["ssl"] = "require"
    
    # If connecting to Neon connection pooler (PgBouncer), disable prepared statement caching
    if "-pooler" in DATABASE_URL:
        connect_args["statement_cache_size"] = 0

    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=300,
        connect_args=connect_args
    )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
