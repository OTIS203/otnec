import pytest
from app.models.entities import Alert, Device, DevicePort
from app.services.security_score import calculate_security_score


def test_security_score_calculation():
    # 1. Clean network with trusted devices
    dev1 = Device(
        ip_address="192.168.1.10",
        trust_level="trusted",
        device_type="pc",
        is_online=True,
    )
    score = calculate_security_score([dev1], [])
    assert score == 100

    # 2. Add device with Telnet (port 23: -15 penalty)
    dev2 = Device(
        ip_address="192.168.1.50",
        trust_level="trusted",
        device_type="iot",
        is_online=True,
    )
    dev2.ports.append(DevicePort(port=23, service_name="telnet", is_risky=True))
    score = calculate_security_score([dev1, dev2], [])
    assert score == 85

    # 3. Add ARP spoofing alert (-30 penalty)
    arp_alert = Alert(
        category="arp_spoof",
        severity="critical",
        title="ARP Poisoning Detected",
        description="Duplicate MAC",
        is_acknowledged=False,
    )
    score = calculate_security_score([dev1, dev2], [arp_alert])
    assert score == 55

