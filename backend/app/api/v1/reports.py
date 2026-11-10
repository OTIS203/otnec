from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.entities import Alert, Device, Network, User
from app.services.reporting import generate_csv_inventory, generate_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports & Export"])


@router.get("/export/csv")
def export_csv_inventory(
    network_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Device)
        .join(Network)
        .where(Device.network_id == network_id, Network.tenant_id == current_user.tenant_id)
        .options(selectinload(Device.ports))
    )
    devices = list(db.execute(stmt).scalars().all())

    csv_content = generate_csv_inventory(devices)
    filename = f"netscope_inventory_{network_id}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/pdf")
def export_pdf_report(
    network_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    net_stmt = select(Network).where(
        Network.id == network_id,
        Network.tenant_id == current_user.tenant_id,
    )
    network = db.execute(net_stmt).scalar_one_or_none()
    if not network:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")

    dev_stmt = (
        select(Device)
        .where(Device.network_id == network_id)
        .options(selectinload(Device.ports))
    )
    devices = list(db.execute(dev_stmt).scalars().all())

    alt_stmt = select(Alert).where(Alert.network_id == network_id)
    alerts = list(db.execute(alt_stmt).scalars().all())

    pdf_bytes = generate_pdf_report(network, devices, alerts)
    filename = f"netscope_audit_report_{network.name.replace(' ', '_')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
