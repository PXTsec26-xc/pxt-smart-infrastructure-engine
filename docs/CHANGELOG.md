# PXT Smart Infrastructure Engine — Release Changelog

All notable changes to the **PXT Smart Infrastructure Engine** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-10-04

### Added
- **Dynamic API Base Resolution**: Refactored `frontend/src/services/api.ts` to dynamically resolve `API_BASE` and `WS_BASE` using `import.meta.env.VITE_API_BASE_URL` or window location for public cloud deployment.
- **NIST-Compliant Password Hashing**: Upgraded `backend/auth.py` to use PBKDF2-HMAC-SHA256 with random salt per password and backward compatibility.
- **Operational Diagnostics Endpoint**: Added `/api/health/diagnostics` endpoint returning detailed system health, MQTT status, device counts, and uptime metrics.
- **Documentation Suite**: Added complete `docs/` documentation directory (`IMPLEMENTATION_AUDIT.md`, `ROADMAP.md`, `CHANGELOG.md`, `DEPLOYMENT.md`, `OPERATIONS.md`, `TESTING.md`, `IMPLEMENTATION_STATUS.md`, `DECISIONS_AND_BLOCKERS.md`).
- **Google Search Console Verification**: Added `frontend/public/google8e7a6e34132ffca2.html` for domain ownership verification on public deployment.

### Security
- Excluded SQLite binary database (`pxt_iot.db`) and local environment secrets (`.env`) from Git tracking.
- Enforced HTTP security headers (`nosniff`, `DENY`, `XSS Protection`, `HSTS`, `CSP`).

---

## [1.1.0] - 2026-10-03

### Added
- **Alert Summary Reconciler**: Added `/api/alerts/summary` to separate Active Unresolved, Acknowledged, and Resolved alerts.
- **Interactive SCADA Topology**: Upgraded canvas graph with zoom/pan controls, connection flow status, and node inspection modal.
- **Hardware Integration Adapters**: Pluggable protocol adapters for Modbus TCP and HTTP/REST hardware ingestion.
- **Automated E2E Test Suite**: 8 mandatory Pytest integration tests covering telemetry flow, command ACK, failure detection, recovery, automation rules, persistence, and auth controls.
