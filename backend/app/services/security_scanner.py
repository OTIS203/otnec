from typing import Dict, List, Optional
from pydantic import BaseModel


class SecurityVulnerability(BaseModel):
    check_id: str
    severity: str  # "info" | "warning" | "critical"
    title: str
    description: str
    affected_device_ip: str
    affected_mac: Optional[str] = None
    remediation: str


# Common default credential dictionaries (Strictly Opt-in & Non-Destructive)
DEFAULT_CREDENTIAL_PAIRS = [
    ("admin", "admin"),
    ("admin", "password"),
    ("root", "root"),
    ("admin", "1234"),
    ("user", "user"),
]


def audit_open_ports(ip: str, mac: Optional[str], ports: List[int]) -> List[SecurityVulnerability]:
    """Evaluates host open ports against high-risk service signatures."""
    vulns: List[SecurityVulnerability] = []

    for port in ports:
        if port == 23:
            vulns.append(
                SecurityVulnerability(
                    check_id="RISK-TELNET",
                    severity="critical",
                    title="Telnet Insecure Protocol Active",
                    description=f"Host {ip} has port 23 (Telnet) exposed. Telnet transmits usernames, passwords, and commands in unencrypted plaintext.",
                    affected_device_ip=ip,
                    affected_mac=mac,
                    remediation="Disable the Telnet daemon immediately and migrate to SSH (port 22) with public-key authentication.",
                )
            )
        elif port == 21:
            vulns.append(
                SecurityVulnerability(
                    check_id="RISK-FTP",
                    severity="warning",
                    title="Unencrypted FTP Service Exposed",
                    description=f"Host {ip} is running plain FTP on port 21 without mandatory TLS enforcement.",
                    affected_device_ip=ip,
                    affected_mac=mac,
                    remediation="Upgrade FTP service to SFTP (over SSH) or FTPS (FTP with explicit TLS).",
                )
            )
        elif port == 445:
            vulns.append(
                SecurityVulnerability(
                    check_id="RISK-SMB",
                    severity="critical",
                    title="SMB File Sharing Exposed",
                    description=f"Host {ip} is listening on SMB port 445. SMB is a high-value lateral movement vector for ransomware (e.g. WannaCry, EternalBlue).",
                    affected_device_ip=ip,
                    affected_mac=mac,
                    remediation="Disable SMBv1 across the host OS, enforce SMB signing, and ensure SMB is isolated by host firewall from guest subnets.",
                )
            )
        elif port == 3389:
            vulns.append(
                SecurityVulnerability(
                    check_id="RISK-RDP",
                    severity="warning",
                    title="Remote Desktop (RDP) Service Active",
                    description=f"Host {ip} has Microsoft RDP open on port 3389.",
                    affected_device_ip=ip,
                    affected_mac=mac,
                    remediation="Enforce Network Level Authentication (NLA), change default listening port, and require VPN before RDP access.",
                )
            )
        elif port in (1900, 5000):
            vulns.append(
                SecurityVulnerability(
                    check_id="RISK-UPNP",
                    severity="warning",
                    title="UPnP / SSDP Gateway Discovery Active",
                    description=f"Host {ip} has UPnP active, which allows applications to automatically open router port forwards without user consent.",
                    affected_device_ip=ip,
                    affected_mac=mac,
                    remediation="Disable UPnP IGD in router settings to prevent unauthorized automated NAT port openings.",
                )
            )

    return vulns


def detect_arp_spoofing(arp_table: Dict[str, str], gateway_ip: str) -> List[SecurityVulnerability]:
    """Detects ARP poisoning attacks where one MAC claims multiple distinct IPs or the gateway IP."""
    vulns: List[SecurityVulnerability] = []
    mac_to_ips: Dict[str, List[str]] = {}

    for ip, mac in arp_table.items():
        clean_mac = mac.lower()
        if clean_mac not in mac_to_ips:
            mac_to_ips[clean_mac] = []
        mac_to_ips[clean_mac].append(ip)

    for mac, ips in mac_to_ips.items():
        if len(ips) > 1 and gateway_ip in ips:
            other_ips = [i for i in ips if i != gateway_ip]
            vulns.append(
                SecurityVulnerability(
                    check_id="RISK-ARP-SPOOF",
                    severity="critical",
                    title="Active ARP Poisoning / Spoofing Attack Detected",
                    description=f"Hardware MAC {mac} is masquerading as the Gateway ({gateway_ip}) and host(s) {other_ips}. This indicates an active Man-in-the-Middle (MITM) interception attempt on the LAN.",
                    affected_device_ip=gateway_ip,
                    affected_mac=mac,
                    remediation="Locate physical port or wireless client matching MAC " + mac + ", isolate from network, and inspect for ARP spoofing malware.",
                )
            )

    return vulns

