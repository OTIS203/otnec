from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------------- Auth Schemas ----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    tenant_name: str = Field(min_length=2, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    email: str
    role: str
    mfa_enabled: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_mfa: bool = False


# ---------------- Network Schemas ----------------
class NetworkCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    cidr_v4: str
    gateway_ip: Optional[str] = None


class NetworkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    cidr_v4: str
    gateway_ip: Optional[str] = None
    security_score: int
    created_at: datetime


# ---------------- Device & Port Schemas ----------------
class DevicePortOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    port: int
    protocol: str
    service_name: str
    banner: Optional[str] = None
    is_risky: bool


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    network_id: str
    mac_address: Optional[str] = None
    ip_address: str
    hostname: Optional[str] = None
    vendor: Optional[str] = None
    device_type: str
    os_guess: Optional[str] = None
    custom_name: Optional[str] = None
    trust_level: str
    is_online: bool
    response_time_ms: float
    first_seen_at: datetime
    last_seen_at: datetime
    ports: List[DevicePortOut] = []


class DeviceUpdate(BaseModel):
    custom_name: Optional[str] = None
    trust_level: Optional[str] = None  # "trusted" | "guest" | "unknown" | "quarantined"


# ---------------- Ingestion Schemas (Agent Telemetry) ----------------
class IngestPort(BaseModel):
    port: int
    protocol: str = "tcp"
    service_name: str = "unknown"
    banner: Optional[str] = None
    is_risky: bool = False


class IngestDevice(BaseModel):
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    vendor: Optional[str] = None
    device_type: str = "unknown"
    os_guess: Optional[str] = None
    open_ports: List[IngestPort] = []
    is_alive: bool = True
    response_time_ms: float = 1.0


class IngestHealth(BaseModel):
    gateway_latency_ms: float = 0.0
    internet_latency_ms: float = 0.0
    jitter_ms: float = 0.0
    packet_loss_pct: float = 0.0
    dns_lookup_ms: float = 0.0
    dns_server_used: Optional[str] = None
    status: str = "excellent"


class IngestFinding(BaseModel):
    type: str
    severity: str
    target_ip: Optional[str] = None
    target_mac: Optional[str] = None
    title: str
    description: str
    remediation: Optional[str] = None


class IngestReport(BaseModel):
    scan_id: str
    agent_id: str
    subnet: str
    started_at: datetime
    completed_at: datetime
    duration_ms: int
    total_hosts: int
    active_hosts: int
    devices: List[IngestDevice] = []
    findings: List[IngestFinding] = []
    health_metrics: IngestHealth
    security_score: int = 100


# ---------------- Alert Schemas ----------------
class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    network_id: str
    device_id: Optional[str] = None
    severity: str
    category: str
    title: str
    description: str
    is_acknowledged: bool
    created_at: datetime


# ---------------- Metric Schemas ----------------
class MetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    network_id: str
    recorded_at: datetime
    latency_ms: float
    jitter_ms: float
    packet_loss_pct: float
    dns_rtt_ms: float

