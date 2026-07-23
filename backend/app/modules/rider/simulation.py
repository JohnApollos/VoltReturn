import os
import numpy as np
import pandas as pd
from typing import List, Dict, Any

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two GPS coordinate points."""
    lat1_rad, lon1_rad = np.radians(lat1), np.radians(lon1)
    lat2_rad, lon2_rad = np.radians(lat2), np.radians(lon2)
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = np.sin(dlat / 2.0)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon / 2.0)**2
    c = 2.0 * np.arcsin(np.sqrt(a))
    return 6371.0 * c

def generate_rider_loans(
    output_path: str = "data/rider_loans.csv",
    fleet_size: int = 1000,
    random_seed: int = 42
) -> None:
    """Generates simulated Boda Boda rider borrower profiles.
    
    Dynamically maps distance to the nearest station based on our geocoded 66-station dataset.
    """
    np.random.seed(random_seed)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    
    # Load subcounties and existing stations
    subcounty_path = os.path.join(project_root, "data", "nairobi_subcounties.csv")
    stations_path = os.path.join(project_root, "data", "existing_stations.csv")
    
    if os.environ.get("VERCEL"):
        full_output_path = "/tmp/rider_loans.csv"
    else:
        full_output_path = os.path.join(project_root, output_path)
    
    if not os.path.exists(subcounty_path) or not os.path.exists(stations_path):
        raise FileNotFoundError("Prerequisite data files for demographics or stations are missing!")
        
    df_sub = pd.read_csv(subcounty_path)
    df_stations = pd.read_csv(stations_path)
    
    # Weight subcounties by density and boda factor
    df_sub["weight"] = df_sub["density"] * df_sub["boda_factor"]
    normalized_weights = df_sub["weight"] / df_sub["weight"].sum()
    
    assigned_rows = np.random.choice(df_sub.index, size=fleet_size, p=normalized_weights)
    
    rider_ids = [f"RID-{i+1:04d}" for i in range(fleet_size)]
    
    rider_lats = []
    rider_lons = []
    subcounties = []
    subcounty_ids = []
    distances_to_bss = []
    
    for idx in assigned_rows:
        sc = df_sub.iloc[idx]
        subcounties.append(sc["name"])
        subcounty_ids.append(sc["subcounty_id"])
        
        # Spread riders around subcounty centroid
        lat_noise = np.random.normal(0, 0.02)
        lon_noise = np.random.normal(0, 0.02)
        r_lat = sc["lat"] + lat_noise
        r_lon = sc["lon"] + lon_noise
        rider_lats.append(r_lat)
        rider_lons.append(r_lon)
        
        # Geodesic distance to nearest swap station
        min_dist = min([haversine_distance(r_lat, r_lon, st["lat"], st["lon"]) for _, st in df_stations.iterrows()])
        distances_to_bss.append(min_dist)
        
    distances_to_bss_arr = np.array(distances_to_bss)
    
    # Daily distance centered around 80 km/day
    daily_distance = np.random.normal(80.0, 15.0, size=fleet_size)
    daily_distance = np.clip(daily_distance, 35.0, 145.0)
    
    # Daily gross income (avg KES 1000)
    daily_income = np.random.normal(1000.0, 200.0, size=fleet_size)
    daily_income = np.clip(daily_income, 450.0, 1800.0)
    income_volatility = np.random.uniform(0.08, 0.32, size=fleet_size)
    
    # Petrol Daily Cost (35 km per liter efficiency at 200 KES/L + KES 50 maintenance)
    petrol_daily_cost = (daily_distance / 35.0) * 200.0 + 50.0
    
    # Electric Daily Cost (50 km per swap at 185 KES/swap + KES 10 rental fee)
    electric_daily_cost = (daily_distance / 50.0) * 185.0 + 10.0
    
    # Net savings
    net_savings = petrol_daily_cost - electric_daily_cost
    
    # PAYG Daily financing fee
    payg_daily = 450.0
    
    # Credit risk formulation (logistic regression)
    z_default = -1.8 + 0.35 * distances_to_bss_arr + 4.5 * income_volatility - 0.0032 * daily_income - 0.0025 * net_savings
    prob_default = 1.0 / (1.0 + np.exp(-z_default))
    default_indicators = (np.random.random(size=fleet_size) < prob_default).astype(int)
    
    # Churn risk formulation (logistic regression)
    # Friction (distance to BSS) increases churn; high earnings/savings decrease it
    z_churn = -2.2 + 0.22 * distances_to_bss_arr + 3.0 * income_volatility + 0.012 * daily_distance - 0.003 * net_savings
    prob_churn = 1.0 / (1.0 + np.exp(-z_churn))
    churn_indicators = (np.random.random(size=fleet_size) < prob_churn).astype(int)
    
    df_riders = pd.DataFrame({
        "Rider_ID": rider_ids,
        "Subcounty_ID": subcounty_ids,
        "Subcounty": subcounties,
        "Latitude": rider_lats,
        "Longitude": rider_lons,
        "Daily_Distance_km": np.round(daily_distance, 1),
        "Daily_Income_KES": np.round(daily_income, 0),
        "Income_Volatility": np.round(income_volatility, 3),
        "Distance_to_BSS_km": np.round(distances_to_bss_arr, 2),
        "Petrol_Daily_Cost_KES": np.round(petrol_daily_cost, 0),
        "Electric_Daily_Cost_KES": np.round(electric_daily_cost, 0),
        "PAYG_Daily_Payment_KES": payg_daily,
        "Net_Savings_KES": np.round(net_savings, 0),
        "Default_Probability": np.round(prob_default, 4),
        "Default_Indicator": default_indicators,
        "Churn_Probability": np.round(prob_churn, 4),
        "Churn_Indicator": churn_indicators
    })
    
    df_riders.to_csv(full_output_path, index=False)
    print(f"Successfully generated {len(df_riders)} rider borrower profiles to {full_output_path}")

if __name__ == "__main__":
    generate_rider_loans()
