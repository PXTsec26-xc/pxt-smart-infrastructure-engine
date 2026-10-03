# PXT Smart Infrastructure — Technical Limitations & Operational Scope

## Documented Technical Limitations

1. **Database Storage Scope**: SQLite (`pxt_iot.db`) is optimized for local single-node deployment (~8 GB RAM machine). For multi-node distributed enterprise deployments handling >100,000 telemetry messages/second, PostgreSQL or TimescaleDB can be substituted by updating `DATABASE_URL` in `.env`.
2. **Local Development Execution**: The default deployment runs on `127.0.0.1` without HTTPS SSL certificates. HTTPS and reverse proxy configuration should be enabled for production cloud hosting via NGINX as documented in `DEPLOYMENT_GUIDE.md`.
3. **Simulation Provenance**: The initial 25 devices operate as autonomous Python virtual process simulators executing physical sensor noise and drift models. Physical hardware microcontrollers connect via HTTP REST (`POST /api/telemetry/ingest`) or standard MQTT as documented in `DEVICE_INTEGRATION_GUIDE.md`.
