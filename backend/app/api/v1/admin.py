from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.entities import User, Tenant, Network, Device, DNSQueryLog

router = APIRouter(prefix="/admin", tags=["Admin"])


class AdminUserOut(BaseModel):
    id: str
    email: str
    role: str
    tenant_id: str
    tenant_name: str
    mfa_enabled: bool
    created_at: datetime


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "admin"
    tenant_name: str = "Headquarters"


class AdminRoleUpdate(BaseModel):
    role: str


class AdminOverviewStats(BaseModel):
    total_users: int
    total_tenants: int
    total_networks: int
    total_devices: int
    total_queries: int


@router.get("/users", response_model=List[AdminUserOut])
def list_users(db: Session = Depends(get_db)):
    users = db.execute(select(User)).scalars().all()
    results = []
    for u in users:
        tenant = db.execute(select(Tenant).where(Tenant.id == u.tenant_id)).scalar_one_or_none()
        results.append(
            AdminUserOut(
                id=u.id,
                email=u.email,
                role=u.role,
                tenant_id=u.tenant_id,
                tenant_name=tenant.name if tenant else "Default Org",
                mfa_enabled=u.mfa_enabled,
                created_at=u.created_at,
            )
        )
    return results


@router.post("/users", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: AdminUserCreate, db: Session = Depends(get_db)):
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    slug = payload.tenant_name.lower().replace(" ", "-")
    tenant = db.execute(select(Tenant).where(Tenant.slug == slug)).scalar_one_or_none()
    if not tenant:
        tenant = Tenant(name=payload.tenant_name, slug=slug)
        db.add(tenant)
        db.flush()

    user = User(
        tenant_id=tenant.id,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        mfa_enabled=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AdminUserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        tenant_id=user.tenant_id,
        tenant_name=tenant.name,
        mfa_enabled=user.mfa_enabled,
        created_at=user.created_at,
    )


@router.put("/users/{user_id}/role", response_model=AdminUserOut)
def update_user_role(user_id: str, payload: AdminRoleUpdate, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.role = payload.role
    db.commit()
    db.refresh(user)

    tenant = db.execute(select(Tenant).where(Tenant.id == user.tenant_id)).scalar_one_or_none()
    return AdminUserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        tenant_id=user.tenant_id,
        tenant_name=tenant.name if tenant else "Default Org",
        mfa_enabled=user.mfa_enabled,
        created_at=user.created_at,
    )


@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": "User successfully deleted"}


@router.get("/overview", response_model=AdminOverviewStats)
def get_overview_stats(db: Session = Depends(get_db)):
    total_users = db.scalar(select(func.count(User.id))) or 0
    total_tenants = db.scalar(select(func.count(Tenant.id))) or 0
    total_networks = db.scalar(select(func.count(Network.id))) or 0
    total_devices = db.scalar(select(func.count(Device.id))) or 0
    total_queries = db.scalar(select(func.count(DNSQueryLog.id))) or 0

    return AdminOverviewStats(
        total_users=total_users,
        total_tenants=total_tenants,
        total_networks=total_networks,
        total_devices=total_devices,
        total_queries=total_queries,
    )
