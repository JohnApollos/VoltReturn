import pytest
from backend.app.modules.finance.service import FinancialSimulationService

def test_dcf_continuous_gradient():
    """Verify that fleet size, NPV, and cash flows scale smoothly without step discontinuities."""
    b_70 = FinancialSimulationService.run_dcf(budget_kes=70000000.0, num_stations=12, horizon_years=5, risk_appetite="medium", tariff_type="mixed")
    b_75 = FinancialSimulationService.run_dcf(budget_kes=75000000.0, num_stations=12, horizon_years=5, risk_appetite="medium", tariff_type="mixed")
    b_80 = FinancialSimulationService.run_dcf(budget_kes=80000000.0, num_stations=12, horizon_years=5, risk_appetite="medium", tariff_type="mixed")
    b_100 = FinancialSimulationService.run_dcf(budget_kes=100000000.0, num_stations=12, horizon_years=5, risk_appetite="medium", tariff_type="mixed")

    # Fleet size must scale monotonically with budget
    assert b_70["fleet_size"] <= b_75["fleet_size"] <= b_80["fleet_size"] <= b_100["fleet_size"]
    # No sudden jumps
    assert (b_75["fleet_size"] - b_70["fleet_size"]) < 50
    # NPV must be finite and positive for viable capital
    assert b_100["expected_npv_kes"] > 0
    # IRR must be reasonable (not infinite or negative)
    assert 10.0 <= b_100["expected_irr_pct"] <= 90.0

def test_monte_carlo_distribution():
    """Verify Monte Carlo simulation generates valid distribution bins and positive probability."""
    mc = FinancialSimulationService.run_monte_carlo(
        budget_kes=100000000.0,
        num_stations=12,
        horizon_years=5,
        risk_appetite="medium",
        tariff_type="mixed",
        default_rate_pct=4.90,
        simulations=200
    )
    assert "mean_irr_pct" in mc
    assert "distribution_chart" in mc
    assert len(mc["distribution_chart"]) > 0
    assert 0.0 <= mc["probability_positive_return"] <= 100.0

def test_sensitivity_tornado_empirical():
    """Verify sensitivity tornado calculates empirical variations sorted by swing."""
    tornado = FinancialSimulationService.get_sensitivity_tornado(
        budget_kes=100000000.0,
        num_stations=12,
        horizon_years=5,
        risk_appetite="medium",
        tariff_type="mixed",
        default_rate_pct=4.90
    )
    assert len(tornado) == 4
    for item in tornado:
        assert "metric" in item
        assert "swing" in item
        assert item["swing"] >= 0.0
    # Verify sorted descending by swing
    swings = [x["swing"] for x in tornado]
    assert swings == sorted(swings, reverse=True)
