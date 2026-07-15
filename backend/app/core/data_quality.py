import datetime
import pandas as pd
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.models.schemas import DataQualityLog

class DataQualityEngine:
    """Validator that checks completeness, duplicates, and range anomalies of incoming data."""
    
    @staticmethod
    def run_check(
        df: pd.DataFrame, 
        dataset_name: str, 
        db: Session, 
        range_rules: Dict[str, Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        """Runs validation checks on a dataframe and logs metrics to SQLite.
        
        Args:
            df (pd.DataFrame): Target dataframe to evaluate.
            dataset_name (str): Label of the dataset.
            db (Session): SQLite database session.
            range_rules (Dict[str, Tuple[float, float]]): Col name mapping to (min_val, max_val).
        
        Returns:
            Dict[str, Any]: Checked metric summary.
        """
        if df.empty:
            return {
                "dataset_name": dataset_name,
                "completeness": 0.0,
                "duplicates_count": 0,
                "anomaly_rate": 1.0,
                "status": "FAIL",
                "usability_score": 0.0
            }
            
        total_records = len(df)
        total_cells = df.size
        
        # 1. Completeness: Non-null cell count ratio
        non_null_cells = df.notnull().sum().sum()
        completeness = float(non_null_cells / total_cells) if total_cells > 0 else 0.0
        
        # 2. Duplicates: Duplicate rows count
        duplicates_count = int(df.duplicated().sum())
        
        # 3. Anomaly Rate: Count fields falling out of bounds
        out_of_bounds_count = 0
        total_checked_bounds = 0
        
        if range_rules:
            for col, (min_val, max_val) in range_rules.items():
                if col in df.columns:
                    # Drop nulls for checking bounds
                    vals = df[col].dropna()
                    if len(vals) > 0:
                        total_checked_bounds += len(vals)
                        anomalies = vals[(vals < min_val) | (vals > max_val)]
                        out_of_bounds_count += len(anomalies)
                        
        anomaly_rate = float(out_of_bounds_count / total_checked_bounds) if total_checked_bounds > 0 else 0.0
        
        # 4. Usability Score calculation
        # Deduct score for low completeness, duplicate ratios, and high anomalies
        comp_penalty = (1.0 - completeness) * 100
        dup_penalty = min((duplicates_count / total_records) * 50, 50) if total_records > 0 else 0.0
        anomaly_penalty = anomaly_rate * 100
        
        usability_score = max(100.0 - comp_penalty - dup_penalty - anomaly_penalty, 0.0)
        
        # Determine status
        if usability_score >= 85.0:
            status = "PASS"
        elif usability_score >= 60.0:
            status = "WARNING"
        else:
            status = "FAIL"
            
        # Log to Database
        log_entry = DataQualityLog(
            timestamp=datetime.datetime.utcnow(),
            dataset_name=dataset_name,
            completeness=completeness,
            duplicates_count=duplicates_count,
            anomaly_rate=anomaly_rate,
            status=status,
            usability_score=usability_score
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        
        return {
            "check_id": log_entry.check_id,
            "dataset_name": dataset_name,
            "completeness": completeness,
            "duplicates_count": duplicates_count,
            "anomaly_rate": anomaly_rate,
            "status": status,
            "usability_score": usability_score
        }
