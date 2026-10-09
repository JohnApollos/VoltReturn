import logging
import numpy as np
from typing import Dict, Any, List, Tuple

logger = logging.getLogger(__name__)

# --- TARIF CONSTANTS (KES per kWh) ---
TARIFF_RATES = {
    "current": 25.0,  # Peak rate + fuel surcharge
    "off_peak": 17.0, # KPLC time-of-use e-mobility rate
    "mixed": 21.5     # Blend profile
}

class FinancialSimulationService:
    """Computes DCF statements, numerical IRR, sensitivity tornado arrays, and Monte Carlo forecasts."""
    
    @staticmethod
    def calculate_irr(cash_flows: List[float], max_iter: int = 100, tolerance: float = 1e-6) -> float:
        """Calculates Internal Rate of Return (IRR) using the Newton-Raphson method."""
        if not cash_flows or len(cash_flows) < 2:
            return 0.0
            
        # Initial guess of 10%
        r = 0.10
        
        for _ in range(max_iter):
            npv = 0.0
            dnpv = 0.0  # Derivative of NPV with respect to r
            
            for t, cf in enumerate(cash_flows):
                npv += cf / ((1 + r) ** t)
                if t > 0:
                    dnpv -= t * cf / ((1 + r) ** (t + 1))
                    
            if abs(dnpv) < 1e-12:  # Avoid division by zero
                break
                
            r_new = r - npv / dnpv
            
            if abs(r_new - r) < tolerance:
                # Cap extreme outputs
                return float(np.clip(r_new, -0.99, 5.0))
                
            r = r_new
            
        return float(r)

    @classmethod
    def _compute_dcf_flows(
        cls,
        budget_kes: float,
        num_stations: int,
        horizon_years: int,
        risk_appetite: str,
        tariff_rate_kes: float,
        default_rate_pct: float,
        swap_velocity_mult: float = 1.0,
        carbon_price_ton_kes: float = 2600.0
    ) -> Dict[str, Any]:
        """Internal pure-function DCF cash-flow generator for simulation, MC, and sensitivity."""
        station_unit_cost = 4200000.0
        bike_unit_cost = 140000.0
        
        # Smooth continuous CapEx allocation without step discontinuities
        station_capex = min(num_stations * station_unit_cost, budget_kes * 0.65)
        fleet_capex = max(0.0, budget_kes - station_capex)
        fleet_size = max(10, int(fleet_capex / bike_unit_cost))
        effective_stations = max(1.0, station_capex / station_unit_cost)
        
        swaps_per_rider_day = 1.6 * swap_velocity_mult
        kwh_per_swap = 3.0
        swap_price_kes = 185.0
        payg_daily_kes = 420.0
        co2_saved_rider_year = 3.74
        
        risk_mod = {"low": 0.8, "medium": 1.0, "high": 1.3}
        effective_default = (default_rate_pct / 100.0) * risk_mod.get(risk_appetite.lower(), 1.0)
        
        discount_rate = 0.12
        cash_flows = [-budget_kes]
        dcf_table = []
        cumulative_cash = -budget_kes
        payback_year = None
        
        for y in range(1, horizon_years + 1):
            adoption_factor = min(1.0, 0.60 + (y - 1) * 0.15)
            active_fleet = int(fleet_size * adoption_factor)
            
            # Swaps: Captive fleet riders + open network swaps captured by deployed infrastructure
            open_network_swaps = effective_stations * 18.0 * adoption_factor * swap_velocity_mult
            total_daily_swaps = (active_fleet * swaps_per_rider_day) + open_network_swaps
            
            swap_rev = total_daily_swaps * 365.0 * swap_price_kes
            payg_active_share = 1.0 if y <= 2 else 0.85
            payg_rev = active_fleet * payg_daily_kes * 365.0 * (1.0 - effective_default) * payg_active_share
            carbon_rev = active_fleet * co2_saved_rider_year * carbon_price_ton_kes
            gross_revenue = swap_rev + payg_rev + carbon_rev
            
            electricity_exp = total_daily_swaps * 365.0 * kwh_per_swap * tariff_rate_kes
            maintenance_exp = (effective_stations * 220000.0) + (active_fleet * 8500.0)
            operating_expenses = electricity_exp + maintenance_exp
            
            net_cash_flow = gross_revenue - operating_expenses
            cash_flows.append(net_cash_flow)
            
            cumulative_cash += net_cash_flow
            if cumulative_cash >= 0.0 and payback_year is None:
                prev_cash = cumulative_cash - net_cash_flow
                payback_year = float(np.round((y - 1) + (abs(prev_cash) / max(1.0, net_cash_flow)), 2))
                
            dcf_table.append({
                "year": y,
                "active_riders": active_fleet,
                "revenue": {
                    "battery_swaps": float(np.round(swap_rev, 0)),
                    "payg_finance": float(np.round(payg_rev, 0)),
                    "carbon_credits": float(np.round(carbon_rev, 0)),
                    "total": float(np.round(gross_revenue, 0))
                },
                "expense": {
                    "charging_electricity": float(np.round(electricity_exp, 0)),
                    "maintenance_and_operations": float(np.round(maintenance_exp, 0)),
                    "total": float(np.round(operating_expenses, 0))
                },
                "net_cash_flow": float(np.round(net_cash_flow, 0)),
                "cumulative_cash_flow": float(np.round(cumulative_cash, 0)),
                "discounted_cash_flow": float(np.round(net_cash_flow / ((1 + discount_rate) ** y), 0))
            })
            
        npv = sum([item["discounted_cash_flow"] for item in dcf_table]) - budget_kes
        irr = cls.calculate_irr(cash_flows)
        
        return {
            "budget_kes": budget_kes,
            "fleet_size": fleet_size,
            "effective_stations": float(np.round(effective_stations, 1)),
            "expected_irr_pct": float(np.round(irr * 100.0, 2)),
            "expected_npv_kes": float(np.round(npv, 0)),
            "payback_period_years": payback_year if payback_year is not None else float(horizon_years + 1),
            "rider_growth_count": int(fleet_size),
            "carbon_offset_tco2": float(np.round(fleet_size * co2_saved_rider_year * horizon_years, 1)),
            "cash_flows": cash_flows,
            "dcf_statements": dcf_table
        }

    @classmethod
    def run_dcf(
        cls,
        budget_kes: float,
        num_stations: int,
        horizon_years: int,
        risk_appetite: str,
        tariff_type: str,
        default_rate_pct: float = 4.90
    ) -> Dict[str, Any]:
        """Generates the Discounted Cash Flow statement and computes key financial KPIs."""
        tariff_rate = TARIFF_RATES.get(tariff_type.lower(), 21.5)
        return cls._compute_dcf_flows(
            budget_kes=budget_kes,
            num_stations=num_stations,
            horizon_years=horizon_years,
            risk_appetite=risk_appetite,
            tariff_rate_kes=tariff_rate,
            default_rate_pct=default_rate_pct
        )

    @classmethod
    def run_monte_carlo(
        cls,
        budget_kes: float,
        num_stations: int,
        horizon_years: int,
        risk_appetite: str,
        tariff_type: str,
        default_rate_pct: float,
        simulations: int = 1000
    ) -> Dict[str, Any]:
        """Runs Monte Carlo returns simulation by sampling parameters from normal/log-normal distributions."""
        irr_results = []
        npv_results = []
        
        base_tariff = TARIFF_RATES.get(tariff_type.lower(), 21.5)
        np.random.seed(42)
        
        for _ in range(simulations):
            # 1. Tariff volatility (std dev KES 2.5/kWh)
            rand_tariff = float(np.clip(np.random.normal(base_tariff, 2.5), 12.0, 35.0))
            
            # 2. Portfolio default rate shifts (log-normal around default_rate_pct)
            rand_default = float(np.clip(np.random.lognormal(np.log(max(0.5, default_rate_pct)), 0.15), 0.5, 30.0))
            
            # 3. Swap velocity multiplier
            rand_swap_velocity = float(np.clip(np.random.normal(1.0, 0.10), 0.6, 1.5))
            
            sim_res = cls._compute_dcf_flows(
                budget_kes=budget_kes,
                num_stations=num_stations,
                horizon_years=horizon_years,
                risk_appetite=risk_appetite,
                tariff_rate_kes=rand_tariff,
                default_rate_pct=rand_default,
                swap_velocity_mult=rand_swap_velocity
            )
            
            irr_results.append(sim_res["expected_irr_pct"] / 100.0)
            npv_results.append(sim_res["expected_npv_kes"])
            
        irr_arr = np.array(irr_results) * 100.0
        npv_arr = np.array(npv_results)
        
        # Structure histogram data
        hist_counts, hist_edges = np.histogram(npv_arr / 1000000.0, bins=25)
        distribution_chart = []
        for i in range(len(hist_counts)):
            distribution_chart.append({
                "npv_m_kes": float(np.round((hist_edges[i] + hist_edges[i+1]) / 2.0, 1)),
                "frequency": int(hist_counts[i])
            })
            
        return {
            "mean_irr_pct": float(np.round(np.mean(irr_arr), 2)),
            "irr_95_ci": [float(np.round(np.percentile(irr_arr, 2.5), 1)), float(np.round(np.percentile(irr_arr, 97.5), 1))],
            "mean_npv_kes": float(np.round(np.mean(npv_arr), 0)),
            "npv_95_ci": [float(np.round(np.percentile(npv_arr, 2.5), 0)), float(np.round(np.percentile(npv_arr, 97.5), 0))],
            "probability_positive_return": float(np.round(np.sum(npv_arr > 0) / simulations * 100.0, 1)),
            "distribution_chart": distribution_chart
        }

    @classmethod
    def get_sensitivity_tornado(
        cls,
        budget_kes: float,
        num_stations: int,
        horizon_years: int,
        risk_appetite: str,
        tariff_type: str,
        default_rate_pct: float
    ) -> List[Dict[str, Any]]:
        """Calculates horizontal tornado statistics illustrating parameter sensitivities."""
        base_tariff = TARIFF_RATES.get(tariff_type.lower(), 21.5)
        
        # Baseline run
        baseline = cls._compute_dcf_flows(
            budget_kes=budget_kes,
            num_stations=num_stations,
            horizon_years=horizon_years,
            risk_appetite=risk_appetite,
            tariff_rate_kes=base_tariff,
            default_rate_pct=default_rate_pct
        )
        base_npv_m = baseline["expected_npv_kes"] / 1000000.0
        base_irr = baseline["expected_irr_pct"]
        
        # Variables to stress-test
        variables = [
            {"name": "Electricity Tariff (+20% / -20%)", "key": "tariff_rate", "delta": 0.20},
            {"name": "PAYG Default Rate (+30% / -30%)", "key": "default_rate", "delta": 0.30},
            {"name": "Rider Swap Velocity (+15% / -15%)", "key": "swap_velocity", "delta": 0.15},
            {"name": "Carbon Credit Price (+25% / -25%)", "key": "carbon_price", "delta": 0.25}
        ]
        
        tornado = []
        for var in variables:
            key = var["key"]
            d = var["delta"]
            
            if key == "tariff_rate":
                low_run = cls._compute_dcf_flows(budget_kes, num_stations, horizon_years, risk_appetite, base_tariff * (1 - d), default_rate_pct)
                high_run = cls._compute_dcf_flows(budget_kes, num_stations, horizon_years, risk_appetite, base_tariff * (1 + d), default_rate_pct)
            elif key == "default_rate":
                low_run = cls._compute_dcf_flows(budget_kes, num_stations, horizon_years, risk_appetite, base_tariff, default_rate_pct * (1 - d))
                high_run = cls._compute_dcf_flows(budget_kes, num_stations, horizon_years, risk_appetite, base_tariff, default_rate_pct * (1 + d))
            elif key == "swap_velocity":
                low_run = cls._compute_dcf_flows(budget_kes, num_stations, horizon_years, risk_appetite, base_tariff, default_rate_pct, swap_velocity_mult=(1 - d))
                high_run = cls._compute_dcf_flows(budget_kes, num_stations, horizon_years, risk_appetite, base_tariff, default_rate_pct, swap_velocity_mult=(1 + d))
            else:  # carbon_price
                low_run = cls._compute_dcf_flows(budget_kes, num_stations, horizon_years, risk_appetite, base_tariff, default_rate_pct, carbon_price_ton_kes=2600.0 * (1 - d))
                high_run = cls._compute_dcf_flows(budget_kes, num_stations, horizon_years, risk_appetite, base_tariff, default_rate_pct, carbon_price_ton_kes=2600.0 * (1 + d))
                
            low_npv_m = float(np.round(low_run["expected_npv_kes"] / 1000000.0, 1))
            high_npv_m = float(np.round(high_run["expected_npv_kes"] / 1000000.0, 1))
            swing = float(np.round(abs(high_npv_m - low_npv_m), 1))
            
            tornado.append({
                "metric": var["name"],
                "negative_swing": min(low_npv_m, high_npv_m),
                "positive_swing": max(low_npv_m, high_npv_m),
                "low_value_irr": float(np.round(low_run["expected_irr_pct"], 2)),
                "high_value_irr": float(np.round(high_run["expected_irr_pct"], 2)),
                "swing": swing
            })
            
        return sorted(tornado, key=lambda x: x["swing"], reverse=True)
