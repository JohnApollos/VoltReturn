import logging
import os
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, roc_curve, auc
from sqlalchemy.orm import Session

from backend.app.core.model_governance import ModelGovernanceManager

logger = logging.getLogger(__name__)

# Model features
FEATURES_DEFAULT = [
    "Distance_to_BSS_km", 
    "Income_Volatility", 
    "Daily_Income_KES", 
    "Net_Savings_KES"
]

FEATURES_CHURN = [
    "Distance_to_BSS_km",
    "Income_Volatility",
    "Daily_Distance_km",
    "Net_Savings_KES"
]

class RiderIntelligenceService:
    """Manages training and prediction services for customer credit default and churn risks."""
    
    def __init__(self) -> None:
        self.default_model = LogisticRegression(random_state=42)
        self.churn_model = LogisticRegression(random_state=42)
        
        self.default_scaler = StandardScaler()
        self.churn_scaler = StandardScaler()
        
        self.is_default_trained = False
        self.is_churn_trained = False
        
    def train_models(self, db: Session, data_path: str = "data/rider_loans.csv") -> Dict[str, Any]:
        """Loads simulated rider profiles, trains models, and updates Model Governance registry."""
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
        full_data_path = os.path.join(project_root, data_path)
        
        if not os.path.exists(full_data_path):
            raise FileNotFoundError(f"Rider loan data not found at {full_data_path}. Simulate it first.")
            
        df = pd.read_csv(full_data_path)
        
        # --- 1. TRAIN DEFAULT MODEL ---
        X_def = df[FEATURES_DEFAULT]
        y_def = df["Default_Indicator"]
        
        X_def_scaled = self.default_scaler.fit_transform(X_def)
        self.default_model.fit(X_def_scaled, y_def)
        self.is_default_trained = True
        
        y_def_pred = self.default_model.predict(X_def_scaled)
        y_def_prob = self.default_model.predict_proba(X_def_scaled)[:, 1]
        
        def_acc = float(accuracy_score(y_def, y_def_pred))
        fpr, tpr, _ = roc_curve(y_def, y_def_prob)
        def_auc = float(auc(fpr, tpr))
        
        # Log default model to governance
        ModelGovernanceManager.register_model(
            model_id="MODEL-CREDIT-DEFAULT-V1",
            name="PAYG Boda Boda Credit Default Model",
            version="1.0.0",
            features=FEATURES_DEFAULT,
            parameters={
                "coefficients": self.default_model.coef_[0].tolist(),
                "intercept": float(self.default_model.intercept_[0]),
                "scaler_mean": self.default_scaler.mean_.tolist(),
                "scaler_scale": self.default_scaler.scale_.tolist()
            },
            validation_metrics={
                "accuracy": def_acc,
                "auc": def_auc
            },
            assumptions="Credit default risk escalates with distance to nearest battery swap station and earnings volatility.",
            db=db
        )
        
        # --- 2. TRAIN CHURN MODEL ---
        X_ch = df[FEATURES_CHURN]
        y_ch = df["Churn_Indicator"]
        
        X_ch_scaled = self.churn_scaler.fit_transform(X_ch)
        self.churn_model.fit(X_ch_scaled, y_ch)
        self.is_churn_trained = True
        
        y_ch_pred = self.churn_model.predict(X_ch_scaled)
        y_ch_prob = self.churn_model.predict_proba(X_ch_scaled)[:, 1]
        
        ch_acc = float(accuracy_score(y_ch, y_ch_pred))
        fpr_c, tpr_c, _ = roc_curve(y_ch, y_ch_prob)
        ch_auc = float(auc(fpr_c, tpr_c))
        
        # Log churn model to governance
        ModelGovernanceManager.register_model(
            model_id="MODEL-RIDER-CHURN-V1",
            name="Rider Attrition and Churn Model",
            version="1.0.0",
            features=FEATURES_CHURN,
            parameters={
                "coefficients": self.churn_model.coef_[0].tolist(),
                "intercept": float(self.churn_model.intercept_[0]),
                "scaler_mean": self.churn_scaler.mean_.tolist(),
                "scaler_scale": self.churn_scaler.scale_.tolist()
            },
            validation_metrics={
                "accuracy": ch_acc,
                "auc": ch_auc
            },
            assumptions="Rider churn is sensitive to travel distance and net fuel cost savings.",
            db=db
        )
        
        logger.info("Successfully trained default model (AUC=%.3f) and churn model (AUC=%.3f)", def_auc, ch_auc)
        return {
            "default_model": {"accuracy": def_acc, "auc": def_auc},
            "churn_model": {"accuracy": ch_acc, "auc": ch_auc}
        }

    def evaluate_portfolio(self, db: Session, new_distances: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """Evaluates overall credit exposure and rider churn rates across the portfolio."""
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
        data_path = os.path.join(project_root, "data/rider_loans.csv")
        
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Rider loan data not found at {data_path}.")
            
        df = pd.read_csv(data_path)
        
        # If new distances are provided (post network expansion), update the dataframe
        if new_distances is not None:
            df["Distance_to_BSS_km"] = new_distances
            
        # Re-train models if not already trained during session lifecycle
        if not self.is_default_trained or not self.is_churn_trained:
            self.train_models(db)
            
        # 1. Compute default probabilities
        X_def = df[FEATURES_DEFAULT]
        X_def_scaled = self.default_scaler.transform(X_def)
        default_probs = self.default_model.predict_proba(X_def_scaled)[:, 1]
        
        # 2. Compute churn probabilities
        X_ch = df[FEATURES_CHURN]
        X_ch_scaled = self.churn_scaler.transform(X_ch)
        churn_probs = self.churn_model.predict_proba(X_ch_scaled)[:, 1]
        
        # Calculate rates
        avg_default_rate = float(np.mean(default_probs))
        avg_churn_rate = float(np.mean(churn_probs))
        
        # High risk thresholds
        high_risk_default_count = int(np.sum(default_probs > 0.15))
        high_risk_churn_count = int(np.sum(churn_probs > 0.15))
        
        return {
            "total_portfolio_riders": len(df),
            "expected_default_rate_pct": np.round(avg_default_rate * 100.0, 2),
            "expected_churn_rate_pct": np.round(avg_churn_rate * 100.0, 2),
            "high_risk_default_riders": high_risk_default_count,
            "high_risk_churn_riders": high_risk_churn_count,
            "default_exposure_reduction_pct": np.round((0.049 - avg_default_rate) * 100.0, 2)  # Relative to baseline
        }
        
    def get_rider_cohort(self) -> List[Dict[str, Any]]:
        """Loads a slice of simulated riders for dashboard mapping."""
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
        data_path = os.path.join(project_root, "data/rider_loans.csv")
        if not os.path.exists(data_path):
            return []
        df = pd.read_csv(data_path)
        # return first 200 riders to reduce payload size on maps
        return df.head(200).to_dict(orient="records")
