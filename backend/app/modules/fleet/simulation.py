import os
import datetime
import numpy as np
import pandas as pd
from typing import List, Dict, Any

def generate_fleet_telemetry(
    output_path: str = "data/battery_telemetry.parquet",
    num_batteries: int = 50,
    records_per_battery: int = 100,
    random_seed: int = 42
) -> None:
    """Generates synthetic high-frequency battery pack telemetry and capacity decay data.
    
    Models capacity fade using temperature-dependent power law cycling equations:
    SoH = 1.0 - A * exp(-Ea / (R * T)) * cycle_count^z
    """
    np.random.seed(random_seed)
    
    # Anchor path relative to project root
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
    full_output_path = os.path.join(project_root, output_path)
    os.makedirs(os.path.dirname(full_output_path), exist_ok=True)
    
    # Physics constants for capacity fade
    R = 8.314  # Gas constant
    Ea = 22400.0  # Activation energy J/mol
    A = 0.0018  # Pre-exponential factor
    z = 0.55   # Cycle exponent
    
    data: List[Dict[str, Any]] = []
    
    # Base datetime
    base_time = datetime.datetime.now() - datetime.timedelta(days=90)
    
    for b_idx in range(num_batteries):
        battery_id = f"BAT-{b_idx+1:04d}"
        vehicle_id = f"VEH-{b_idx+1:04d}"
        
        # Random initial state of health (between 98% and 100%)
        initial_soh = np.random.uniform(0.98, 1.0)
        
        # Individual battery operating profile parameters
        base_temp = np.random.uniform(28.0, 36.0)  # Mean cell operating temp C
        max_cycles = np.random.randint(400, 1200)   # Current cycle age
        
        for step in range(records_per_battery):
            # Calculate current cycles (linearly increasing)
            cycles = int((step / records_per_battery) * max_cycles)
            
            # Simulate high-frequency operational signals
            temp_k = base_temp + 273.15 + np.random.normal(0, 1.5)  # Convert to Kelvin
            
            # Apply power-law capacity decay equation
            decay = A * np.exp(-Ea / (R * temp_k)) * (cycles ** z)
            soh = max(0.0, initial_soh - decay)
            
            # Simulate State of Charge (active cycling)
            soc = float(np.random.uniform(10.0, 95.0))
            
            # Voltage / Current characteristics based on SoC
            voltage = float(72.0 + (soc / 100.0) * 8.0 + np.random.normal(0, 0.1))  # 72V nominal pack
            current = float(np.random.uniform(5.0, 35.0)) if soc > 20 else float(np.random.uniform(1.0, 5.0))
            
            timestamp = base_time + datetime.timedelta(days=(step * 90 / records_per_battery))
            
            data.append({
                "timestamp": timestamp,
                "battery_id": battery_id,
                "vehicle_id": vehicle_id,
                "soc": np.round(soc, 1),
                "soh": np.round(soh * 100.0, 2),
                "voltage": np.round(voltage, 1),
                "current": np.round(current, 1),
                "temperature": np.round(temp_k - 273.15, 1),
                "cycle_count": cycles
            })
            
    df = pd.DataFrame(data)
    df.to_parquet(full_output_path, index=False)
    print(f"Successfully generated {len(df)} telemetry records to {full_output_path}")

if __name__ == "__main__":
    generate_fleet_telemetry()
