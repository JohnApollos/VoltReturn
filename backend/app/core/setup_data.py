import os
import logging
from backend.app.core.init_db import init_db
from backend.app.core.database import SessionLocal
from backend.app.modules.rider.simulation import generate_rider_loans
from backend.app.modules.fleet.simulation import generate_fleet_telemetry
from backend.app.modules.rider.service import RiderIntelligenceService

logger = logging.getLogger(__name__)

def main():
    logging.basicConfig(level=logging.INFO)
    logger.info("Starting VoltReturn data initialization and seeding...")
    
    # 1. Initialize SQLite database schemas
    logger.info("Initializing SQLite database tables...")
    init_db()
    
    # 2. Generate simulated datasets
    logger.info("Simulating rider borrower profiles...")
    generate_rider_loans(output_path="data/rider_loans.csv", fleet_size=1000)
    
    logger.info("Simulating battery high-frequency telemetry...")
    generate_fleet_telemetry(output_path="data/battery_telemetry.parquet", num_batteries=50, records_per_battery=100)
    
    # 3. Train models and write parameters to Model Governance audit trail
    logger.info("Fitting default and churn models to seed Model Governance parameters...")
    db = SessionLocal()
    try:
        service = RiderIntelligenceService()
        results = service.train_models(db)
        logger.info("Successfully trained models: %s", results)
        logger.info("VoltReturn database seeding complete!")
    except Exception as e:
        logger.error("Failed to seed and train baseline models: %s", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
