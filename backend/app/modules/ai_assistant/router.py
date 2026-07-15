from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.modules.ai_assistant.service import AIAssistantService

router = APIRouter(prefix="/ai-assistant", tags=["AI Decision Assistant"])

class AIQueryRequest(BaseModel):
    query: str

@router.post("/query")
def query_decision_assistant(
    payload: AIQueryRequest,
    db: Session = Depends(get_db)
):
    """Processes natural language operational queries and returns grounded executive brief answers."""
    try:
        if not payload.query or not payload.query.strip():
            raise HTTPException(status_code=400, detail="Query string cannot be empty.")
            
        result = AIAssistantService.answer_decision_query(payload.query, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI assistant execution failed: {str(e)}")
