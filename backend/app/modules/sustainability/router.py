from fastapi import APIRouter, Query, HTTPException
from backend.app.modules.sustainability.service import SustainabilityService

router = APIRouter(prefix="/sustainability", tags=["Sustainability Intelligence"])

@router.get("/metrics")
def get_sustainability_metrics(
    fleet_size: int = Query(1000, ge=1, le=50000),
    avg_daily_km: float = Query(80.0, ge=10.0, le=250.0),
    carbon_price_usd: float = Query(20.0, ge=1.0, le=100.0),
    use_fossil_grid: bool = Query(False)
):
    """Computes CO2 displacement, petrol liters avoided, and trees equivalent under Verra standards."""
    try:
        metrics = SustainabilityService.calculate_displacement(
            fleet_size=fleet_size,
            avg_daily_km=avg_daily_km,
            carbon_price_usd_ton=carbon_price_usd,
            use_fossil_grid=use_fossil_grid
        )
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate ESG metrics: {str(e)}")
