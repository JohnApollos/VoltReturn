from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json

from backend.app.core.database import get_db
from backend.app.modules.reporting.service import BoardMemoGenerator
from backend.app.modules.finance.service import FinancialSimulationService
from backend.app.modules.infrastructure.service import NetworkOptimizer
from backend.app.modules.sustainability.service import SustainabilityService

router = APIRouter(prefix="/reports", tags=["Reporting Intelligence"])

@router.get("/board-memo")
def download_board_memo(
    budget_kes: float = Query(100000000.0),
    num_stations: int = Query(12),
    horizon_years: int = Query(5),
    risk_appetite: str = Query("medium"),
    tariff_type: str = Query("mixed"),
    default_rate_pct: float = Query(4.90),
    db: Session = Depends(get_db)
):
    """Generates and streams a custom 5-page PDF board investment memo.
    
    Ties together spatial recommendations, cash flows, and sustainability metrics.
    """
    try:
        # 1. Run Financial DCF Simulation
        dcf_data = FinancialSimulationService.run_dcf(
            budget_kes=budget_kes,
            num_stations=num_stations,
            horizon_years=horizon_years,
            risk_appetite=risk_appetite,
            tariff_type=tariff_type,
            default_rate_pct=default_rate_pct
        )
        
        # 2. Run Spatial Optimizer Recommendations
        opt = NetworkOptimizer()
        opt.load_data(db)
        recs_df = opt.recommend_stations(num_stations, gap_threshold_km=5.0)
        recs_list = recs_df.to_dict(orient="records") if not recs_df.empty else []
        
        # 3. Calculate Sustainability Offsets
        sustainability_data = SustainabilityService.calculate_displacement(
            fleet_size=dcf_data["fleet_size"],
            avg_daily_km=80.0
        )
        
        # 4. Generate PDF buffer
        pdf_buffer = BoardMemoGenerator.generate_pdf(
            dcf_data=dcf_data,
            recs_data=recs_list,
            sustainability_data=sustainability_data,
            scenario_name=f"Budget: KES {budget_kes/1000000:.1f}M / Stations: {num_stations}"
        )
        
        headers = {
            "Content-Disposition": f'attachment; filename="VoltReturn_Board_Investment_Memo.pdf"'
        }
        return StreamingResponse(pdf_buffer, media_type="application/pdf", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate board memo PDF: {str(e)}")
