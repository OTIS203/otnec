from datetime import datetime, timezone
from typing import Dict, List, Tuple
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Alert, Device, DevicePort, Network, NetworkMetric
from app.schemas.schemas import IngestReport
from app.services.alerts import create_alert
from app.services.security_score import calculate_security_score


def process_scan_report(db: Session, network: Network, report: IngestReport) -> Tuple[int, int]:
    now = datetime.now(timezone.utc)

    # 1. Fetch existing devices in this network
    stmt = select(Device).where(Device.network_id == network.id)
    existing_devices: List[Device] = list(db.execute(stmt).scalars().all())

    # Map by MAC (preferred) and IP
    mac_map: Dict[str, Device] = {d.mac_address.lower(): d for d in existing_devices if d.mac_address}
    ip_map: Dict[str, Device] = {d.ip_address: d for d in existing_devices}

    discovered_ips = set()
    new_count = 0
    updated_count = 0

    for dev_in in report.devices:
        discovered_ips.add(dev_in.ip_address)
        matched_dev: Device = None

        if dev_in.mac_address and dev_in.mac_address.lower() in mac_map:
            matched_dev = mac_map[dev_in.mac_address.lower()]
            # Detect IP change
            if matched_dev.ip_address != dev_in.ip_address:
                create_alert(
                    db=db,
                    network_id=network.id,
                    device_id=matched_dev.id,
                    severity="info",
                    category="ip_changed",
                    title="Device IP Address Changed",
                    description=f"Device {matched_dev.custom_name or matched_dev.hostname or matched_dev.mac_address} changed IP from {matched_dev.ip_address} to {dev_in.ip_address}.",
                )
                matched_dev.ip_address = dev_in.ip_address
        elif dev_in.ip_address in ip_map:
            matched_dev = ip_map[dev_in.ip_address]

        if matched_dev:
            # Device returning online
            if not matched_dev.is_online:
                create_alert(
                    db=db,
                    network_id=network.id,
                    device_id=matched_dev.id,
                    severity="info",
                    category="returning_device",
                    title="Known Device Reconnected",
                    description=f"Device {matched_dev.custom_name or matched_dev.hostname or matched_dev.ip_address} is back online.",
                )

            matched_dev.is_online = True
            matched_dev.last_seen_at = now
            matched_dev.response_time_ms = dev_in.response_time_ms
            if dev_in.hostname:
                matched_dev.hostname = dev_in.hostname
            if dev_in.vendor and dev_in.vendor != "Unknown Vendor":
                matched_dev.vendor = dev_in.vendor
            if dev_in.device_type and dev_in.device_type != "unknown":
                matched_dev.device_type = dev_in.device_type
            if dev_in.os_guess:
                matched_dev.os_guess = dev_in.os_guess

            # Update ports
            matched_dev.ports.clear()
            for p in dev_in.open_ports:
                matched_dev.ports.append(
                    DevicePort(
                        port=p.port,
                        protocol=p.protocol,
                        service_name=p.service_name,
                        banner=p.banner,
                        is_risky=p.is_risky,
                    )
                )
            updated_count += 1
        else:
            # New Device Discovered
            new_dev = Device(
                network_id=network.id,
                mac_address=dev_in.mac_address.lower() if dev_in.mac_address else None,
                ip_address=dev_in.ip_address,
                hostname=dev_in.hostname,
                vendor=dev_in.vendor or "Unknown Vendor",
                device_type=dev_in.device_type or "unknown",
                os_guess=dev_in.os_guess,
                trust_level="unknown",
                is_online=True,
                response_time_ms=dev_in.response_time_ms,
                first_seen_at=now,
                last_seen_at=now,
            )
            for p in dev_in.open_ports:
                new_dev.ports.append(
                    DevicePort(
                        port=p.port,
                        protocol=p.protocol,
                        service_name=p.service_name,
                        banner=p.banner,
                        is_risky=p.is_risky,
                    )
                )
            db.add(new_dev)
            db.flush()

            create_alert(
                db=db,
                network_id=network.id,
                device_id=new_dev.id,
                severity="warning",
                category="new_device",
                title="New Device Discovered on Network",
                description=f"A new device ({new_dev.vendor or 'Unknown'}, IP: {new_dev.ip_address}) was detected.",
            )
            new_count += 1

    # 2. Check for devices that have gone offline
    for dev in existing_devices:
        if dev.is_online and dev.ip_address not in discovered_ips:
            dev.is_online = False
            create_alert(
                db=db,
                network_id=network.id,
                device_id=dev.id,
                severity="info",
                category="device_offline",
                title="Device Went Offline",
                description=f"Device {dev.custom_name or dev.hostname or dev.ip_address} has disconnected from the network.",
            )

    # 3. Process Security Findings reported by agent
    for finding in report.findings:
        create_alert(
            db=db,
            network_id=network.id,
            severity=finding.severity,
            category=finding.type.lower(),
            title=finding.title,
            description=f"{finding.description} (Remediation: {finding.remediation})",
        )

    # 4. Insert Network Health Metrics into TimescaleDB / SQLite
    metric_record = NetworkMetric(
        network_id=network.id,
        recorded_at=now,
        latency_ms=report.health_metrics.internet_latency_ms,
        jitter_ms=report.health_metrics.jitter_ms,
        packet_loss_pct=report.health_metrics.packet_loss_pct,
        dns_rtt_ms=report.health_metrics.dns_lookup_ms,
    )
    db.add(metric_record)

    # 5. Recompute Security Score
    alert_stmt = select(Alert).where(Alert.network_id == network.id)
    all_alerts = list(db.execute(alert_stmt).scalars().all())

    stmt_all_devs = select(Device).where(Device.network_id == network.id)
    current_devs = list(db.execute(stmt_all_devs).scalars().all())

    network.security_score = calculate_security_score(current_devs, all_alerts)
    db.flush()

    return new_count, updated_count
