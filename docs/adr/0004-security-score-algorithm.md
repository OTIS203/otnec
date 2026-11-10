# ADR-0004: Deterministic 0–100 Network Security Score Calculation

## Context
Users (both home prosumers and IT security auditors) need a clear, actionable metric summarizing the security hygiene and immediate threat level of their local subnet. Platforms like Fing and Domotz use proprietary black-box calculations that make it difficult for IT teams to explain why a network's rating dropped.

## Decision
NetScope adopts a **deterministic, transparent, and additive penalty deduction model** anchored at a baseline score of 100:

$$\text{SecurityScore} = 100 - (\Delta_{\text{Ports}} + \Delta_{\text{Integrity}} + \Delta_{\text{Hygiene}})$$

### Penalty Deductions:
1. **Critical Protocol & Integrity Violations ($\Delta_{\text{Integrity}}$):**
   - Active ARP Poisoning / Spoofing detected: $-30$ points (Immediate Critical Alert).
   - Rogue DHCP Server detected on subnet: $-20$ points.
   - DNS Hijacking / unencrypted upstream failure: $-15$ points.
2. **High-Risk Exposed Services ($\Delta_{\text{Ports}}$):**
   - Telnet (port 23): $-15$ points per host.
   - SMB File Sharing (port 445): $-15$ points per host.
   - Plaintext FTP (port 21): $-10$ points per host.
   - Remote Desktop (port 3389): $-10$ points per host.
   - UPnP / SSDP WAN Gateway (ports 1900, 5000): $-10$ points.
3. **Hygiene & Visibility ($\Delta_{\text{Hygiene}}$):**
   - Unclassified / Unknown Device: $-2$ points per host.
4. **Bounds:**
   - The final score is clamped to the range $[0, 100]$.

## Consequences
- Completely reproducible and auditable in PDF executive reports.
- Users immediately understand how to improve their score (e.g. "Disable Telnet on Camera 1 to increase score by 15 points").

