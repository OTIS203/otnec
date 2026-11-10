import json
from datetime import datetime, timezone, timedelta
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
        )
        db.add(policy)
        db.commit()
        db.refresh(policy)
    return policy


def _seed_sample_logs_if_empty(db: Session, network_id: str):
    count = db.query(DNSQueryLog).filter(DNSQueryLog.network_id == network_id).count()
    if count > 0:
        return

    # Seed illustrative queries so the dashboard immediately shows device activity
    now = datetime.now(timezone.utc)
    sample_queries = [
        ("192.168.1.154", "iPhone-Staff-01", "api.tiktokv.com", "Social Media", "TikTok", True, now - timedelta(minutes=2)),
        ("192.168.1.154", "iPhone-Staff-01", "v16.tiktokcdn.com", "Social Media", "TikTok", True, now - timedelta(minutes=2, seconds=10)),
        ("192.168.1.102", "Galaxy-S23-Ops", "i.instagram.com", "Social Media", "Instagram", True, now - timedelta(minutes=5)),
        ("192.168.1.102", "Galaxy-S23-Ops", "graph.facebook.com", "Social Media", "Facebook", True, now - timedelta(minutes=8)),
        ("192.168.1.88", "Workstation-Finance", "api.x.com", "Social Media", "X (Twitter)", True, now - timedelta(minutes=14)),
        ("192.168.1.88", "Workstation-Finance", "app.slack.com", "General", "Slack", False, now - timedelta(minutes=15)),
        ("192.168.1.45", "MacBook-Engineering", "github.com", "General", "GitHub", False, now - timedelta(minutes=18)),
        ("192.168.1.154", "iPhone-Staff-01", "snapchat.com", "Social Media", "Snapchat", True, now - timedelta(minutes=25)),
        ("192.168.1.102", "Galaxy-S23-Ops", "google.com", "General", "Google Search", False, now - timedelta(minutes=30)),
        ("192.168.1.45", "MacBook-Engineering", "googlevideo.com", "Streaming Video", "YouTube", False, now - timedelta(minutes=35)),
    ]

    for ip, host, domain, cat, srv, blocked, ts in sample_queries:
        log = DNSQueryLog(
            network_id=network_id,
            client_ip=ip,
            client_hostname=host,
            domain=domain,
            category=cat,
            service_name=srv,
            is_blocked=blocked,
            query_type="A",
            queried_at=ts,
        )
        db.add(log)
    db.commit()


@router.get("/policies", response_model=FilterPolicyResponse)
def get_filter_policy(db: Session = Depends(get_db)):
    network = db.query(Network).first()
    if not network:
        raise HTTPException(status_code=404, detail="No network found")

    policy = _get_or_create_default_policy(db, network.id)
    _seed_sample_logs_if_empty(db, network.id)

    return FilterPolicyResponse(
        id=policy.id,
        network_id=policy.network_id,
        block_social_media=policy.block_social_media,
        block_streaming=policy.block_streaming,
        block_gaming=policy.block_gaming,
        custom_blacklist=json.loads(policy.custom_blacklist or "[]"),
        custom_whitelist=json.loads(policy.custom_whitelist or "[]"),
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

    policy.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(policy)

    return FilterPolicyResponse(
        id=policy.id,
        network_id=policy.network_id,
        block_social_media=policy.block_social_media,
        block_streaming=policy.block_streaming,
        block_gaming=policy.block_gaming,
        custom_blacklist=json.loads(policy.custom_blacklist or "[]"),
        custom_whitelist=json.loads(policy.custom_whitelist or "[]"),
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

    _seed_sample_logs_if_empty(db, network.id)

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

    _seed_sample_logs_if_empty(db, network.id)

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
