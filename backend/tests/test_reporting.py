from app.models.entities import Alert, Device, DevicePort, Network
from app.services.reporting import generate_csv_inventory, generate_pdf_report
from app.services.security_scanner import audit_open_ports, detect_arp_spoofing


def test_security_audit_open_ports():
    vulns = audit_open_ports("192.168.1.150", "b8:27:eb:aa:bb:cc", [23, 445, 80])
    check_ids = [v.check_id for v in vulns]
    assert "RISK-TELNET" in check_ids
    assert "RISK-SMB" in check_ids
    assert len(vulns) == 2


def test_detect_arp_spoofing():
    # Malicious MAC b8:27:eb:aa:bb:cc claiming both gateway 192.168.1.1 and 192.168.1.200
    arp_table = {
        "192.168.1.1": "b8:27:eb:aa:bb:cc",
        "192.168.1.200": "b8:27:eb:aa:bb:cc",
        "192.168.1.50": "00:0c:29:11:22:33",
    }
    findings = detect_arp_spoofing(arp_table, gateway_ip="192.168.1.1")
    assert len(findings) == 1
    assert findings[0].check_id == "RISK-ARP-SPOOF"
    assert findings[0].severity == "critical"


def test_csv_generation():
    dev = Device(
        ip_address="192.168.1.100",
        mac_address="00:1a:11:22:33:44",
        hostname="workstation-01",
        vendor="Intel",
        device_type="pc",
        trust_level="trusted",
        is_online=True,
        response_time_ms=1.5,
    )
    dev.ports.append(DevicePort(port=22, protocol="tcp", service_name="ssh", is_risky=False))

    csv_data = generate_csv_inventory([dev])
    assert "IP Address,MAC Address" in csv_data
    assert "192.168.1.100" in csv_data
    assert "22/tcp(ssh)" in csv_data


def test_pdf_report_generation():
    network = Network(name="Test Subnet", cidr_v4="192.168.1.0/24", security_score=85)
    dev = Device(
        ip_address="192.168.1.1",
        mac_address="00:00:0c:12:34:56",
        vendor="Cisco Systems",
        device_type="router",
        trust_level="trusted",
        is_online=True,
    )
    alert = Alert(
        severity="critical",
        title="Telnet Insecure Port Active",
        description="Port 23 is open.",
    )

    pdf_bytes = generate_pdf_report(network, [dev], [alert])
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")
