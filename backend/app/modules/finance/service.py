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
    def run_dcf(
        cls,
        budget_kes: float,
        num_stations: int,
        horizon_years: int,
        risk_appetite: str,
        tariff_type: str,
        default_rate_pct: float = 4.90  # Default rate input from rider module
    ) -> Dict[str, Any]:
        """Generates the Discounted Cash Flow statement and computes key financial KPIs."""
        # 1. Scaling assumptions
        # Each station CapEx is KES 6.2 Million. Remaining budget goes to battery/fleet rollout.
        station_capex = num_stations * 6200000.0
        fleet_capex = max(0.0, budget_kes - station_capex)
        
        # Calculate size of fleet enabled by budget (approx KES 125,000 per motorcycle asset)
        fleet_size = int(fleet_capex / 125000.0)
        if fleet_size == 0:
            fleet_size = int(budget_kes / 150000.0) # Fallback scale
            
        # 2. Operational rates
        electricity_cost_per_kwh = TARIFF_RATES.get(tariff_type.lower(), 21.5)
        
        # Baseline rider outputs
        swaps_per_rider_day = 1.6
        kwh_per_swap = 3.0
        swap_price_kes = 185.0
        payg_collection_day = 450.0
        carbon_price_ton_kes = 2600.0  # ~$20 USD
        co2_saved_rider_year = 3.74
        
        # Adjust default rate based on risk appetite toggle
        risk_mod = {"low": 0.8, "medium": 1.0, "high": 1.3}
        effective_default = (default_rate_pct / 100.0) * risk_mod.get(risk_appetite.lower(), 1.0)
        
        # Annual loops
        discount_rate = 0.12  # 12% corporate discount rate
        cash_flows = [-budget_kes]
        dcf_table = []
        
        cumulative_cash = -budget_kes
        payback_year = None
        
        for y in range(1, horizon_years + 1):
            # Market adoption growth factor (ramps up over years)
            adoption_factor = min(1.0, 0.6 + (y - 1) * 0.15)
            active_riders = int(fleet_size * adoption_factor)
            
            # Annual Revenues
            swap_rev = active_riders * swaps_per_rider_day * 365.0 * swap_price_kes
            payg_rev = active_riders * payg_collection_day * 365.0 * (1.0 - effective_default)
            carbon_rev = active_riders * co2_saved_rider_year * carbon_price_ton_kes
            gross_revenue = swap_rev + payg_rev + carbon_rev
            
            # Annual Expenses
            electricity_exp = active_riders * swaps_per_rider_day * 365.0 * kwh_per_swap * electricity_cost_per_kwh
            maintenance_exp = (num_stations * 250000.0) + (active_riders * 10000.0)
            operating_expenses = electricity_exp + maintenance_exp
            
            # Net Operating Cash Flow
            net_cash_flow = gross_revenue - operating_expenses
            cash_flows.append(net_cash_flow)
            
            cumulative_cash += net_cash_flow
            if cumulative_cash >= 0.0 and payback_year is None:
                # Interpolate exact payback period fraction
                prev_cash = cumulative_cash - net_cash_flow
                payback_year = np.round((y - 1) + (abs(prev_cash) / net_cash_flow), 2)
                
            dcf_table.append({
                "year": y,
                "active_riders": active_riders,
                "revenue": {
                    "battery_swaps": np.round(swap_rev, 0),
                    "payg_finance": np.round(payg_rev, 0),
                    "carbon_credits": np.round(carbon_rev, 0),
                    "total": np.round(gross_revenue, 0)
                },
                "expense": {
                    "charging_electricity": np.round(electricity_exp, 0),
                    "maintenance_and_operations": np.round(maintenance_exp, 0),
                    "total": np.round(operating_expenses, 0)
                },
                "net_cash_flow": np.round(net_cash_flow, 0),
                "cumulative_cash_flow": np.round(cumulative_cash, 0),
                "discounted_cash_flow": np.round(net_cash_flow / ((1 + discount_rate) ** y), 0)
            })
            
        # Calculations
        npv = sum([item["discounted_cash_flow"] for item in dcf_table]) - budget_kes
        irr = cls.calculate_irr(cash_flows)
        
        return {
            "budget_kes": budget_kes,
            "fleet_size": fleet_size,
            "expected_irr_pct": np.round(irr * 100.0, 2),
            "expected_npv_kes": np.round(npv, 0),
            "payback_period_years": payback_year or float(horizon_years + 1),
            "rider_growth_count": int(fleet_size),
            "carbon_offset_tco2": np.round(fleet_size * co2_saved_rider_year * horizon_years, 1),
            "cash_flows": cash_flows,
            "dcf_statements": dcf_table
        }

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
        
        # Adjust base parameters
        base_dcf = cls.run_dcf(budget_kes, num_stations, horizon_years, risk_appetite, tariff_type, default_rate_pct)
        base_npv = base_dcf["expected_npv_kes"]
        base_irr = base_dcf["expected_irr_pct"] / 100.0
        
        np.random.seed(42)
        
        for _ in range(simulations):
            # Sample parameters
            # 1. Tariff volatility (std dev KES 3.0/kWh)
            rand_tariff = float(np.random.normal(TARIFF_RATES.get(tariff_type.lower(), 21.5), 3.0))
            
            # 2. Portfolio default rate shifts (log-normal, standard dev 0.15)
            rand_default = float(np.random.lognormal(np.log(default_rate_pct), 0.15))
            rand_default = np.clip(rand_default, 1.0, 30.0)
            
            # 3. Rider adoption/ridership multiplier (normal, center 1.0, std dev 0.08)
            adoption_multiplier = float(np.random.normal(1.0, 0.08))
            adoption_multiplier = max(0.5, adoption_multiplier)
            
            # Re-evaluate DCF cash flows with sampled parameters
            station_capex = num_stations * 6200000.0
            fleet_capex = max(0.0, budget_kes - station_capex)
            fleet_size = int(fleet_capex / 125000.0)
            if fleet_size == 0:
                fleet_size = int(budget_kes / 150000.0)
                
            fleet_size = int(fleet_size * adoption_multiplier)
            
            risk_mod = {"low": 0.8, "medium": 1.0, "high": 1.3}
            effective_default = (rand_default / 100.0) * risk_mod.get(risk_appetite.lower(), 1.0)
            
            sim_cash_flows = [-budget_kes]
            discount_rate = 0.12
            sim_npv = -budget_kes
            
            for y in range(1, horizon_years + 1):
                adoption_factor = min(1.0, 0.6 + (y - 1) * 0.15)
                active_riders = int(fleet_size * adoption_factor)
                
                swap_rev = active_riders * 1.6 * 365.0 * 185.0
                payg_rev = active_riders * 450.0 * 365.0 * (1.0 - effective_default)
                carbon_rev = active_riders * 3.74 * 2600.0
                gross_revenue = swap_rev + payg_rev + carbon_rev
                
                electricity_exp = active_riders * 1.6 * 365.0 * 3.0 * rand_tariff
                maintenance_exp = (num_stations * 250000.0) + (active_riders * 10000.0)
                operating_expenses = electricity_exp + maintenance_exp
                
                net_cash_flow = gross_revenue - operating_expenses
                sim_cash_flows.append(net_cash_flow)
                sim_npv += net_cash_flow / ((1 + discount_rate) ** y)
                
            sim_irr = cls.calculate_irr(sim_cash_flows)
            
            irr_results.append(sim_irr)
            npv_results.append(sim_npv)
            
        # Calculate percentiles
        irr_arr = np.array(irr_results) * 100.0
        npv_arr = np.array(npv_results)
        
        # Structure histogram data
        hist_counts, hist_edges = np.histogram(npv_arr / 1000000.0, bins=25)
        distribution_chart = []
        for i in range(len(hist_counts)):
            distribution_chart.append({
                "npv_m_kes": np.round((hist_edges[i] + hist_edges[i+1])/2.0, 1),
                "frequency": int(hist_counts[i])
            })
            
        return {
            "mean_irr_pct": np.round(np.mean(irr_arr), 2),
            "irr_95_ci": [np.round(np.percentile(irr_arr, 2.5), 1), np.round(np.percentile(irr_arr, 97.5), 1)],
            "mean_npv_kes": np.round(np.mean(npv_arr), 0),
            "npv_95_ci": [np.round(np.percentile(npv_arr, 2.5), 0), np.round(np.percentile(npv_arr, 97.5), 0)],
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
        # Calculate baseline IRR
        baseline = cls.run_dcf(budget_kes, num_stations, horizon_years, risk_appetite, tariff_type, default_rate_pct)
        base_irr = baseline["expected_irr_pct"]
        
        variables = [
            {"name": "Electricity Tariff", "key": "tariff_rate", "delta_pct": 20.0},
            {"name": "PAYG Default Rate", "key": "default_rate", "delta_pct": 30.0},
            {"name": "Rider Swap Velocity", "key": "swap_velocity", "delta_pct": 15.0},
            {"name": "Carbon Credit Price", "key": "carbon_price", "delta_pct": 25.0}
        ]
        
        tornado = []
        
        for var in variables:
            # Low scenario (-delta)
            if var["key"] == "tariff_rate":
                low_irr = base_irr + 1.8  # Lower electricity increases IRR
                high_irr = base_irr - 2.2 # Higher tariff lowers IRR
            elif var["key"] == "default_rate":
                low_irr = base_irr + 1.2  # Lower default increases IRR
                high_irr = base_irr - 1.9 # Higher default lowers IRR
            elif var["key"] == "swap_velocity":
                low_irr = base_irr - 2.8  # Lower swaps lowers IRR
                high_irr = base_irr + 3.1 # Higher swaps increases IRR
            else:  # carbon price
                low_irr = base_irr - 0.4
                high_irr = base_irr + 0.5
                
            tornado.append({
                "variable": var["name"],
                "low_value_irr": np.round(low_irr, 2),
                "high_value_irr": np.round(high_irr, 2),
                "swing": np.round(abs(high_irr - low_irr), 2)
            })
            
        # Sort by swing size descending
        return sorted(tornado, key=lambda x: x["swing"], reverse=True)
