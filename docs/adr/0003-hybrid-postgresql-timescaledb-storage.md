# ADR-0003: Hybrid Relational and Time-Series Storage with TimescaleDB

## Context
NetScope serves two fundamentally different query profiles:
1. **Relational Entities:** Complex, highly-indexed multi-tenant entities (Tenants, Users, RBAC permissions, Networks, Devices, Ports, Alerts, Audit Logs) requiring ACID transactions and relational integrity.
2. **High-Frequency Telemetry:** Sub-second time-series metrics (ping RTT latency, jitter, packet loss, DNS resolution times, bandwidth measurements) written continuously by thousands of agents.

## Decision
NetScope uses a **Hybrid PostgreSQL + TimescaleDB architecture**:
- **PostgreSQL 16:** Hosts relational business models via SQLAlchemy 2 with Alembic migrations.
- **TimescaleDB Extension:** Turns the `network_metrics` table into a partitioned **Hypertable** partitioned by `recorded_at`:
  ```sql
  SELECT create_hypertable('network_metrics', 'recorded_at');
  ```
- **Automated Rollups & Downsampling:** Continuous aggregates automatically downsample raw 10-second telemetry into 1-hour and 1-day rollups, maintaining fast UI chart queries (<50ms) across years of historical data.

## Consequences
- Single unified database engine to operate, backup, and monitor (no need to run separate InfluxDB or Prometheus instances).
- Native SQL JOINs between device metadata and historical latency metrics.

