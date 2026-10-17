import logging
import os
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.core.model_governance import ModelGovernanceManager

logger = logging.getLogger(__name__)

class StandardScaler:
    """Pure NumPy standard feature normalizer."""
    def __init__(self) -> None:
        self.mean_ = None
        self.scale_ = None

    def fit(self, X: Any) -> "StandardScaler":
        arr = np.array(X, dtype=float)
        self.mean_ = np.mean(arr, axis=0)
        self.scale_ = np.std(arr, axis=0)
        self.scale_[self.scale_ == 0] = 1.0
        return self

    def transform(self, X: Any) -> np.ndarray:
        arr = np.array(X, dtype=float)
        return (arr - self.mean_) / self.scale_

    def fit_transform(self, X: Any) -> np.ndarray:
        return self.fit(X).transform(X)

class LogisticRegression:
    """Pure NumPy vector gradient-descent Logistic Regression model."""
    def __init__(self, random_state: int = 42, lr: float = 0.1, max_iter: int = 400) -> None:
        self.random_state = random_state
        self.lr = lr
        self.max_iter = max_iter
        self.coef_ = None
        self.intercept_ = None

    def fit(self, X: Any, y: Any) -> "LogisticRegression":
        rng = np.random.RandomState(self.random_state)
        X_arr = np.array(X, dtype=float)
        y_arr = np.array(y, dtype=float)
        N, D = X_arr.shape
        w = rng.normal(0, 0.01, size=D)
        b = 0.0

        for _ in range(self.max_iter):
            z = X_arr @ w + b
            p = 1.0 / (1.0 + np.exp(-np.clip(z, -25.0, 25.0)))
            grad_w = (X_arr.T @ (p - y_arr)) / N
            grad_b = np.mean(p - y_arr)
            w -= self.lr * grad_w
            b -= self.lr * grad_b

        self.coef_ = np.array([w])
        self.intercept_ = np.array([b])
        return self

    def predict_proba(self, X: Any) -> np.ndarray:
        X_arr = np.array(X, dtype=float)
        z = X_arr @ self.coef_[0] + self.intercept_[0]
        p = 1.0 / (1.0 + np.exp(-np.clip(z, -25.0, 25.0)))
        return np.column_stack([1.0 - p, p])

    def predict(self, X: Any) -> np.ndarray:
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)

def accuracy_score(y_true: Any, y_pred: Any) -> float:
    return float(np.mean(np.asarray(y_true) == np.asarray(y_pred)))

def compute_auc(y_true: Any, y_prob: Any) -> float:
    """Computes Area Under ROC curve via Mann-Whitney rank statistic."""
    y_t = np.asarray(y_true)
    y_p = np.asarray(y_prob)
    pos = y_p[y_t == 1]
    neg = y_p[y_t == 0]
    if len(pos) == 0 or len(neg) == 0:
        return 0.5
    return float(np.mean(pos[:, None] > neg) + 0.5 * np.mean(pos[:, None] == neg))

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
        
    @staticmethod
    def _get_data_path(custom_data_path: str = "data/rider_loans.csv") -> str:
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        full_data_path = os.path.join(project_root, custom_data_path).replace("\\", "/")
        if os.environ.get("VERCEL"):
            tmp_path = "/tmp/rider_loans.csv"
            if not os.path.exists(tmp_path):
                import shutil
                try:
                    shutil.copy2(full_data_path, tmp_path)
                except Exception as e:
                    logger.error("Failed to copy rider_loans.csv to /tmp: %s", e)
            full_data_path = tmp_path
        return full_data_path

    def train_models(self, db: Session, data_path: str = "data/rider_loans.csv") -> Dict[str, Any]:
        """Loads simulated rider profiles, trains models, and updates Model Governance registry."""
        full_data_path = RiderIntelligenceService._get_data_path(data_path)
        
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
        def_auc = float(compute_auc(y_def, y_def_prob))
        
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
        ch_auc = float(compute_auc(y_ch, y_ch_prob))
        
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
        data_path = RiderIntelligenceService._get_data_path("data/rider_loans.csv")
        
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
        data_path = RiderIntelligenceService._get_data_path("data/rider_loans.csv")
        if not os.path.exists(data_path):
            return []
        df = pd.read_csv(data_path)
        # return first 200 riders to reduce payload size on maps
        return df.head(200).to_dict(orient="records")
