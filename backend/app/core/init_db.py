import logging
from backend.app.core.database import Base, engine
from backend.app.models import schemas  # Import to register tables

logger = logging.getLogger(__name__)

def init_db() -> None:
    """Creates all SQLite relational metadata tables in the database."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Successfully initialized SQLite databases and tables.")
    except Exception as e:
        logger.error("Failed to initialize SQLite database: %s", e)
        raise e

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
