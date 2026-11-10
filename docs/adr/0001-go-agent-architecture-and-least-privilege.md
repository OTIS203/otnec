# ADR-0001: Go Agent Architecture and Least Privilege Capabilities

## Context
Network scanning and packet inspection traditionally require root or administrative privileges to create raw sockets (e.g. for ARP packets and raw ICMP sockets). Requiring a permanent root daemon presents severe security risks (OWASP / STRIDE Elevation of Privilege) if a memory vulnerability or packet parsing defect is exploited.

## Decision
1. **Language Choice:** Go 1.22+ was chosen for the edge agent because:
   - Memory safety (eliminating buffer overflows present in C/C++ scanners).
   - High-concurrency performance with lightweight goroutines.
   - Cross-compilation to single static binaries (`CGO_ENABLED=0`) across Linux (amd64, arm64, armv7), Windows, and macOS.
2. **Least Privilege Principle:**
   - On Linux, the agent drops root privileges immediately post-initialization, holding solely `CAP_NET_RAW` and `CAP_NET_ADMIN` file capabilities:
     `setcap cap_net_raw,cap_net_admin=+ep /usr/local/bin/netscope-agent`
   - On Windows and unprivileged Linux environments, the agent gracefully falls back to OS-level networking APIs, parsing the kernel ARP cache (`ip neigh` / `arp -a`) and issuing standard socket connects.

## Consequences
- The attack surface is drastically minimized.
- Deployment into containerized environments (Kubernetes DaemonSet, Docker) is simplified without granting `--privileged`.
- Agent binaries run out of the box on low-power devices like Raspberry Pi.

