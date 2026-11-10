from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.api.v1.agents import EnrollPayload, enroll_agent, ingest_telemetry
from app.api.v1.devices import list_devices, update_device
from app.models.entities import Network, Tenant, User
from app.schemas.schemas import DeviceUpdate, IngestDevice, IngestFinding, IngestHealth, IngestPort, IngestReport


def test_agent_enrollment_and_telemetry_ingestion(db_session: Session):
    # 1. Setup Tenant and Network directly in db
    tenant = Tenant(name="Test Tenant", slug="test-tenant")
    db_session.add(tenant)
    db_session.flush()

    user = User(
        tenant_id=tenant.id,
        email="testuser@netscope.local",
        hashed_password="hash",
        role="owner",
    )
    db_session.add(user)

    network = Network(
        tenant_id=tenant.id,
        name="Office LAN",
        cidr_v4="192.168.1.0/24",
        gateway_ip="192.168.1.1",
        security_score=100,
    )
    db_session.add(network)
    db_session.commit()

    # 2. Enroll Agent
    enroll_payload = EnrollPayload(
        token="valid-enroll-token",
        agent_uuid="agent-linux-probe-01",
        hostname="probe-01.office.local",
        agent_version="1.0.0",
    )
    enroll_res = enroll_agent(enroll_payload, db=db_session)
    assert "access_token" in enroll_res
    assert enroll_res["network_id"] == network.id

    # 3. Ingest Telemetry Report
    now = datetime.now(timezone.utc)
    report = IngestReport(
        scan_id="scan-001",
        agent_id="agent-linux-probe-01",
        subnet="192.168.1.0/24",
        started_at=now,
        completed_at=now,
        duration_ms=1200,
        total_hosts=254,
        active_hosts=2,
        devices=[
            IngestDevice(
                ip_address="192.168.1.1",
                mac_address="00:00:0c:12:34:56",
                hostname="gateway.office.local",
                vendor="Cisco Systems",
                device_type="router",
                open_ports=[
                    IngestPort(port=80, protocol="tcp", service_name="http", is_risky=False),
                    IngestPort(port=53, protocol="tcp", service_name="dns", is_risky=False),
                ],
            ),
            IngestDevice(
                ip_address="192.168.1.150",
                mac_address="b8:27:eb:aa:bb:cc",
                hostname="iot-camera.office.local",
                vendor="Raspberry Pi Foundation",
                device_type="camera",
                open_ports=[
                    IngestPort(port=23, protocol="tcp", service_name="telnet", is_risky=True),
                ],
            ),
        ],
        findings=[
            IngestFinding(
                type="RISKY_PORT",
                severity="critical",
                target_ip="192.168.1.150",
                target_mac="b8:27:eb:aa:bb:cc",
                title="Risky Telnet Port Exposed",
                description="Port 23 is open without encryption.",
                remediation="Disable Telnet.",
            )
        ],
        health_metrics=IngestHealth(
            gateway_latency_ms=1.2,
            internet_latency_ms=14.0,
            jitter_ms=1.5,
            packet_loss_pct=0.0,
            dns_lookup_ms=9.2,
            status="excellent",
        ),
        security_score=85,
    )

    ingest_res = ingest_telemetry(report, db=db_session)
    assert ingest_res["success"] is True
    assert ingest_res["new_devices"] == 2

    # 4. Query Devices API
    devices = list_devices(network_id=network.id, current_user=user, db=db_session)
    assert len(devices) == 2

    # Verify device attributes
    camera = next(d for d in devices if d.ip_address == "192.168.1.150")
    assert camera.device_type == "camera"
    assert len(camera.ports) == 1
    assert camera.ports[0].port == 23

    # 5. Update Device Trust Tier & Nickname
    updated_camera = update_device(
        device_id=camera.id,
        dev_update=DeviceUpdate(custom_name="Front Hall Camera", trust_level="quarantined"),
        current_user=user,
        db=db_session,
    )
    assert updated_camera.custom_name == "Front Hall Camera"
    assert updated_camera.trust_level == "quarantined"
