from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.app.core.database import get_db
from backend.app.modules.fleet.service import FleetIntelligenceService
from backend.app.modules.fleet.simulation import generate_fleet_telemetry

router = APIRouter(prefix="/fleet", tags=["Fleet Intelligence"])

@router.get("/summary")
def get_fleet_summary():
    """Scans telemetry files via DuckDB and calculates cohort State of Health (SoH) metrics."""
    try:
        summary = FleetIntelligenceService.get_fleet_summary()
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to compile fleet analytics. Ensure telemetry is simulated. Error: {str(e)}"
        )


@router.get("/battery/{battery_id}")
def get_battery_profile(battery_id: str):
    """Retrieves single-pack historical signal trends and Weibull survival curves."""
    try:
        profile = FleetIntelligenceService.get_battery_profile(battery_id)
        if not profile:
            raise HTTPException(status_code=404, detail=f"Battery {battery_id} not found in fleet telemetry.")
        return profile
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch battery profile: {str(e)}")


@router.post("/trigger-simulation")
def trigger_simulation(num_batteries: int = 50, records: int = 100):
    """Helper utility to generate and write the simulated Parquet telemetry database."""
    try:
        generate_fleet_telemetry(num_batteries=num_batteries, records_per_battery=records)
        return {"status": "success", "detail": f"Simulated {num_batteries} battery profiles with {records} logs each."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

# Pydantic Schemas for Real Telemetry Ingestion
from pydantic import BaseModel, Field
from typing import List

class TelemetryLogInput(BaseModel):
    battery_id: str = Field(..., examples=["BATT-001"])
    vehicle_id: str = Field(..., examples=["VEH-102"])
    timestamp: str = Field(..., examples=["2026-07-16T12:00:00Z"])
    soh: float = Field(..., ge=0.0, le=100.0, examples=[98.5])
    soc: float = Field(..., ge=0.0, le=100.0, examples=[85.0])
    cycle_count: int = Field(..., ge=0, examples=[150])
    temperature: float = Field(..., examples=[32.5])

class TelemetryIngestRequest(BaseModel):
    records: List[TelemetryLogInput]

@router.post("/ingest")
def ingest_telemetry_batch(
    payload: TelemetryIngestRequest,
    db: Session = Depends(get_db)
):
    """Ingests external real battery telemetry records, validates types/limits, and appends to Parquet database."""
    try:
        raw_records = [record.model_dump() for record in payload.records]
        result = FleetIntelligenceService.ingest_telemetry(raw_records, db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Telemetry ingestion failed: {str(e)}"
        )
