import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from backend.app.core.database import Base

class Recommendation(Base):
    __tablename__ = "recommendations"

    rec_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    module = Column(String(50), nullable=False)
    action_proposed = Column(String(255), nullable=False)
    parameters = Column(Text, nullable=True)  # JSON-encoded parameters
    confidence_score = Column(Float, nullable=False)
    status = Column(String(50), default="PROPOSED")  # PROPOSED, ACCEPTED, REJECTED, MONITORED
    predicted_impact = Column(Text, nullable=True)  # JSON-encoded predicted metric changes
    observed_impact = Column(Text, nullable=True)   # JSON-encoded observed metrics
    error_margin = Column(Float, nullable=True)

class ModelGovernance(Base):
    __tablename__ = "model_governance"

    model_id = Column(String(100), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    date_trained = Column(DateTime, default=datetime.datetime.utcnow)
    validation_metrics = Column(Text, nullable=True)  # JSON-encoded metric scorecards
    features_used = Column(Text, nullable=True)       # JSON-encoded list of features
    parameters = Column(Text, nullable=True)          # JSON-encoded coefficient parameters
    assumptions = Column(Text, nullable=True)         # Biases, boundaries, parameters

class DataQualityLog(Base):
    __tablename__ = "data_quality_logs"

    check_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    dataset_name = Column(String(100), nullable=False)
    completeness = Column(Float, nullable=False)
    duplicates_count = Column(Integer, nullable=False)
    anomaly_rate = Column(Float, nullable=False)
    status = Column(String(50), nullable=False)  # PASS, WARNING, FAIL
    usability_score = Column(Float, nullable=False)
