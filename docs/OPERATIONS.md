# PXT Smart Infrastructure Engine — Operations & Diagnostics Manual

**Project Designation**: PXT SMART INFRASTRUCTURE ENGINE  
**Project Owner**: Sahil Maisuria (Elliot PXT sec26)  

---

## 1. Daily Operational Management

### Master System Start
Boots the embedded MQTT Broker, FastAPI Engine, 25 Virtual Simulators, and React Dashboard:
```bash
python start_system.py
```

### Clean System Shutdown & Port Reset
Scans and terminates holding processes on ports 1883, 8000, 9001, 5173:
```bash
python stop_system.py
```

---

## 2. Health Check & Diagnostics Endpoints

The backend provides 3 operational monitoring endpoints:

1. **Service Diagnostics**: `GET /api/health`
   - Returns operational status, connected MQTT broker flag, device counts, and active alert totals.
2. **Kubernetes Liveness Probe**: `GET /api/health/liveness`
   - Returns HTTP 200 `{"status": "ALIVE"}` if the main event loop is running.
3. **Kubernetes Readiness Probe**: `GET /api/health/readiness`
   - Returns HTTP 200 `{"status": "READY"}` only if both SQLite database connection and MQTT broker socket connection are verified active.

---

## 3. Database Maintenance & Backups

### Run Retention Policy Cleanup
Deletes raw telemetry records older than `TELEMETRY_RETENTION_DAYS` (default: 30 days):
```bash
python -m backend.migrations
```

### Perform Database Backup
Creates a timestamped snapshot of `pxt_iot.db` in `backups/`:
```bash
python -m backend.backup
```

---

## 4. Troubleshooting Guide

- **Port Conflict (Errno 10048)**: A previous instance was killed without closing sockets. Run `python stop_system.py`.
- **Database Lock (sqlite3.OperationalError: database is locked)**: The engine uses `aiosqlite` async connection pooling. Ensure no external GUI tools hold exclusive write locks on `pxt_iot.db`.
- **WebSocket Disconnection**: The React dashboard automatically attempts reconnection every 3 seconds. Verify backend server at `/api/health`.
