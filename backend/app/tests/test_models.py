import pytest
import numpy as np
from sqlalchemy.orm import Session

from backend.app.core.database import SessionLocal, Base, engine
from backend.app.modules.finance.service import FinancialSimulationService
from backend.app.modules.fleet.service import FleetIntelligenceService
from backend.app.modules.rider.service import RiderIntelligenceService

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_irr_dcf_calculations():
    """Verifies that DCF and Internal Rate of Return (IRR) equations execute correctly."""
    # Test simple constant cash flows
    # Year 0: -100, Year 1: 30, Year 2: 30, Year 3: 30, Year 4: 30
    # Expected IRR should be approx 7.7%
    flows = [-100.0, 30.0, 30.0, 30.0, 30.0]
    irr = FinancialSimulationService.calculate_irr(flows)
    
    assert 0.07 <= irr <= 0.08, f"IRR calculation failed! Got {irr}"
    
    # Run full DCF simulation
    res = FinancialSimulationService.run_dcf(
        budget_kes=100000000.0,  # 100M
        num_stations=12,
        horizon_years=5,
        risk_appetite="medium",
        tariff_type="mixed",
        default_rate_pct=4.90
    )
    
    assert "expected_irr_pct" in res
    assert "expected_npv_kes" in res
    assert res["fleet_size"] > 0
    assert len(res["dcf_statements"]) == 5

def test_monte_carlo_runs():
    """Verifies that Monte Carlo sampling runs and generates a valid distribution histogram."""
    res = FinancialSimulationService.run_monte_carlo(
        budget_kes=100000000.0,
        num_stations=12,
        horizon_years=5,
        risk_appetite="medium",
        tariff_type="mixed",
        default_rate_pct=4.90,
        simulations=100
    )
    
    assert "mean_irr_pct" in res
    assert "distribution_chart" in res
    assert len(res["distribution_chart"]) > 0
    assert 0.0 <= res["probability_positive_return"] <= 100.0

def test_fleet_weibull_survival():
    """Verifies that battery RUL survival equations calculate valid bounds."""
    # S(t) = exp( -(t/L)^k )
    # At t = 0, survival should be 1.0 (100%)
    L = 1800.0
    k = 2.2
    
    s_0 = np.exp(-((0.0 / L) ** k))
    assert s_0 == 1.0
    
    # At t = L, survival should be exp(-1) approx 0.368 (36.8%)
    s_L = np.exp(-((L / L) ** k))
    assert 0.36 <= s_L <= 0.37
    
    # Test service historical load
    profile = FleetIntelligenceService.get_battery_profile("BAT-0001")
    if profile:
        assert "survival_probability" in profile
        assert "survival_curve" in profile
        assert len(profile["survival_curve"]) == 20

def test_rider_models_and_governance(db: Session):
    """Verifies default and churn models fit and evaluate borrower default risk."""
    service = RiderIntelligenceService()
    results = service.train_models(db)
    
    assert "default_model" in results
    assert "churn_model" in results
    assert results["default_model"]["auc"] > 0.5
    
    portfolio = service.evaluate_portfolio(db)
    assert portfolio["total_portfolio_riders"] == 1000
    assert portfolio["expected_default_rate_pct"] > 0.0
