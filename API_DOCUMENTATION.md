# PXT Smart Infrastructure — REST & WebSockets API Reference

Base URL: `http://127.0.0.1:8000`  
WebSocket: `ws://127.0.0.1:8000/ws`  

---

## Endpoints Summary

### Authentication
- `POST /api/auth/login` — Authenticates user credentials and returns JWT Bearer Token.
- `GET /api/auth/me` — Returns current authenticated user context.

### Device Management
- `GET /api/devices` — Lists all registered virtual and physical devices.
- `POST /api/devices` — Registers a new hardware or virtual device node.
- `GET /api/devices/{device_id}` — Returns device details.
- `POST /api/devices/{device_id}/command` — Issues actuator control command (`set_power`, `restart`, `simulate_failure`, `simulate_recovery`, `trigger_anomaly`).

### Telemetry Ingestion & History
- `GET /api/telemetry/latest` — Returns latest telemetry records.
- `GET /api/telemetry/history/{device_id}` — Returns historical timeseries for device metrics.
- `POST /api/telemetry/ingest` — Ingests direct HTTP REST hardware telemetry payload.

### Incident & Alert Management
- `GET /api/alerts` — Returns alert records (supports `acknowledged` & `resolved` filters).
- `GET /api/alerts/summary` — Returns count breakdown (active_unresolved, acknowledged, resolved).
- `POST /api/alerts/{id}/acknowledge` — Marks alert as acknowledged.
- `POST /api/alerts/{id}/resolve` — Marks alert as resolved.

### System Mode & Diagnostics
- `GET /api/system/mode` — Returns current operating mode (`SIMULATION` vs `PHYSICAL_HARDWARE`).
- `POST /api/system/mode` — Toggles system operating mode.
- `GET /api/health` — Returns system operational summary.
- `GET /api/health/liveness` — Kubernetes/Docker liveness probe.
- `GET /api/health/readiness` — Service readiness probe checking DB and MQTT.
