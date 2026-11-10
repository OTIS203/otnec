# NetScope — Deliverable 1: Requirements Summary, Risk Analysis & STRIDE Threat Model

**Project:** NetScope (Production-Grade Network Discovery, Monitoring & Security Platform)  
**Document Version:** 1.0.0  
**Status:** Approved for Architectural Review  
**Author:** Senior Network-Security Engineer & Full-Stack Architect  

---

## 1. Executive Summary & Product Scope

NetScope is a dual-audience network observability and security platform designed to match and exceed the capabilities of platforms like Fing, Domotz, and RunZero. It bridges the gap between:
- **Home Users / Prosumers:** Needing zero-configuration discovery, plain-language security alerts (e.g., "Your baby monitor has Telnet open to the internet"), one-tap Wake-on-LAN or isolation, and simple health metrics.
- **IT Professionals & Managed Service Providers (MSPs):** Needing multi-tenant and multi-subnet management, scheduled compliance scans, exportable PDF/CSV audit reports, low-overhead static binary agents, and an OpenAPI/gRPC interface.

---

## 2. Comprehensive Requirements Matrix

### 2.1 Functional Requirements (FR)

| Req ID | Domain | Description | Verification Method |
|---|---|---|---|
| **FR-01** | Subnet Detection | Auto-detect local active network interfaces, routing tables, default gateways, and CIDR masks (IPv4 /24 to /16, IPv6 link-local). | Unit + Simulated E2E tests |
| **FR-02** | Layer 2/3 Discovery | Concurrently execute ARP sweeps, ICMP Echo requests, NetBIOS Name Service (port 137), mDNS (5353/UDP), SSDP (1900/UDP), and DHCP snooping/fingerprinting. | Virtual network tap / PCAP test harness |
| **FR-03** | Device Fingerprinting | OUI MAC vendor matching (IEEE public database), hostname normalization, mDNS service dictionary, TCP/IP stack behavior, and preliminary heuristics into device classes (Mobile, PC, IoT, Smart TV, Infrastructure, Printer). | Precision & recall evaluation on benchmark device sets |
| **FR-04** | Port & Service Scan | Controlled rate-limited TCP SYN/Connect scanner with configurable port lists (Top 100/1000/Custom). Non-intrusive banner grabbing for HTTP, SSH, FTP, SMTP, SMB, RTSP. | WireGuard simulated target suite |
| **FR-05** | Network Health | Synthetic continuous telemetry: ICMP RTT (latency, jitter, packet loss), DNS resolution latency against multiple upstreams (Cloudflare, Google, Local), speed test orchestration, and ISP reachability. | TimescaleDB hypertable aggregation tests |
| **FR-06** | Real-Time State Engine | Agent streams heartbeat and delta events. Backend calculates device state transitions: `NEW`, `ONLINE`, `OFFLINE`, `RETURNING`, `IP_CHANGED`, `MAC_SPOOF_SUSPECT`. | WebSocket event delivery latency benchmark (<2s) |
| **FR-07** | Security Auditing | Detection of risky open ports (Telnet 23, FTP 21, SMBv1 445, RDP 3389, UPnP 1900/5000), rogue DHCP server detection, ARP spoofing detection, DNS hijacking checks, and computation of 0–100 Security Score. | Dedicated vulnerable honeypot/mock services |
| **FR-08** | Opt-In Credential Check | Explicit user-authorized check for common default credentials (e.g. `admin:admin`, `root:root`) on HTTP/SSH/Telnet with strict lockout prevention and rate limits. | Integration tests against authorized mock targets |
| **FR-09** | Management Actions | In-app device renaming, custom grouping, trust categorization (`Trusted`, `Guest`, `Unknown`, `Quarantined`), Wake-on-LAN (WOL UDP 7/9 magic packet broadcast). | Packet capture validation |
| **FR-10** | Reports & Export | Generation of PDF executive summaries (inventory, risk score, open vulnerabilities) and CSV raw data exports. | Automated PDF/CSV parser test assertions |

### 2.2 Non-Functional Requirements (NFR)

- **Performance:**
  - Standard /24 subnet discovery completing within **< 30 seconds**.
  - Rate-limited scanning: Default ≤ 150 packets/sec to avoid triggering router DoS protections or crashing fragile IoT microcontrollers.
  - Backend ingestion supporting **10,000+ managed devices per tenant** with query latencies < 100ms.
  - Live UI updates pushed and rendered in **< 2 seconds** from agent emission.
- **Reliability & Resilience:**
  - Agent stores observations in a local offline buffer (SQLite or disk-backed WAL) if backend is unreachable; reconnects with exponential backoff and jitter.
  - Backend stateless microservice architecture backed by PostgreSQL/TimescaleDB and Redis.
- **Portability:**
  - Go agent compiled as single static binary (`CGO_ENABLED=0` where feasible, or minimal `libpcap` wrapper with fallback to raw sockets / OS API).
  - Architecture support: `linux/amd64`, `linux/arm64`, `linux/armv7` (Raspberry Pi), `windows/amd64`, `darwin/arm64`.

---

## 3. Risk Assessment & Operational Mitigations

| Risk ID | Category | Description | Severity | Likelihood | Mitigation Strategy |
|---|---|---|---|---|---|
| **RSK-01** | Operational | Fragile IoT device crashing when probed on specific ports (e.g., embedded IP cameras or legacy printers). | **High** | Medium | Adaptive rate limiting, polite TCP connect mode by default, opt-in deep scanning, blacklist of known sensitive devices/ports. |
| **RSK-02** | Legal / Ethics | User initiating scans against unauthorized public or cloud networks. | **Critical** | Low | Hard boundary check: restrict agent scanning strictly to RFC 1918 / RFC 4193 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fd00::/8`) attached to local interfaces. Explicit consent UI gate. |
| **RSK-03** | Network Health | ARP storms or broadcast saturating low-bandwidth Wi-Fi or IoT mesh (Zigbee/Z-Wave bridges). | **Medium** | Low | Staggered ARP queries (token bucket algorithm), unicast verification after initial sweep, adaptive packet spacing. |
| **RSK-04** | Security | Agent token compromise allowing malicious rogue telemetry injection. | **High** | Low | Short-lived enrollment tokens, mutual TLS (mTLS) with per-agent X.509 certificates, agent pinning, IP binding, and RBAC isolation. |
| **RSK-05** | Reliability | Network interface drops or IP changes causing scan engine failure or socket leakage. | **Medium** | Medium | Go context cancellation timeouts, socket lifecycle management, network change listener (`netlink` on Linux, event notifications on Windows). |

---

## 4. STRIDE Threat Model

NetScope implements the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) covering the three primary tiers: **Edge Agent**, **Ingestion/Backend API**, and **User Frontend**.

```
+-----------------------------------------------------------------------------------------+
|                                    TRUST BOUNDARY 1                                     |
|  Local Network (LAN)                                                                    |
|  +------------------------+          Raw Sockets / PCAP          +-------------------+  |
|  | Unmanaged / IoT Device | <==================================> |   NetScope Agent  |  |
|  +------------------------+                                      | (CAP_NET_RAW/Svc) |  |
|                                                                  +---------+---------+  |
+----------------------------------------------------------------------------|------------+
                                                                             |
                                             gRPC/mTLS or HTTPS + Token      | [mTLS / AES-256]
                                             (TRUST BOUNDARY 2)              |
                                                                             v
+----------------------------------------------------------------------------+------------+
|  Cloud / Central Server Stack (TRUST BOUNDARY 3)                           |            |
|  +-------------------------------------------------------------------------+---------+  |
|  | Fast API Gateway & Ingestion Controller (Pydantic v2, Strict Input Validation)   |  |
|  +-----------------------------------------------------------------------------------+  |
|          |                                   |                              |           |
|          v                                   v                              v           |
|  +---------------+                 +--------------------+                 +----------+  |
|  | PostgreSQL +  |                 | Celery Workers +   |                 | Redis    |  |
|  | TimescaleDB   |                 | ML Anomaly Engine  |                 | Pub/Sub  |  |
|  +---------------+                 +--------------------+                 +----+-----+  |
|                                                                                |        |
+--------------------------------------------------------------------------------|--------+
                                                                                 |
                                                  WSS (TLS 1.3) + JWT RBAC       | [WebSocket]
                                                  (TRUST BOUNDARY 4)             |
                                                                                 v
+--------------------------------------------------------------------------------+--------+
|  Client Browser / PWA                                                          |        |
|  +-----------------------------------------------------------------------------+-----+  |
|  | React / Next.js Dashboard (OWASP Top 10 defenses, CSP, Strict Context Isolation) |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

### 4.1 Threat Matrix & Security Countermeasures

| Threat Category | Asset / Target | Threat Description | Countermeasure / Security Control |
|---|---|---|---|
| **S - Spoofing** | Agent Identity | Rogue agent registers with backend using brute-forced credentials and injects fake network topologies. | One-time agent enrollment tokens exchanged for short-lived, backend-signed X.509 client certificates (mTLS). Hardware/OS UUID validation. |
| **S - Spoofing** | LAN Devices | An attacker on the LAN performs ARP poisoning to intercept traffic or spoof gateway IP. | NetScope agent actively monitors the ARP table for duplicate IP-to-MAC mappings and sudden gateway MAC shifts, emitting immediate high-severity alerts. |
| **T - Tampering** | Telemetry in Transit | Adversary on transit network modifies device vulnerability flags or silences alerts. | Mandatory TLS 1.3 encryption with certificate pinning; HMAC signatures on batch telemetry payloads. |
| **T - Tampering** | Local Agent Cache | Local user or attacker modifies offline cached SQLite event log before synchronization. | Encrypted local SQLite file using SQLCipher or SHA-256 integrity hash chains over local event records. |
| **R - Repudiation** | Security Scans & Admin Actions | Admin user performs port scans or changes device classification and later denies action. | Append-only, tamper-evident audit log table recording user ID, IP, user-agent, timestamp, action, and target subnet. |
| **I - Info Disclosure**| Network Topology Data | Unauthorized user views confidential device hostnames, MAC addresses, internal IP schemes, or open ports. | Multi-tenant tenant-level data segregation, strict RBAC (`Owner`, `Admin`, `Auditor/Viewer`), column-level encryption for sensitive metadata at rest. |
| **I - Info Disclosure**| API Credentials & Secrets | Database credentials, JWT signing keys, or agent tokens leak via logs or error traces. | Environment-driven secrets management, Pydantic `SecretStr` masking in logs, automated CI secret scanning (Trivy, GitLeaks). |
| **D - Denial of Service**| Backend Ingestion | Malicious agent floods backend with millions of fake device discovery packets. | Per-agent token bucket rate limiting at API gateway, batch ingestion limits (max 500 devices per payload), Celery queue backpressure. |
| **D - Denial of Service**| Target LAN | High-speed port sweep brings down consumer router or IoT camera. | Go agent enforces an immutable ceiling of 150 packets/sec default, auto-throttling on detected packet drop spikes. |
| **E - Elevation of Privilege**| Agent Process | Attacker exploits buffer overflow in Go agent raw packet parsing to gain root/SYSTEM. | Linux: Agent drops root privileges post-socket creation, retaining only `CAP_NET_RAW` and `CAP_NET_ADMIN`. Written in memory-safe Go 1.22+. Non-root containers. |
| **E - Elevation of Privilege**| Backend API | Regular viewer modifies security policies or triggers default-credential testing. | Fine-grained RBAC enforced via FastAPI dependency injection at route level (`Depends(require_role("admin"))`). |

---

## 5. Security Architecture Principles

1. **Defense in Depth:** Validation occurs on the Go agent, at the API Gateway, and in the database schema.
2. **Least Privilege Principle:** Backend processes run as unprivileged UID 10001; agent operates with minimal kernel capabilities.
3. **Local-First & Privacy by Default:** Data collection restricted strictly to network metadata. No payload interception, no packet content sniffing, no DNS payload interception beyond standard local query benchmarking.
4. **Zero Exploitation Policy:** Scanners conduct detection-only probes; credential verification is strictly opt-in, non-destructive, and limited to single-attempt dictionary checks with strict lock-out prevention.

