---
title: NetScope Network Security API
emoji: 🛡️
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# NetScope 🌐

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CI](https://github.com/netscope/netscope/actions/workflows/ci.yml/badge.svg)](https://github.com/netscope/netscope/actions)
[![Go Version](https://img.shields.io/badge/Go-1.22%2B-00ADD8?logo=go)](https://golang.org)
[![Python Version](https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14%2B-000000?logo=next.js)](https://nextjs.org)

**NetScope** is a production-grade, dual-audience network discovery, continuous monitoring, and automated security posture platform comparable to Fing, Domotz, and RunZero.

---

## 🚀 Quick Start (Full Stack via Docker Compose)

```bash
# Clone the repository
git clone https://github.com/netscope/netscope.git
cd netscope

# Copy environment variables
cp .env.example .env

# Start TimescaleDB, Redis, Backend, Celery, Frontend and Agent
docker compose -f deploy/docker-compose.yml up -d
```

- **Web Dashboard:** [http://localhost:3000](http://localhost:3000)
- **FastAPI OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Live WebSocket Feed:** `ws://localhost:8000/api/v1/ws/live`

---

## 📁 Monorepo Structure

```
├── agent/            # Go 1.22+ Edge Probe (L2/L3 discovery, polite portscan, health)
├── backend/          # Python 3.12 FastAPI, SQLAlchemy 2, TimescaleDB, Celery & ML
├── frontend/         # Next.js 14 App Router, TypeScript, Tailwind CSS, TanStack Query
├── deploy/           # Docker Compose, Dockerfiles, and Helm charts
├── proto/            # Protobuf specifications (gRPC agent-to-backend contract)
├── docs/             # Threat model (STRIDE), architecture, data model, guides
└── tests/e2e/        # Simulated multi-device network test harness
```

---

## 🔒 Security & Safety Principles

1. **RFC 1918 / RFC 4193 Only:** Scans are programmatically constrained to private subnets attached to local network interfaces.
2. **Polite Pacing:** Immutable rate limiting default (≤150 pkts/sec) protects fragile IoT microcontrollers and consumer routers.
3. **Least Privilege:** Agent drops root privileges post-socket creation, retaining only `CAP_NET_RAW` on Linux. Backend and frontend run as non-root UID 10001.
4. **Privacy-First:** Data stays local to your deployment; no external telemetry is emitted.

---

## 📄 License

Licensed under the [Apache License, Version 2.0](LICENSE).

