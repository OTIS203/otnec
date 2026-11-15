import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.database import get_db
from app.models.entities import DNSQueryLog, FilterPolicy, Network, Device
from app.schemas.dns import (
    DNSQueryLogResponse,
    DNSQueryLogCreate,
    FilterPolicyResponse,
    FilterPolicyUpdate,
    DNSStatsResponse,
)

router = APIRouter(prefix="/filtering", tags=["content-filtering"])


def evaluate_schedule(policy: FilterPolicy) -> tuple[bool, str, bool]:
    """
    Evaluates work hours and lunch schedules.
    Returns (effective_block_social, status_text, is_schedule_active).
    """
    if not policy.schedule_enabled:
        status_text = "Manual Policy (24/7 Enabled)" if policy.block_social_media else "Manual Policy (Allowed)"
        return policy.block_social_media, status_text, False

    now = datetime.now()
    weekday = now.weekday()  # 0=Monday, 6=Sunday
    current_time_str = now.strftime("%H:%M")

    # If weekdays only and today is Saturday (5) or Sunday (6)
    if policy.schedule_weekdays_only and weekday in (5, 6):
        return False, "Weekend Mode — Social Media Allowed", False

    work_start = policy.schedule_work_start or "08:00"
    work_end = policy.schedule_work_end or "17:00"
    lunch_start = policy.schedule_lunch_start or "12:00"
    lunch_end = policy.schedule_lunch_end or "13:00"

    # Check lunch break
    if lunch_start <= current_time_str < lunch_end:
        return False, f"Lunch Break ({lunch_start}–{lunch_end}) — Social Media Allowed", False

    # Check work hours
    if work_start <= current_time_str < work_end:
        return True, f"Work Hours Active ({work_start}–{work_end}) — Social Media Blocked", True

    return False, f"Off-Hours (After {work_end}) — Social Media Allowed", False


def _get_or_create_default_policy(db: Session, network_id: str) -> FilterPolicy:
    policy = db.query(FilterPolicy).filter(FilterPolicy.network_id == network_id).first()
    if not policy:
        policy = FilterPolicy(
            network_id=network_id,
            block_social_media=True,
            block_streaming=False,
            block_gaming=False,
            custom_blacklist="[]",
            custom_whitelist="[]",
            schedule_enabled=False,
            schedule_work_start="08:00",
            schedule_work_end="17:00",
            schedule_lunch_start="12:00",
            schedule_lunch_end="13:00",
            schedule_weekdays_only=True,
        )
        db.add(policy)
        db.commit()
        db.refresh(policy)
    return policy


@router.get("/policies", response_model=FilterPolicyResponse)
def get_filter_policy(db: Session = Depends(get_db)):
    network = db.query(Network).first()
    if not network:
        raise HTTPException(status_code=404, detail="No network found")

    policy = _get_or_create_default_policy(db, network.id)
    eff_social, status_text, is_sched = evaluate_schedule(policy)

    return FilterPolicyResponse(
        id=policy.id,
        network_id=policy.network_id,
        block_social_media=eff_social,
        block_streaming=policy.block_streaming,
        block_gaming=policy.block_gaming,
        custom_blacklist=json.loads(policy.custom_blacklist or "[]"),
        custom_whitelist=json.loads(policy.custom_whitelist or "[]"),
        schedule_enabled=policy.schedule_enabled or False,
        schedule_work_start=policy.schedule_work_start or "08:00",
        schedule_work_end=policy.schedule_work_end or "17:00",
        schedule_lunch_start=policy.schedule_lunch_start or "12:00",
        schedule_lunch_end=policy.schedule_lunch_end or "13:00",
        schedule_weekdays_only=policy.schedule_weekdays_only if policy.schedule_weekdays_only is not None else True,
        is_schedule_active=is_sched,
        schedule_status_text=status_text,
        updated_at=policy.updated_at,
    )


@router.post("/policies", response_model=FilterPolicyResponse)
def update_filter_policy(update: FilterPolicyUpdate, db: Session = Depends(get_db)):
    network = db.query(Network).first()
    if not network:
        raise HTTPException(status_code=404, detail="No network found")

    policy = _get_or_create_default_policy(db, network.id)

    if update.block_social_media is not None:
        policy.block_social_media = update.block_social_media
    if update.block_streaming is not None:
        policy.block_streaming = update.block_streaming
    if update.block_gaming is not None:
        policy.block_gaming = update.block_gaming
    if update.custom_blacklist is not None:
        policy.custom_blacklist = json.dumps(update.custom_blacklist)
    if update.custom_whitelist is not None:
        policy.custom_whitelist = json.dumps(update.custom_whitelist)
    if update.schedule_enabled is not None:
        policy.schedule_enabled = update.schedule_enabled
    if update.schedule_work_start is not None:
        policy.schedule_work_start = update.schedule_work_start
    if update.schedule_work_end is not None:
        policy.schedule_work_end = update.schedule_work_end
    if update.schedule_lunch_start is not None:
        policy.schedule_lunch_start = update.schedule_lunch_start
    if update.schedule_lunch_end is not None:
        policy.schedule_lunch_end = update.schedule_lunch_end
    if update.schedule_weekdays_only is not None:
        policy.schedule_weekdays_only = update.schedule_weekdays_only

    policy.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(policy)

    eff_social, status_text, is_sched = evaluate_schedule(policy)

    return FilterPolicyResponse(
        id=policy.id,
        network_id=policy.network_id,
        block_social_media=eff_social,
        block_streaming=policy.block_streaming,
        block_gaming=policy.block_gaming,
        custom_blacklist=json.loads(policy.custom_blacklist or "[]"),
        custom_whitelist=json.loads(policy.custom_whitelist or "[]"),
        schedule_enabled=policy.schedule_enabled or False,
        schedule_work_start=policy.schedule_work_start or "08:00",
        schedule_work_end=policy.schedule_work_end or "17:00",
        schedule_lunch_start=policy.schedule_lunch_start or "12:00",
        schedule_lunch_end=policy.schedule_lunch_end or "13:00",
        schedule_weekdays_only=policy.schedule_weekdays_only if policy.schedule_weekdays_only is not None else True,
        is_schedule_active=is_sched,
        schedule_status_text=status_text,
        updated_at=policy.updated_at,
    )


@router.get("/logs", response_model=List[DNSQueryLogResponse])
def get_query_logs(
    client_ip: Optional[str] = None,
    category: Optional[str] = None,
    is_blocked: Optional[bool] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    network = db.query(Network).first()
    if not network:
        return []

    query = db.query(DNSQueryLog).filter(DNSQueryLog.network_id == network.id)

    if client_ip:
        query = query.filter(DNSQueryLog.client_ip == client_ip)
    if category and category != "all":
        query = query.filter(DNSQueryLog.category == category)
    if is_blocked is not None:
        query = query.filter(DNSQueryLog.is_blocked == is_blocked)

    logs = query.order_by(desc(DNSQueryLog.queried_at)).limit(limit).all()
    return logs


@router.post("/logs", response_model=DNSQueryLogResponse)
def ingest_query_log(payload: DNSQueryLogCreate, db: Session = Depends(get_db)):
    network = db.query(Network).first()
    net_id = payload.network_id or (network.id if network else None)
    if not net_id:
        raise HTTPException(status_code=400, detail="Network must exist before ingesting logs")

    # Match device hostname if available
    hostname = payload.client_hostname
    if not hostname:
        if payload.client_ip in ("127.0.0.1", "::1"):
            import socket
            hostname = f"{socket.gethostname()} (Host PC)"
        else:
            device = db.query(Device).filter(Device.ip_address == payload.client_ip).first()
            if device:
                hostname = device.hostname or device.custom_name or device.vendor

    log = DNSQueryLog(
        network_id=net_id,
        client_ip=payload.client_ip,
        client_hostname=hostname,
        domain=payload.domain,
        category=payload.category,
        service_name=payload.service_name,
        is_blocked=payload.is_blocked,
        query_type=payload.query_type,
        queried_at=payload.queried_at or datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/stats", response_model=DNSStatsResponse)
def get_filtering_stats(db: Session = Depends(get_db)):
    network = db.query(Network).first()
    if not network:
        return DNSStatsResponse(
            total_queries=0,
            blocked_queries=0,
            social_queries=0,
            allowed_queries=0,
            top_social_apps=[],
            top_devices=[],
        )

    total = db.query(DNSQueryLog).filter(DNSQueryLog.network_id == network.id).count()
    blocked = db.query(DNSQueryLog).filter(
        DNSQueryLog.network_id == network.id, DNSQueryLog.is_blocked == True
    ).count()
    social = db.query(DNSQueryLog).filter(
        DNSQueryLog.network_id == network.id, DNSQueryLog.category == "Social Media"
    ).count()

    # Top social media apps queried
    app_counts = (
        db.query(DNSQueryLog.service_name, func.count(DNSQueryLog.id))
        .filter(DNSQueryLog.network_id == network.id, DNSQueryLog.category == "Social Media")
        .group_by(DNSQueryLog.service_name)
        .order_by(desc(func.count(DNSQueryLog.id)))
        .limit(5)
        .all()
    )
    top_apps = [{"name": row[0], "count": row[1]} for row in app_counts]

    # Top querying devices
    device_counts = (
        db.query(DNSQueryLog.client_ip, DNSQueryLog.client_hostname, func.count(DNSQueryLog.id))
        .filter(DNSQueryLog.network_id == network.id)
        .group_by(DNSQueryLog.client_ip, DNSQueryLog.client_hostname)
        .order_by(desc(func.count(DNSQueryLog.id)))
        .limit(5)
        .all()
    )
    top_devices = [
        {"ip": row[0], "hostname": row[1] or "Unknown Device", "count": row[2]}
        for row in device_counts
    ]

    return DNSStatsResponse(
        total_queries=total,
        blocked_queries=blocked,
        social_queries=social,
        allowed_queries=total - blocked,
        top_social_apps=top_apps,
        top_devices=top_devices,
    )


@router.get("/status")
def get_dns_status(db: Session = Depends(get_db)):
    """Return live DNS Guard status including host IP and today's query count."""
    import socket

    # Determine the host IP (the machine running the DNS Guard)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        host_ip = s.getsockname()[0]
        s.close()
    except Exception:
        host_ip = "127.0.0.1"

    # Count queries logged today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    network = db.query(Network).first()
    total_today = 0
    if network:
        total_today = (
            db.query(DNSQueryLog)
            .filter(
                DNSQueryLog.network_id == network.id,
                DNSQueryLog.queried_at >= today_start,
            )
            .count()
        )

    return {
        "dns_listening": True,
        "dns_ip": host_ip,
        "secondary_dns": "1.1.1.1",
        "port": 53,
        "upstream": "1.1.1.1",
        "total_queries_today": total_today,
    }
