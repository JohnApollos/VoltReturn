import logging
import numpy as np
from typing import Dict, Any

logger = logging.getLogger(__name__)

# --- ESG METHODOLOGY PARAMETERS ---
# VM0038: Methodology for Electric Vehicle Charging Systems
CO2_PETROL_LITER: float = 3.10      # kg CO2 emitted per liter of petrol burned
PETROL_KM_PER_LITER: float = 35.0   # Avg fuel efficiency for 150cc petrol motorcycle
KWH_PER_KM_EV: float = 0.06         # 3.0 kWh battery yields approx 50km range (3/50 = 0.06)

# Kenya high-renewables grid factor (~90% geothermal/hydro/wind)
CO2_KENYA_GRID_KWH: float = 0.05    # kg CO2/kWh
CO2_FOSSIL_GRID_KWH: float = 0.45   # Fossil backup (e.g. diesel generator backup)

class SustainabilityService:
    """Computes carbon displacement metrics and ESG credit revenue offsets based on Verra VM0038 rules."""
    
    @staticmethod
    def calculate_displacement(
        fleet_size: int, 
        avg_daily_km: float = 80.0,
        carbon_price_usd_ton: float = 20.0,
        use_fossil_grid: bool = False
    ) -> Dict[str, Any]:
        """Calculates environmental benefits and offsets for the active fleet.
        
        Args:
            fleet_size (int): Total active electric motorcycles.
            avg_daily_km (float): Average mileage per driver.
            carbon_price_usd_ton (float): Current price of carbon credits (USD).
            use_fossil_grid (bool): Toggle to simulate fossil-heavy grid mix.
        """
        # 1. Baseline Petrol Emissions
        annual_distance_fleet = fleet_size * avg_daily_km * 365.0
        petrol_liters_displaced = annual_distance_fleet / PETROL_KM_PER_LITER
        petrol_co2_kg = petrol_liters_displaced * CO2_PETROL_LITER
        
        # 2. Project EV Emissions
        grid_factor = CO2_FOSSIL_GRID_KWH if use_fossil_grid else CO2_KENYA_GRID_KWH
        ev_electricity_kwh = annual_distance_fleet * KWH_PER_KM_EV
        ev_co2_kg = ev_electricity_kwh * grid_factor
        
        # 3. Net CO2 Avoided (convert to metric tons)
        net_co2_avoided_tons = (petrol_co2_kg - ev_co2_kg) / 1000.0
        
        # 4. Carbon Credit Value
        annual_credits_usd = net_co2_avoided_tons * carbon_price_usd_ton
        annual_credits_kes = annual_credits_usd * 130.0  # Approx KES/USD conversion
        
        # Equivalence metrics
        trees_planted_equivalent = int(net_co2_avoided_tons * 45)  # 1 ton of CO2 is offset by ~45 mature trees per year
        
        return {
            "annual_fleet_distance_km": np.round(annual_distance_fleet, 0),
            "petrol_displaced_liters": np.round(petrol_liters_displaced, 0),
            "gross_petrol_co2_tons": np.round(petrol_co2_kg / 1000.0, 1),
            "gross_grid_co2_tons": np.round(ev_co2_kg / 1000.0, 1),
            "net_co2_avoided_tons": np.round(net_co2_avoided_tons, 1),
            "trees_planted_equivalent": trees_planted_equivalent,
            "carbon_credits_value_usd": np.round(annual_credits_usd, 2),
            "carbon_credits_value_kes": np.round(annual_credits_kes, 0),
            "methodology_reference": "Verra VM0038 / CDM ACM0019 (Multi-project methodology for e-mobility)"
        }
