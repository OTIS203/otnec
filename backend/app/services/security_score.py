from typing import List
from app.models.entities import Device, DevicePort, Alert


def calculate_security_score(devices: List[Device], active_alerts: List[Alert]) -> int:
    score = 100

    # 1. Port Exposure Penalties
    for dev in devices:
        if not dev.is_online:
            continue
        for p in dev.ports:
            if p.port == 23:      # Telnet
                score -= 15
            elif p.port == 21:    # FTP
                score -= 10
            elif p.port == 445:   # SMBv1
                score -= 15
            elif p.port == 3389:  # RDP
                score -= 10
            elif p.port in (1900, 5000): # UPnP
                score -= 10

        # Hygiene penalty for unknown unclassified devices
        if dev.trust_level == "unknown" or dev.device_type == "unknown":
            score -= 2

    # 2. Protocol & Integrity Penalties
    for alert in active_alerts:
        if not alert.is_acknowledged:
            if alert.category == "arp_spoof":
                score -= 30
            elif alert.category == "rogue_dhcp":
                score -= 20
            elif alert.category == "dns_hijack":
                score -= 15

    # Clamp to [0, 100]
    return max(0, min(100, score))

