from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.entities import Network, NetworkMetric, User
from app.schemas.schemas import MetricOut

router = APIRouter(prefix="/metrics", tags=["Network Metrics & Health"])


@router.get("/{network_id}", response_model=List[MetricOut])
def get_network_metrics(
    network_id: str,
    limit: int = Query(default=50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(NetworkMetric)
        .join(Network)
        .where(NetworkMetric.network_id == network_id, Network.tenant_id == current_user.tenant_id)
        .order_by(NetworkMetric.recorded_at.desc())
        .limit(limit)
    )
    return list(reversed(list(db.execute(stmt).scalars().all())))
