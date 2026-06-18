"""Insight engine endpoint."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.insight_engine.engine import generate_insights
from app.models.schemas import InsightReport

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("", response_model=InsightReport)
def get_insights(db: Session = Depends(get_db)):
    try:
        return generate_insights(db)
    except Exception as e:
        logger.error("Insights generation failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
