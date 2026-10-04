# PXT Smart Infrastructure Engine — Strategic Engineering Roadmap

**Project Designation**: PXT SMART INFRASTRUCTURE ENGINE  
**Project Owner**: Sahil Maisuria (Elliot PXT sec26)  
**Brand**: PXT (PhantomXTrace)  

---

## Roadmap Phases & Milestones

### Phase 1: Local Digital Twin Prototype (COMPLETED)
- Embedded `amqtt` Broker on TCP 1883 & WS 9001.
- 25 Autonomous Virtual IoT Devices across 5 Domains (Smart Grid, HVAC, Smart Water, Industrial Automation, Environmental Monitoring).
- FastAPI Async Ingestion Engine & SQLite database.
- React 18 SCADA Control Center UI with Recharts timeseries and interactive topology node inspector.
- 8/8 Mandatory Pytest End-to-End integration tests passing.

### Phase 2: Public Cloud Readiness & Security Hardening (IN PROGRESS)
- **Dynamic API Routing**: Dynamic `import.meta.env` URL resolving for public HTTPS deployment on Vercel (`https://pxt-smart-infrastructure-engine.vercel.app`).
- **NIST/OWASP Password Security**: Upgraded password hashing using PBKDF2-HMAC-SHA256 with per-user random salts.
- **Configurable CORS & Security Headers**: Environment-configurable allowed origins and strict HTTP security headers.
- **Cloud-Ready Broker & Simulator Configuration**: Configurable MQTT host/port environment variables (`MQTT_HOST`, `MQTT_PORT`, `MQTT_WS_PORT`).
- **Public Read-Only Demo Policy**: Anonymous public visitors can explore telemetry, devices, alerts, topology, and events without administrative alteration privileges.

### Phase 3: Distributed Edge Ingestion & Hardware Adapters (FUTURE)
- Modbus RTU / RS485 Serial Hardware Bridge.
- OPC-UA Industrial Automation Adapter.
- InfluxDB / TimescaleDB High-Volume Telemetry Retention Sink.
- Multi-Tenant Role-Based Access Control (RBAC) matrix.
