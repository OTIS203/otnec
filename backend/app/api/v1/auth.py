from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    generate_totp_secret,
    get_password_hash,
    get_totp_uri,
    verify_password,
    verify_totp,
)
from app.models.entities import Tenant, User
from app.schemas.schemas import Token, UserLogin, UserOut, UserRegister

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    stmt = select(User).where(User.email == user_in.email)
    if db.execute(stmt).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists",
        )

    slug = user_in.tenant_name.lower().replace(" ", "-")
    tenant = Tenant(name=user_in.tenant_name, slug=slug)
    db.add(tenant)
    db.flush()

    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        tenant_id=tenant.id,
        email=user_in.email,
        hashed_password=hashed_pwd,
        role="owner",
        mfa_enabled=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    stmt = select(User).where(User.email == credentials.email)
    user = db.execute(stmt).scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.mfa_enabled:
        if not credentials.totp_code:
            return Token(access_token="", requires_mfa=True)
        if not verify_totp(user.mfa_secret, credentials.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid two-factor authentication code",
            )

    token = create_access_token(subject=user.id)
    return Token(access_token=token, requires_mfa=False)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/mfa/setup")
def setup_mfa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    secret = generate_totp_secret()
    uri = get_totp_uri(secret, current_user.email)
    current_user.mfa_secret = secret
    db.commit()
    return {"secret": secret, "provisioning_uri": uri}


@router.post("/mfa/verify")
def verify_and_enable_mfa(code: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA setup has not been initiated")
    if not verify_totp(current_user.mfa_secret, code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    current_user.mfa_enabled = True
    db.commit()
    return {"message": "Two-factor authentication successfully enabled"}
