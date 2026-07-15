import pytest
import os
import pandas as pd
from sqlalchemy.orm import Session

from backend.app.core.database import SessionLocal, engine, Base
from backend.app.core.data_quality import DataQualityEngine
from backend.app.modules.infrastructure.service import NetworkOptimizer
from backend.app.models.schemas import DataQualityLog, Recommendation

@pytest.fixture(scope="module")
def db():
    """Initializes SQLite test tables and provides database session."""
    # Ensure database is generated
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_data_files_exist():
    """Verifies baseline csv files exist in correct folder."""
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    subcounty_path = os.path.join(project_root, "data", "nairobi_subcounties.csv")
    stations_path = os.path.join(project_root, "data", "existing_stations.csv")
    
    assert os.path.exists(subcounty_path), "Nairobi subcounties file is missing!"
    assert os.path.exists(stations_path), "Geocoded existing stations file is missing!"

def test_data_quality_engine(db: Session):
    """Verifies that the data quality engine correctly scores input data."""
    # Test with mockup clean data
    mock_df = pd.DataFrame({
        "lat": [-1.2941, -1.3025],
        "lon": [36.8025, 36.7350],
        "cabinets": [2, 1],
        "grid_reliability": [0.95, 0.88]
    })
    
    rules = {
        "lat": (-2.0, 0.0),
        "lon": (35.0, 39.0),
        "cabinets": (1, 10),
        "grid_reliability": (0.0, 1.0)
    }
    
    res = DataQualityEngine.run_check(mock_df, "test_mock_data", db, rules)
    assert res["status"] == "PASS"
    assert res["usability_score"] == 100.0
    
    # Query SQLite database to verify log entry
    logged_entry = db.query(DataQualityLog).filter(DataQualityLog.dataset_name == "test_mock_data").first()
    assert logged_entry is not None
    assert logged_entry.status == "PASS"

def test_optimizer_recommendations(db: Session):
    """Verifies NetworkOptimizer runs K-Means clustering on the geocoded stations."""
    opt = NetworkOptimizer()
    opt.load_data(db)
    
    # Assert grid points populated
    assert opt.grid_points is not None
    assert len(opt.grid_points) > 0
    
    # Run recommendation for 5 stations
    recs = opt.recommend_stations(n_stations=5, gap_threshold_km=5.0)
    assert not recs.empty, "Recommendations returned empty dataframe!"
    assert len(recs) <= 5
    assert "overall_viability_score" in recs.columns
    assert "latitude" in recs.columns
    assert "longitude" in recs.columns

def test_brand_coverage(db: Session):
    """Verifies that competitor brand coverages calculate without exception."""
    opt = NetworkOptimizer()
    opt.load_data(db)
    
    coverage = opt.calculate_brand_coverage(threshold_km=5.0)
    assert len(coverage) > 0
    for brand, pct in coverage.items():
        assert 0.0 <= pct <= 100.0
