from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, List

from backend.app.modules.finance.service import FinancialSimulationService

router = APIRouter(prefix="/finance", tags=["Investment Intelligence"])

@router.get("/simulate")
def simulate_investment(
    budget_kes: float = Query(100000000.0, ge=10000000.0, le=500000000.0),
    num_stations: int = Query(12, ge=2, le=50),
    horizon_years: int = Query(5, ge=3, le=10),
    risk_appetite: str = Query("medium"),
    tariff_type: str = Query("mixed"),
    default_rate_pct: float = Query(4.90, ge=0.0, le=50.0)
):
    """Generates five-year financial cash flow projection, NPV, and payback estimates."""
    try:
        results = FinancialSimulationService.run_dcf(
            budget_kes=budget_kes,
            num_stations=num_stations,
            horizon_years=horizon_years,
            risk_appetite=risk_appetite,
            tariff_type=tariff_type,
            default_rate_pct=default_rate_pct
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Financial projection failed: {str(e)}")


@router.get("/monte-carlo")
def run_monte_carlo(
    budget_kes: float = Query(100000000.0, ge=10000000.0, le=500000000.0),
    num_stations: int = Query(12, ge=2, le=50),
    horizon_years: int = Query(5, ge=3, le=10),
    risk_appetite: str = Query("medium"),
    tariff_type: str = Query("mixed"),
    default_rate_pct: float = Query(4.90, ge=0.0, le=50.0),
    simulations: int = Query(1000, ge=100, le=5000)
):
    """Simulates NPV/IRR probability spreads using sampling distributions."""
    try:
        results = FinancialSimulationService.run_monte_carlo(
            budget_kes=budget_kes,
            num_stations=num_stations,
            horizon_years=horizon_years,
            risk_appetite=risk_appetite,
            tariff_type=tariff_type,
            default_rate_pct=default_rate_pct,
            simulations=simulations
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Monte Carlo simulation failed: {str(e)}")


@router.get("/sensitivity")
def get_sensitivity(
    budget_kes: float = Query(100000000.0, ge=10000000.0, le=500000000.0),
    num_stations: int = Query(12, ge=2, le=50),
    horizon_years: int = Query(5, ge=3, le=10),
    risk_appetite: str = Query("medium"),
    tariff_type: str = Query("mixed"),
    default_rate_pct: float = Query(4.90, ge=0.0, le=50.0)
):
    """Computes variables swings to construct horizontal Tornado charts."""
    try:
        results = FinancialSimulationService.get_sensitivity_tornado(
            budget_kes=budget_kes,
            num_stations=num_stations,
            horizon_years=horizon_years,
            risk_appetite=risk_appetite,
            tariff_type=tariff_type,
            default_rate_pct=default_rate_pct
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sensitivity calculation failed: {str(e)}")
