from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.models.entities import Agent, Network
from app.schemas.schemas import IngestReport
from app.services.inventory import process_scan_report

router = APIRouter(prefix="/agents", tags=["Agents & Ingestion"])


class EnrollPayload(BaseModel):
    token: str
    agent_uuid: str
    hostname: str
    agent_version: str = "1.0.0"


class HeartbeatPayload(BaseModel):
    agent_uuid: str
    cpu_usage_pct: float = 0.0
    memory_usage_mb: float = 0.0


@router.post("/enroll")
def enroll_agent(payload: EnrollPayload, db: Session = Depends(get_db)):
    stmt = select(Network)
    network = db.execute(stmt).scalars().first()

    if not network:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No network configured. Please register a network first.",
        )

    stmt = select(Agent).where(Agent.agent_uuid == payload.agent_uuid)
    agent = db.execute(stmt).scalar_one_or_none()

    if not agent:
        agent = Agent(
            network_id=network.id,
            agent_uuid=payload.agent_uuid,
            hostname=payload.hostname,
            status="online",
            last_heartbeat=datetime.now(timezone.utc),
        )
        db.add(agent)
    else:
        agent.hostname = payload.hostname
        agent.status = "online"
        agent.last_heartbeat = datetime.now(timezone.utc)

    db.commit()
    db.refresh(agent)

    token = create_access_token(subject=agent.id)
    return {"access_token": token, "network_id": network.id}


@router.post("/telemetry")
def ingest_telemetry(report: IngestReport, db: Session = Depends(get_db)):
    stmt = select(Network).where(Network.cidr_v4 == report.subnet)
    network = db.execute(stmt).scalar_one_or_none()

    if not network:
        stmt = select(Network)
        network = db.execute(stmt).scalars().first()
        if not network:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target network not registered")

    new_devs, updated_devs = process_scan_report(db, network, report)
    db.commit()

    return {
        "success": True,
        "new_devices": new_devs,
        "updated_devices": updated_devs,
        "security_score": network.security_score,
    }


@router.post("/heartbeat")
def agent_heartbeat(payload: HeartbeatPayload, db: Session = Depends(get_db)):
    stmt = select(Agent).where(Agent.agent_uuid == payload.agent_uuid)
    agent = db.execute(stmt).scalar_one_or_none()
    if agent:
        agent.last_heartbeat = datetime.now(timezone.utc)
        agent.status = "online"
        db.commit()
    return {"status": "ok"}
