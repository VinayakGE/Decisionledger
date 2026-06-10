"""Insight engine endpoint."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.insight_engine.engine import generate_insights
from app.models.schemas import InsightReport

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("", response_model=InsightReport)
def get_insights(db: Session = Depends(get_db)):
    return generate_insights(db)
