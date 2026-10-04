# PXT Smart Infrastructure Engine — Implementation Audit & Baseline Report

**Project Designation**: PXT SMART INFRASTRUCTURE ENGINE  
**Project Owner**: Sahil Maisuria (Elliot PXT sec26)  
**Brand**: PXT (PhantomXTrace)  
**Audit Date**: 2026-10-04  
**Audit Status**: Complete Baseline Audit  

---

## 1. Executive Summary & Repository Baseline

A comprehensive baseline audit of the **PXT Smart Infrastructure Engine** repository was conducted. The codebase represents a fully functional, multi-protocol industrial SCADA digital twin and IoT infrastructure monitoring engine built with Python (FastAPI, amqtt, SQLite) and React (Vite, TypeScript, Tailwind CSS).

---

## 2. Component Inventory & Architecture Mapping

| Component | Technology / Framework | Entry Point File | Current Binding / Protocol | Public Readiness Status |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite, TypeScript, Tailwind | `frontend/src/App.tsx` | Local Dev: `http://localhost:5173` | **Requires Dynamic API URL** |
| **Backend API** | Python 3.12, FastAPI, AsyncIO | `backend/main.py` | Local Dev: `http://127.0.0.1:8000` | **Needs Dynamic CORS & Enhanced Auth** |
| **MQTT Broker** | Python `amqtt` (embedded) | `broker/mqtt_broker.py` | TCP `1883`, WS `9001` | **Needs Configurable Host Env Vars** |
| **Simulator** | Python 3.12, AsyncIO | `simulator/simulator_manager.py` | Local process matrix (25 nodes) | **Needs Environment-based Broker Host** |
| **Database** | SQLite 3, SQLAlchemy Async | `pxt_iot.db` | Local Async SQLite | **Supported with Exclusions** |

---

## 3. Identified Defect & Vulnerability Matrix

| Finding ID | Severity | Affected File(s) | Description | Recommended Fix |
| :--- | :---: | :--- | :--- | :--- |
| **AUD-01** | **HIGH** | `frontend/src/services/api.ts` | Hardcoded `API_BASE = "http://127.0.0.1:8000"` breaks when deployed on public HTTPS hosts (Vercel). | Refactor `API_BASE` and `WS_BASE` to dynamically inspect `import.meta.env.VITE_API_BASE_URL` or window location. |
| **AUD-02** | **MEDIUM** | `backend/auth.py` | Password hashing uses custom double SHA-256 with static salt (`PXT_SECURE_SALT_2026`). | Upgrade to NIST/OWASP compliant PBKDF2-HMAC-SHA256 with random salt & backward compatibility fallback. |
| **AUD-03** | **MEDIUM** | `backend/main.py` | Static CORS `allow_origins=["*"]` without environment configuration support. | Add dynamic environment reader `ALLOWED_ORIGINS` to specify trusted origins (e.g. `https://pxt-smart-infrastructure-engine.vercel.app`). |
| **AUD-04** | **LOW** | `broker/mqtt_broker.py`, `simulator/simulator_manager.py` | Host `127.0.0.1` hardcoded in broker and simulator scripts. | Read `MQTT_HOST`, `MQTT_PORT`, `MQTT_WS_PORT` from `os.getenv()`. |

---

## 4. Verification & Baseline Compliance

- **Frontend Production Build**: Tested `npm run build` — Passed with **0 TypeScript errors**.
- **Pytest E2E Suite**: Tested `python run_tests.py` — Passed **8/8 mandatory end-to-end integration tests (100% success rate)**.
- **Git Tracking Safety**: Excluded `pxt_iot.db` and `.env` from Git via root `.gitignore`.
