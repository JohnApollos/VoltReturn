import datetime
import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models.schemas import ModelGovernance

class ModelGovernanceManager:
    """Manages tracking, auditing, and registry metadata for machine learning models."""
    
    @staticmethod
    def register_model(
        model_id: str,
        name: str,
        version: str,
        features: List[str],
        parameters: Dict[str, Any],
        validation_metrics: Dict[str, Any],
        assumptions: str,
        db: Session
    ) -> ModelGovernance:
        """Registers or updates a model record in SQLite.
        
        Args:
            model_id (str): Unique identifier.
            name (str): Readable name.
            version (str): Semantic version.
            features (List[str]): List of column names used in model.
            parameters (Dict[str, Any]): Weights, parameters, coefficients.
            validation_metrics (Dict[str, Any]): Test results (MSE, Accuracy, AUC).
            assumptions (str): Documentation of limitations/conditions.
            db (Session): Database session.
            
        Returns:
            ModelGovernance: The registered model object.
        """
        # Check if model exists
        existing = db.query(ModelGovernance).filter(ModelGovernance.model_id == model_id).first()
        
        if existing:
            existing.name = name
            existing.version = version
            existing.date_trained = datetime.datetime.utcnow()
            existing.features_used = json.dumps(features)
            existing.parameters = json.dumps(parameters)
            existing.validation_metrics = json.dumps(validation_metrics)
            existing.assumptions = assumptions
            db.commit()
            db.refresh(existing)
            return existing
        else:
            new_model = ModelGovernance(
                model_id=model_id,
                name=name,
                version=version,
                date_trained=datetime.datetime.utcnow(),
                features_used=json.dumps(features),
                parameters=json.dumps(parameters),
                validation_metrics=json.dumps(validation_metrics),
                assumptions=assumptions
            )
            db.add(new_model)
            db.commit()
            db.refresh(new_model)
            return new_model

    @staticmethod
    def get_model_details(model_id: str, db: Session) -> Dict[str, Any]:
        """Retrieves and decodes registry metrics of a specific model.
        
        Args:
            model_id (str): Target model ID.
            db (Session): Database session.
            
        Returns:
            Dict[str, Any]: Decoded model metadata dictionary.
        """
        model = db.query(ModelGovernance).filter(ModelGovernance.model_id == model_id).first()
        if not model:
            return {}
            
        return {
            "model_id": model.model_id,
            "name": model.name,
            "version": model.version,
            "date_trained": model.date_trained.isoformat(),
            "features_used": json.loads(model.features_used) if model.features_used else [],
            "parameters": json.loads(model.parameters) if model.parameters else {},
            "validation_metrics": json.loads(model.validation_metrics) if model.validation_metrics else {},
            "assumptions": model.assumptions
        }
