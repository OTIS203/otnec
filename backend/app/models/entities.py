import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    users: Mapped[List["User"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    networks: Mapped[List["Network"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="viewer")  # "owner" | "admin" | "viewer"
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    tenant: Mapped["Tenant"] = relationship(back_populates="users")


class Network(Base):
    __tablename__ = "networks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    cidr_v4: Mapped[str] = mapped_column(String(50), nullable=False)
    gateway_ip: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    security_score: Mapped[int] = mapped_column(Integer, default=100)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    tenant: Mapped["Tenant"] = relationship(back_populates="networks")
    agents: Mapped[List["Agent"]] = relationship(back_populates="network", cascade="all, delete-orphan")
    devices: Mapped[List["Device"]] = relationship(back_populates="network", cascade="all, delete-orphan")
    alerts: Mapped[List["Alert"]] = relationship(back_populates="network", cascade="all, delete-orphan")
    metrics: Mapped[List["NetworkMetric"]] = relationship(back_populates="network", cascade="all, delete-orphan")


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    network_id: Mapped[str] = mapped_column(String(36), ForeignKey("networks.id"), nullable=False)
    agent_uuid: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hostname: Mapped[str] = mapped_column(String(100), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="online")  # "online" | "offline"
    last_heartbeat: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    network: Mapped["Network"] = relationship(back_populates="agents")


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    network_id: Mapped[str] = mapped_column(String(36), ForeignKey("networks.id"), nullable=False)
    mac_address: Mapped[Optional[str]] = mapped_column(String(50), index=True, nullable=True)
    ip_address: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    hostname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vendor: Mapped[Optional[str]] = mapped_column(String(100), default="Unknown Vendor")
    device_type: Mapped[str] = mapped_column(String(50), default="unknown")
    os_guess: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    custom_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    trust_level: Mapped[str] = mapped_column(String(50), default="unknown")  # "trusted" | "guest" | "unknown" | "quarantined"
    is_online: Mapped[bool] = mapped_column(Boolean, default=True)
    response_time_ms: Mapped[float] = mapped_column(Float, default=1.0)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    network: Mapped["Network"] = relationship(back_populates="devices")
    ports: Mapped[List["DevicePort"]] = relationship(back_populates="device", cascade="all, delete-orphan")


class DevicePort(Base):
    __tablename__ = "device_ports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    device_id: Mapped[str] = mapped_column(String(36), ForeignKey("devices.id"), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    protocol: Mapped[str] = mapped_column(String(10), default="tcp")
    service_name: Mapped[str] = mapped_column(String(50), default="unknown")
    banner: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_risky: Mapped[bool] = mapped_column(Boolean, default=False)

    device: Mapped["Device"] = relationship(back_populates="ports")


class NetworkMetric(Base):
    __tablename__ = "network_metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    network_id: Mapped[str] = mapped_column(String(36), ForeignKey("networks.id"), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    jitter_ms: Mapped[float] = mapped_column(Float, default=0.0)
    packet_loss_pct: Mapped[float] = mapped_column(Float, default=0.0)
    dns_rtt_ms: Mapped[float] = mapped_column(Float, default=0.0)

    network: Mapped["Network"] = relationship(back_populates="metrics")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    network_id: Mapped[str] = mapped_column(String(36), ForeignKey("networks.id"), nullable=False)
    device_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    severity: Mapped[str] = mapped_column(String(20), default="info")  # "info" | "warning" | "critical"
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    network: Mapped["Network"] = relationship(back_populates="alerts")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    target_entity: Mapped[str] = mapped_column(String(50), nullable=False)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class DNSQueryLog(Base):
    __tablename__ = "dns_query_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    network_id: Mapped[str] = mapped_column(String(36), ForeignKey("networks.id"), nullable=False)
    client_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    client_hostname: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="General")
    service_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Standard Web")
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    query_type: Mapped[str] = mapped_column(String(10), default="A")
    queried_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class FilterPolicy(Base):
    __tablename__ = "filter_policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    network_id: Mapped[str] = mapped_column(String(36), ForeignKey("networks.id"), unique=True, nullable=False)
    block_social_media: Mapped[bool] = mapped_column(Boolean, default=True)
    block_streaming: Mapped[bool] = mapped_column(Boolean, default=False)
    block_gaming: Mapped[bool] = mapped_column(Boolean, default=False)
    custom_blacklist: Mapped[str] = mapped_column(Text, default="[]")
    custom_whitelist: Mapped[str] = mapped_column(Text, default="[]")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


