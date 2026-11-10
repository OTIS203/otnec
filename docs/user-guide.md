# NetScope — User & Administrator Guide

Welcome to **NetScope**, the network discovery, continuous monitoring, and security auditing platform designed for home users and IT professionals.

---

## 1. Quick Navigation
- **Dashboard (`/`):** Instant overview of subnet security score, active alerts, host count, and real-time latency/jitter telemetry.
- **Device Inventory (`/devices`):** Filter and search all identified network equipment. Click any device to rename, assign trust tiers, inspect open ports, or trigger Wake-on-LAN.
- **Network Map (`/topology`):** Logical tree visualization demonstrating routing relationships from the Gateway down to workstations, mobile devices, and IoT peripherals.
- **Security Alerts (`/alerts`):** Operational and security incidents (rogue DHCP, ARP spoofing, risky open ports, newly connected devices).
- **Settings & Agent (`/settings`):** Manage agent enrollment tokens, scanning rate limits, and two-factor authentication (MFA).

---

## 2. Understanding Your Security Posture Score (0–100)

NetScope computes a dynamic score reflecting network hygiene and immediate threats:

| Score Range | Classification | Meaning & Recommended Action |
|---|---|---|
| **85 – 100** | **Hardened / Secure** | No unencrypted services or anomalous MAC traffic detected. Continue regular monitoring. |
| **60 – 84** | **Moderate Risks** | Detected open legacy ports (e.g. RDP, UPnP, unencrypted FTP). Review exposed ports in Device Inventory. |
| **0 – 59** | **Critical Risks Detected** | Active ARP spoofing, rogue DHCP, or unencrypted Telnet exposed. Immediate action required. |

---

## 3. Device Management & Trust Tiers

Every discovered device can be categorized into four trust tiers:
1. **Trusted:** Authorized company or personal hardware (e.g. Primary Workstations, Verified Routers).
2. **Guest:** Isolated visitor devices on guest Wi-Fi.
3. **Unknown:** Newly connected devices awaiting classification.
4. **Quarantined:** Suspicious or infected hardware isolated for investigation.

### Wake-on-LAN (WOL)
To power on a sleeping device (e.g. NAS or desktop PC):
1. Navigate to **Device Inventory** and select the device.
2. Ensure the device has a valid MAC address listed.
3. Click **Broadcast Wake-on-LAN Magic Packet**.
4. NetScope broadcasts standard UDP magic packets (ports 7 & 9) across the local subnet.

---

## 4. Exporting Compliance & Inventory Reports
Navigate to the top-right header or API endpoint:
- **CSV Export (`/api/v1/reports/export/csv`):** Complete device inventory with MAC, IP, vendor, open ports, and last seen timestamps.
- **Executive PDF Report (`/api/v1/reports/export/pdf`):** Formal security audit scorecard, including executive summary, discovered inventory, and prioritized remediation steps for IT directors and compliance officers.
