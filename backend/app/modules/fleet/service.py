import logging
import os
import duckdb
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.core.database import get_duckdb_conn

logger = logging.getLogger(__name__)

# --- WEIBULL RELIABILITY CONSTANTS ---
WEIBULL_SCALE_LAMBDA: float = 1800.0  # Mean expected cycle life to EOL (80% SoH)
WEIBULL_SHAPE_K: float = 2.2         # Greater than 1 indicates wear-out degradation phase
SOH_EOL_THRESHOLD: float = 80.0      # End-of-life battery threshold

class FleetIntelligenceService:
    """Computes battery State of Health (SoH) and Remaining Useful Life (RUL) using Weibull survival curves."""
    
    @staticmethod
    def _get_parquet_path() -> str:
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        parquet_path = os.path.join(project_root, "data", "battery_telemetry.parquet").replace("\\", "/")
        if os.environ.get("VERCEL"):
            tmp_path = "/tmp/battery_telemetry.parquet"
            if not os.path.exists(tmp_path):
                import shutil
                try:
                    shutil.copy2(parquet_path, tmp_path)
                except Exception as e:
                    logger.error("Failed to copy battery_telemetry.parquet to /tmp: %s", e)
            parquet_path = tmp_path
        return parquet_path

    @staticmethod
    def get_fleet_summary() -> Dict[str, Any]:
        parquet_path = FleetIntelligenceService._get_parquet_path()
        
        conn = get_duckdb_conn()
        try:
            # Get latest records for each battery
            latest_status_query = f"""
                WITH latest_records AS (
                    SELECT 
                        battery_id, 
                        vehicle_id, 
                        timestamp, 
                        soh, 
                        soc, 
                        cycle_count,
                        temperature,
                        ROW_NUMBER() OVER(PARTITION BY battery_id ORDER BY timestamp DESC) as rn
                    FROM read_parquet('{parquet_path}')
                )
                SELECT * FROM latest_records WHERE rn = 1
            """
            df_latest = conn.execute(latest_status_query).fetchdf()
            
            if df_latest.empty:
                return {"total_batteries": 0, "avg_soh": 0.0, "high_risk_batteries": 0, "critical_batteries": []}
                
            total_batteries = len(df_latest)
            avg_soh = float(df_latest["soh"].mean())
            
            # Identify high risk batteries (SoH < 85%)
            high_risk_df = df_latest[df_latest["soh"] < 85.0]
            high_risk_count = len(high_risk_df)
            
            critical_list = []
            for _, row in high_risk_df.iterrows():
                # Compute estimated remaining cycles before reaching 80% SoH
                cycles = int(row["cycle_count"])
                current_soh = float(row["soh"])
                
                # Direct degradation estimate
                if cycles > 10:
                    deg_rate = (100.0 - current_soh) / cycles
                    cycles_to_eol = max(0, int((current_soh - SOH_EOL_THRESHOLD) / deg_rate)) if deg_rate > 0 else 500
                else:
                    cycles_to_eol = 1000
                    
                # Weibull survival probability of surviving another 200 cycles
                # S(t+dt | t) = S(t+dt) / S(t) = exp( -((t+dt)/L)^k + (t/L)^k )
                t = float(cycles)
                dt = 200.0
                survival_prob = np.exp(-((t + dt) / WEIBULL_SCALE_LAMBDA) ** WEIBULL_SHAPE_K + (t / WEIBULL_SCALE_LAMBDA) ** WEIBULL_SHAPE_K)
                
                critical_list.append({
                    "battery_id": str(row["battery_id"]),
                    "vehicle_id": str(row["vehicle_id"]),
                    "soh": np.round(current_soh, 2),
                    "soc": np.round(float(row["soc"]), 1),
                    "cycle_count": cycles,
                    "avg_temp": np.round(float(row["temperature"]), 1),
                    "estimated_remaining_cycles": cycles_to_eol,
                    "survival_probability_200_cycles": np.round(float(survival_prob) * 100.0, 1)
                })
                
            return {
                "total_batteries": total_batteries,
                "avg_soh": np.round(avg_soh, 2),
                "high_risk_batteries": high_risk_count,
                "critical_batteries": critical_list
            }
        except Exception as e:
            logger.error("Failed to query fleet telemetry from Parquet: %s", e)
            raise e
        finally:
            conn.close()

    @staticmethod
    def get_battery_profile(battery_id: str) -> Dict[str, Any]:
        parquet_path = FleetIntelligenceService._get_parquet_path()
        
        conn = get_duckdb_conn()
        try:
            query = f"""
                SELECT timestamp, soh, soc, cycle_count, temperature, voltage, current 
                FROM read_parquet('{parquet_path}')
                WHERE battery_id = '{battery_id}'
                ORDER BY timestamp ASC
            """
            df_history = conn.execute(query).fetchdf()
            
            if df_history.empty:
                return {}
                
            latest = df_history.iloc[-1]
            cycles = int(latest["cycle_count"])
            soh = float(latest["soh"])
            
            # 1. Degradation Rate and Linear/Power RUL projection
            if cycles > 20:
                deg_rate = (100.0 - soh) / cycles
                expected_cycles_eol = int((soh - SOH_EOL_THRESHOLD) / deg_rate) if deg_rate > 0 else 500
            else:
                expected_cycles_eol = 1500 - cycles
                
            # 2. Weibull Survival Probability Curve
            # Generate points showing survival probability over future cycles
            future_cycles = np.linspace(cycles, cycles + 1000, 20)
            survival_probabilities = []
            
            for fc in future_cycles:
                # S(fc) = exp( -(fc/L)^k )
                prob = np.exp(-((fc / WEIBULL_SCALE_LAMBDA) ** WEIBULL_SHAPE_K))
                survival_probabilities.append({
                    "cycle_count": int(fc),
                    "survival_probability": np.round(float(prob) * 100.0, 1)
                })
                
            # Format history for charts
            history_list = []
            for _, row in df_history.iterrows():
                history_list.append({
                    "timestamp": row["timestamp"].isoformat(),
                    "soh": float(row["soh"]),
                    "cycle_count": int(row["cycle_count"]),
                    "temperature": float(row["temperature"])
                })
                
            return {
                "battery_id": battery_id,
                "current_cycles": cycles,
                "current_soh": soh,
                "estimated_remaining_cycles": max(0, expected_cycles_eol),
                "survival_probability": np.round(np.exp(-((cycles / WEIBULL_SCALE_LAMBDA) ** WEIBULL_SHAPE_K)) * 100.0, 1),
                "history": history_list,
                "survival_curve": survival_probabilities
            }
        except Exception as e:
            logger.error("Failed to fetch profile for battery %s: %s", battery_id, e)
            raise e
        finally:
            conn.close()

    @staticmethod
    def ingest_telemetry(records: List[Dict[str, Any]], db: Session) -> Dict[str, Any]:
        """Appends new telemetry logs to the Parquet database and registers a data quality audit."""
        parquet_path = FleetIntelligenceService._get_parquet_path()
        
        # Convert records to DataFrame
        df_new = pd.DataFrame(records)
        
        # Ensure correct column types
        df_new["timestamp"] = pd.to_datetime(df_new["timestamp"])
        df_new["soh"] = df_new["soh"].astype(float)
        df_new["soc"] = df_new["soc"].astype(float)
        df_new["cycle_count"] = df_new["cycle_count"].astype(int)
        df_new["temperature"] = df_new["temperature"].astype(float)
        
        # Basic Validation check
        null_count = int(df_new.isnull().sum().sum())
        out_of_bounds_soh = int(((df_new["soh"] < 0) | (df_new["soh"] > 100)).sum())
        
        # Log to Data Quality table
        from backend.app.models.schemas import DataQualityLog
        dq_log = DataQualityLog(
            dataset_name="battery_telemetry_parquet",
            records_scanned=len(df_new),
            null_count=null_count,
            duplicates_count=0,
            boundary_violations=out_of_bounds_soh,
            status="PASS" if out_of_bounds_soh == 0 else "WARNING",
            remediation_applied="Ingested batch logs successfully."
        )
        db.add(dq_log)
        db.commit()
        
        # Append to existing parquet
        if os.path.exists(parquet_path):
            try:
                df_existing = pd.read_parquet(parquet_path)
                df_combined = pd.concat([df_existing, df_new], ignore_index=True)
                df_combined.to_parquet(parquet_path, index=False)
            except Exception as e:
                logger.error("Failed to append to existing parquet: %s", e)
                df_new.to_parquet(parquet_path, index=False)
        else:
            df_new.to_parquet(parquet_path, index=False)
            
        return {
            "status": "success",
            "records_ingested": len(df_new),
            "data_quality": {
                "null_count": null_count,
                "boundary_violations": out_of_bounds_soh
            }
        }
