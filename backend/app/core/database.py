import os
import duckdb
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

# --- SQLITE DATABASE SETUP ---
# Clean database URL to handle absolute/relative paths on Windows
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:///"):
    # Ensure database directory exists
    db_file = db_url.replace("sqlite:///", "")
    if os.environ.get("VERCEL"):
        # Serverless environments are read-only; use /tmp directory
        db_file = os.path.join("/tmp", "backend.db")
        db_url = f"sqlite:///{db_file}"
    elif db_file and not os.path.isabs(db_file):
        # Anchor relative to backend root
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_file = os.path.join(backend_dir, db_file)
        db_url = f"sqlite:///{db_file}"

engine = create_engine(db_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Context manager generator for SQLite DB sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- DUCKDB CONNECTION HELPER ---
def get_duckdb_conn():
    """Opens a connection to an in-memory DuckDB database for thread-safe concurrent analytical queries."""
    return duckdb.connect(":memory:")
