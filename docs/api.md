# NetScope — REST & WebSocket API Reference

The NetScope backend provides an OpenAPI 3.1 compliant REST API and a real-time WebSocket event feed.

Interactive Swagger UI is accessible at: `http://localhost:8000/docs`

---

## 1. Authentication (`/api/v1/auth`)

### Register Tenant & Owner User
- **POST** `/api/v1/auth/register`
- **Request:**
  ```json
  {
    "email": "admin@example.com",
    "password": "SuperSecretPassword123!",
    "tenant_name": "ACME Security Corp"
  }
  ```
- **Response (201):**
  ```json
  {
    "id": "usr-123",
    "tenant_id": "ten-456",
    "email": "admin@example.com",
    "role": "owner",
    "mfa_enabled": false
  }
  ```

### User Login
- **POST** `/api/v1/auth/login`
- **Request:**
  ```json
  {
    "email": "admin@example.com",
    "password": "SuperSecretPassword123!",
    "totp_code": "123456" // Optional unless MFA enabled
  }
  ```
- **Response (200):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "requires_mfa": false
  }
  ```

---

## 2. Agent Telemetry Ingestion (`/api/v1/agents`)

### Enroll Agent
- **POST** `/api/v1/agents/enroll`
- **Request:**
  ```json
  {
    "token": "NETSCOPE-ENROLL-XYZ...",
    "agent_uuid": "agent-linux-01",
    "hostname": "probe.lan",
    "agent_version": "1.0.0"
  }
  ```
- **Response (200):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "network_id": "net-001"
  }
  ```

### Submit Scan Telemetry Batch
- **POST** `/api/v1/agents/telemetry`
- **Headers:** `Authorization: Bearer <agent_token>`
- **Request:**
  ```json
  {
    "scan_id": "scan-1700000000",
    "agent_id": "agent-linux-01",
    "subnet": "192.168.1.0/24",
    "started_at": "2026-11-10T12:00:00Z",
    "completed_at": "2026-11-10T12:00:25Z",
    "duration_ms": 25000,
    "total_hosts": 254,
    "active_hosts": 12,
    "devices": [ ... ],
    "findings": [ ... ],
    "health_metrics": {
      "gateway_latency_ms": 1.1,
      "internet_latency_ms": 12.4,
      "jitter_ms": 1.6,
      "packet_loss_pct": 0.0,
      "dns_lookup_ms": 7.8,
      "status": "excellent"
    },
    "security_score": 85
  }
  ```

---

## 3. Devices & Wake-on-LAN (`/api/v1/devices`)

- **GET** `/api/v1/devices`: Filter devices by `network_id`, `device_type`, `trust_level`, and `search`.
- **PATCH** `/api/v1/devices/{id}`: Update `custom_name` or `trust_level`.
- **POST** `/api/v1/devices/{id}/wol`: Dispatches Wake-on-LAN magic packet.

---

## 4. Reports & Exports (`/api/v1/reports`)

- **GET** `/api/v1/reports/export/csv?network_id={id}`: Downloads RFC 4180 CSV inventory.
- **GET** `/api/v1/reports/export/pdf?network_id={id}`: Downloads executive security audit PDF report.

---

## 5. Live WebSocket Feed (`/api/v1/ws/live`)

Clients establish a persistent WebSocket connection:
`ws://localhost:8000/api/v1/ws/live`

### Event Types:
- `ALERT_CREATED`: Emitted immediately when a new device connects, IP changes, or vulnerability is identified.
- `NETWORK_UPDATED`: Emitted on scan completion with updated security score and online device totals.

