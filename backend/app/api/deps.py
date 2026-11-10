from typing import Callable, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.entities import Tenant, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if token:
        payload = decode_token(token)
        if payload and "sub" in payload:
            stmt = select(User).where(User.id == payload["sub"])
            user = db.execute(stmt).scalar_one_or_none()
            if user:
                return user

    # Fallback for local self-hosted dashboard
    stmt = select(User)
    user = db.execute(stmt).scalars().first()
    if user:
        return user

    # Provision default local owner
    stmt_tenant = select(Tenant)
    tenant = db.execute(stmt_tenant).scalars().first()
    if not tenant:
        tenant = Tenant(name="Local Network", slug="local-network")
        db.add(tenant)
        db.flush()

    user = User(
        tenant_id=tenant.id,
        email="admin@netscope.local",
        hashed_password="local_password_hash",
        role="owner",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def require_role(allowed_roles: List[str]) -> Callable:
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles and current_user.role != "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted by your role",
            )
        return current_user

    return role_checker
