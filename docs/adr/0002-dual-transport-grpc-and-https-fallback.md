# ADR-0002: Dual Protocol Transport (gRPC Streaming and HTTPS Fallback)

## Context
The NetScope Go Agent must transmit real-time telemetry, device discovery deltas, and heartbeat packets back to the central platform across diverse enterprise and residential networks. Intermediate corporate proxies, next-generation firewalls (NGFW), or deep packet inspection (DPI) appliances frequently terminate HTTP/2 or block raw gRPC streams.

## Decision
NetScope adopts a **Dual Protocol Architecture**:
1. **Primary Protocol:** gRPC over HTTP/2 with mutual TLS (mTLS) (`proto/netscope/v1/agent.proto`).
   - Bidirectional streaming for telemetry ingestion and real-time command dispatch (e.g. on-demand scan triggers, Wake-on-LAN).
   - Minimal CPU and bandwidth overhead via binary Protobuf serialization.
2. **Fallback Protocol:** HTTPS REST (`POST /api/v1/agents/telemetry`) over standard HTTP/1.1 with Bearer token authentication.
   - If an agent detects gRPC connection resets or proxy protocol errors, it automatically falls back to standard HTTPS batches.
   - A persistent WebSocket connection (`/api/v1/ws/live`) maintains the real-time downlink for commands and notifications.

## Consequences
- 100% connectivity reliability across restrictive corporate networks, home NAT routers, and public cloud environments.
- Zero loss of functionality when operating behind standard reverse proxies (Nginx, Traefik, Cloudflare).

