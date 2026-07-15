import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.modules.infrastructure.service import NetworkOptimizer
from backend.app.models.schemas import Recommendation

router = APIRouter(prefix="/infrastructure", tags=["Infrastructure Intelligence"])

class ProposedStationInput(BaseModel):
    latitude: float
    longitude: float
    subcounty: str

class ExpansionImpactRequest(BaseModel):
    proposed_stations: List[ProposedStationInput]


@router.get("/recommend", response_model=List[Dict[str, Any]])
def get_recommendations(
    n_stations: int = Query(10, ge=1, le=50),
    gap_threshold_km: float = Query(5.0, ge=1.0, le=20.0),
    db: Session = Depends(get_db)
):
    """Calculates and ranks optimal BSS placements using sample-weighted K-Means.
    
    Logs proposed actions to the Recommendations Ledger.
    """
    try:
        opt = NetworkOptimizer()
        opt.load_data(db)
        recs_df = opt.recommend_stations(n_stations, gap_threshold_km)
        
        if recs_df.empty:
            return []
            
        recs_list = recs_df.to_dict(orient="records")
        
        # Log to SQLite Recommendations Ledger
        for rec in recs_list:
            # Check if this action is already logged
            action = f"Deploy BSS at {rec['subcounty']} Centroid"
            existing = db.query(Recommendation).filter(
                Recommendation.action_proposed == action,
                Recommendation.module == "INFRASTRUCTURE",
                Recommendation.status == "PROPOSED"
            ).first()
            
            if not existing:
                # Add to ledger
                ledger_entry = Recommendation(
                    module="INFRASTRUCTURE",
                    action_proposed=action,
                    parameters=json.dumps({
                        "latitude": rec["latitude"],
                        "longitude": rec["longitude"],
                        "n_stations_run": n_stations,
                        "gap_threshold": gap_threshold_km
                    }),
                    confidence_score=90.0,  # Estimated baseline confidence
                    status="PROPOSED",
                    predicted_impact=json.dumps({
                        "rider_demand_score": rec["rider_demand_score"],
                        "overall_viability_score": rec["overall_viability_score"],
                        "grid_stability_factor": rec["grid_stability_factor"]
                    })
                )
                db.add(ledger_entry)
        db.commit()
        
        return recs_list
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Infrastructure recommendation failed: {str(e)}")


@router.post("/evaluate-impact")
def evaluate_impact(
    payload: ExpansionImpactRequest,
    db: Session = Depends(get_db)
):
    """Calculates network coverage percentages before/post hypothetical rollout."""
    try:
        opt = NetworkOptimizer()
        opt.load_data(db)
        
        # Convert Pydantic payload to pandas DataFrame
        recs_list = [{"latitude": st.latitude, "longitude": st.longitude} for st in payload.proposed_stations]
        import pandas as pd
        recs_df = pd.DataFrame(recs_list)
        
        impact = opt.evaluate_expansion_impact(recs_df)
        return impact
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Expansion impact evaluation failed: {str(e)}")


@router.get("/brand-coverage")
def get_brand_coverage(
    threshold_km: float = Query(5.0, ge=1.0, le=20.0),
    db: Session = Depends(get_db)
):
    """Computes the demographic-weighted coverage percentage for all competitor brands."""
    try:
        opt = NetworkOptimizer()
        opt.load_data(db)
        coverage = opt.calculate_brand_coverage(threshold_km)
        return coverage
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Brand coverage calculation failed: {str(e)}")
