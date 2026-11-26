import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

logger = logging.getLogger("otnet.database")

# Determine connection URL (prefers SUPABASE_DB_URL if defined, falls back to DATABASE_SYNC_URL)
raw_url = settings.SUPABASE_DB_URL or settings.DATABASE_SYNC_URL

# SQLAlchemy requires postgresql:// instead of legacy postgres://
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql://", 1)

db_url = raw_url

engine_kwargs = {
    "echo": False,
    "pool_pre_ping": True,
}

if "sqlite" in db_url:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine = create_engine(db_url, **engine_kwargs)
else:
    # PostgreSQL / Supabase pool configuration
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_recycle"] = 300
    try:
        temp_engine = create_engine(db_url, **engine_kwargs)
        with temp_engine.connect() as conn:
            pass
        engine = temp_engine
        logger.info("Successfully connected to primary cloud PostgreSQL database.")
    except Exception as e:
        logger.warning(f"Cloud database unreachable ({e}). Automatically falling back to local SQLite database.")
        db_url = "sqlite:///./netscope.db"
        engine = create_engine(db_url, echo=False, pool_pre_ping=True, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """Initialize schema tables and seed baseline admin if database is empty."""
    Base.metadata.create_all(bind=engine)

    try:
        from app.models.entities import Tenant, User, Network, FilterPolicy
        from app.core.security import get_password_hash
        from sqlalchemy import select

        with SessionLocal() as db:
            existing_user = db.execute(select(User)).first()
            if not existing_user:
                logger.info("Empty database detected. Seeding baseline OTNET entities...")
                tenant = Tenant(name="Acme Corporation", slug="acme-corp")
                db.add(tenant)
                db.flush()

                admin_user = User(
                    tenant_id=tenant.id,
                    email="admin@otnet.io",
                    hashed_password=get_password_hash("OtnetSecure2026!"),
                    role="owner",
                    mfa_enabled=False,
                )
                db.add(admin_user)

                analyst_user = User(
                    tenant_id=tenant.id,
                    email="analyst@acme-corp.com",
                    hashed_password=get_password_hash("demo1234"),
                    role="analyst",
                    mfa_enabled=False,
                )
                db.add(analyst_user)

                network = Network(
                    tenant_id=tenant.id,
                    name="Headquarters LAN",
                    cidr_v4="192.168.0.0/24",
                    gateway_ip="192.168.0.1",
                    security_score=92,
                    enrollment_token="otnet_live_948a2bc7190d",
                )
                db.add(network)
                db.flush()

                # Seed default business hours access policy
                policy = FilterPolicy(
                    network_id=network.id,
                    block_social_media=True,
                    block_streaming=False,
                    block_gaming=False,
                    schedule_enabled=True,
                    schedule_work_start="08:00",
                    schedule_work_end="17:00",
                    schedule_lunch_start="12:00",
                    schedule_lunch_end="13:00",
                    schedule_weekdays_only=True,
                )
                db.add(policy)

                db.commit()
                logger.info("Successfully seeded admin@otnet.io and baseline policies into database.")
    except Exception as e:
        logger.warning(f"Note on initial seed (tables may already be initialized): {e}")
