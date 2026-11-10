from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.entities import Network, User
from app.schemas.schemas import NetworkCreate, NetworkOut

router = APIRouter(prefix="/networks", tags=["Networks"])


@router.get("", response_model=List[NetworkOut])
def list_networks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Network).where(Network.tenant_id == current_user.tenant_id)
    return list(db.execute(stmt).scalars().all())


@router.post("", response_model=NetworkOut, status_code=status.HTTP_201_CREATED)
def create_network(
    net_in: NetworkCreate,
    current_user: User = Depends(require_role(["owner", "admin"])),
    db: Session = Depends(get_db),
):
    network = Network(
        tenant_id=current_user.tenant_id,
        name=net_in.name,
        cidr_v4=net_in.cidr_v4,
        gateway_ip=net_in.gateway_ip,
        security_score=100,
    )
    db.add(network)
    db.commit()
    db.refresh(network)
    return network


@router.get("/{network_id}", response_model=NetworkOut)
def get_network(
    network_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Network).where(
        Network.id == network_id,
        Network.tenant_id == current_user.tenant_id,
    )
    network = db.execute(stmt).scalar_one_or_none()
    if not network:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
    return network
