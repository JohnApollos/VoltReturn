import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.init_db import init_db
from backend.app.modules.infrastructure.router import router as infra_router
from backend.app.modules.rider.router import router as rider_router
from backend.app.modules.fleet.router import router as fleet_router
from backend.app.modules.finance.router import router as finance_router
from backend.app.modules.sustainability.router import router as sustainability_router
from backend.app.modules.ai_assistant.router import router as ai_assistant_router
from backend.app.modules.reporting.router import router as reports_router

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Initialize database schemas on module import
logger.info("Initializing relational SQLite tables on start...")
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs"
)

# Set up CORS middleware to support client-side frontend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development; narrow this down for production if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register sub-routers
app.include_router(infra_router, prefix=settings.API_V1_STR)
app.include_router(rider_router, prefix=settings.API_V1_STR)
app.include_router(fleet_router, prefix=settings.API_V1_STR)
app.include_router(finance_router, prefix=settings.API_V1_STR)
app.include_router(sustainability_router, prefix=settings.API_V1_STR)
app.include_router(ai_assistant_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "api_prefix": settings.API_V1_STR
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
