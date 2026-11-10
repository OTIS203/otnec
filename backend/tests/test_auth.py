from sqlalchemy.orm import Session

from app.api.v1.auth import login, register
from app.main import health_check
from app.schemas.schemas import UserLogin, UserRegister


def test_health_check_endpoint():
    res = health_check()
    assert res["status"] == "healthy"
    assert res["service"] == "NetScope"


def test_user_registration_and_login_flow(db_session: Session):
    # 1. Register new tenant & owner
    reg_in = UserRegister(
        email="admin@netscope.io",
        password="SuperSecretPassword123!",
        tenant_name="ACME Security Labs",
    )
    user = register(reg_in, db=db_session)
    assert user.email == "admin@netscope.io"
    assert user.role == "owner"

    # 2. Login with valid credentials
    login_in = UserLogin(
        email="admin@netscope.io",
        password="SuperSecretPassword123!",
    )
    token_resp = login_in_resp = login(login_in, db=db_session)
    assert token_resp.access_token != ""
    assert token_resp.requires_mfa is False
