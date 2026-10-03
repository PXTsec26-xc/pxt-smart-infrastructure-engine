# PXT Smart Infrastructure — Database Schema Specification

Database Engine: SQLite (`pxt_iot.db`) with Async SQLAlchemy & `aiosqlite`.

---

## Entity Schemas

### 1. `devices` Table
- `id` (VARCHAR, PK) — Unique device identifier (e.g. `grid-substation-01`).
- `name` (VARCHAR, NOT NULL) — Display name.
- `device_type` (VARCHAR, NOT NULL) — Domain type taxonomy.
- `domain` (VARCHAR, INDEX) — Industrial sector (`Smart Grid`, `HVAC`, `Smart Water`, `Industrial Automation`, `Environmental Monitoring`).
- `location` (VARCHAR) — Facility location.
- `status` (VARCHAR, INDEX) — Operational state (`ONLINE`, `OFFLINE`, `DEGRADED`, `MALFUNCTIONING`, `STARTING`).
- `hardware_mode` (VARCHAR) — `VIRTUAL_SIMULATOR` or `PHYSICAL_HARDWARE`.
- `is_powered_on` (BOOLEAN) — Power state.
- `last_seen` (FLOAT) — Epoch timestamp of last received telemetry/heartbeat.
- `uptime` (FLOAT) — Running uptime seconds.
- `reconnect_count` (INTEGER) — Reconnection counter.
- `created_at` (FLOAT) — Registration timestamp.
- `updated_at` (FLOAT) — Last update timestamp.

### 2. `telemetry` Table
- `id` (INTEGER, PK AUTOINCREMENT)
- `device_id` (VARCHAR, FK devices.id, INDEX)
- `metric_name` (VARCHAR, INDEX)
- `value` (FLOAT, NOT NULL)
- `unit` (VARCHAR)
- `timestamp` (FLOAT, INDEX)
- Index: `idx_device_metric_time (device_id, metric_name, timestamp)`

### 3. `alerts` Table
- `id` (INTEGER, PK AUTOINCREMENT)
- `device_id` (VARCHAR, FK devices.id, INDEX)
- `severity` (VARCHAR, INDEX) — `INFO`, `WARNING`, `CRITICAL`
- `title` (VARCHAR)
- `description` (TEXT)
- `acknowledged` (BOOLEAN, INDEX)
- `acknowledged_by` (VARCHAR)
- `resolved` (BOOLEAN, INDEX)
- `created_at` (FLOAT, INDEX)
- `resolved_at` (FLOAT)

### 4. `events` Table
- `id` (INTEGER, PK AUTOINCREMENT)
- `device_id` (VARCHAR, INDEX)
- `event_type` (VARCHAR, INDEX)
- `message` (TEXT)
- `timestamp` (FLOAT, INDEX)

### 5. `automation_rules` & `automation_history` Tables
- Stores dynamic backend threshold rules and trigger execution history logs.

### 6. `commands` Table
- `id` (VARCHAR, PK) — Command UUID
- `device_id` (VARCHAR, FK devices.id)
- `action` (VARCHAR)
- `parameters` (TEXT JSON)
- `status` (VARCHAR, INDEX) — `REQUESTED`, `SENT`, `ACKNOWLEDGED`, `FAILED`, `TIMED_OUT`
- `requested_at` & `acknowledged_at` (FLOAT)

### 7. `users` & `audit_logs` Tables
- `users`: `id`, `username` (UNIQUE), `password_hash`, `role` (`admin`, `operator`).
- `audit_logs`: `id`, `username`, `action`, `resource`, `details`, `timestamp`.
