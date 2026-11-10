from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.entities import Alert, Network, User
from app.schemas.schemas import AlertOut

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertOut])
def list_alerts(
    network_id: Optional[str] = None,
    severity: Optional[str] = None,
    unacknowledged_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Alert)
        .join(Network)
        .where(Network.tenant_id == current_user.tenant_id)
        .order_by(Alert.created_at.desc())
    )

    if network_id:
        stmt = stmt.where(Alert.network_id == network_id)
    if severity:
        stmt = stmt.where(Alert.severity == severity)
    if unacknowledged_only:
        stmt = stmt.where(Alert.is_acknowledged == False)

    return list(db.execute(stmt).scalars().all())


@router.post("/{alert_id}/ack")
def acknowledge_alert(
    alert_id: str,
    current_user: User = Depends(require_role(["owner", "admin"])),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Alert)
        .join(Network)
        .where(Alert.id == alert_id, Network.tenant_id == current_user.tenant_id)
    )
    alert = db.execute(stmt).scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.is_acknowledged = True
    db.commit()
    return {"message": "Alert acknowledged"}
