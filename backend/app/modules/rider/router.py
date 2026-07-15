from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.app.core.database import get_db
from backend.app.modules.rider.service import RiderIntelligenceService
from backend.app.modules.rider.simulation import generate_rider_loans

router = APIRouter(prefix="/rider", tags=["Rider Intelligence"])

# Single session-wide instance to preserve fitted scalers
service_instance = RiderIntelligenceService()

@router.get("/portfolio-summary")
def get_portfolio_summary(db: Session = Depends(get_db)):
    """Computes aggregate default and churn metrics across the active cohort."""
    try:
        summary = service_instance.evaluate_portfolio(db)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load portfolio metrics: {str(e)}")


@router.post("/train")
def train_models(db: Session = Depends(get_db)):
    """Fitted models, stores validation metrics, and registers parameters in Model Governance."""
    try:
        results = service_instance.train_models(db)
        return {"status": "success", "metrics": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")


@router.get("/cohort")
def get_cohort():
    """Retrieves coordinates and risk levels of sample riders for dashboard mapping."""
    try:
        cohort = service_instance.get_rider_cohort()
        return cohort
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch rider cohort: {str(e)}")


@router.post("/trigger-simulation")
def trigger_simulation(fleet_size: int = 1000):
    """Generates the simulated rider database with PAYG financial fields."""
    try:
        generate_rider_loans(fleet_size=fleet_size)
        return {"status": "success", "detail": f"Simulated borrower loans dataset for {fleet_size} riders."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
