# PXT Smart Infrastructure Engine

![SCADA Platform Status](https://img.shields.io/badge/System-Operational-00F2FF?style=for-the-badge&logo=scada)
![License](https://img.shields.io/badge/License-MIT-3B82F6?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.12-10B981?style=for-the-badge&logo=python)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-F59E0B?style=for-the-badge&logo=typescript)

**Founder**: Elliot PXT sec26  
**Classification**: Enterprise Industrial SCADA & IoT Digital Twin Engine  
**Operating Modes**: Dual Mode (Simulation vs Physical Hardware Ingestion)  

---

## 1. Title & Branding

The **PXT Smart Infrastructure Engine** is an enterprise-grade industrial SCADA command center and real-time IoT Digital Twin platform designed for monitoring, telemetry visualization, automated incident resolution, and hardware edge simulation across critical infrastructure domains.

---

## 2. Project Overview

Modern smart infrastructure requires real-time observability across disparate physical and virtual assets. The **PXT Smart Infrastructure Engine** unifies telemetry ingestion, protocol adaptation, heartbeat monitoring, rule-based automation, and industrial human-machine interface (HMI) controls into a high-performance local or containerized deployment stack.

---

## 3. Mission & Objectives

- **Operational Integrity**: Provide sub-second telemetry visualization and incident reporting without relying on hardcoded or mock static UI data.
- **Protocol Flexibility**: Bridge edge protocols including MQTT, HTTP/REST, and Modbus TCP into a unified data schema.
- **Hardware-Agnostic Simulation**: Provide realistic physical noise, drift, and boundary simulation models across 25 autonomous virtual devices for testing before hardware deployment.
- **Autonomous Incident Lifecycle**: Automatically detect missed device heartbeats, trigger emergency rules, notify operators, and record immutable security audit trails.

---

## 4. Core Features

- **Industrial SCADA HMI**: Dark-theme dashboard with custom high-contrast SCADA visual hierarchy (`#0b0f19` graphite, `#00f2ff` electric cyan telemetry, `#3b82f6` control blue, `#ef4444` alarm red).
- **Dual Operating Modes**: Switch between **Mode A (Simulation Mode)** with 25 virtual Python sensors and **Mode B (Physical Hardware Mode)** for direct microcontroller/REST ingestion.
- **Interactive Topology Canvas**: Real-time interactive node visualization graph with canvas zoom/pan controls, connection status indicators, and live node inspection overlays.
- **Device Telemetry Inspector**: Real-time gauge dials, Recharts timeseries graphs, historical anomaly calibration controls, and command acknowledgement console.
- **Triple-State Incident Console**: Full incident lifecycle manager separating Active Unresolved Incidents, Acknowledged Alerts, and Resolved Historical Records.
- **Backend Automation Engine**: Multi-condition threshold rule evaluator firing alerts, status mutations, and MQTT actuator commands independently of active UI sessions.

---

## 5. System Architecture

```
                                  +---------------------------------------+
                                  |    React 18 + TypeScript SCADA UI     |
                                  |  (Overview, Topology, Alerts, Logs)   |
                                  +-------------------+-------------------+
                                                      | WebSockets / REST
                                                      v
                                  +---------------------------------------+
                                  |     FastAPI Async Ingestion Core      |
                                  |   (Auth, Rule Engine, Health Watcher) |
                                  +---------+-------------------+---------+
                                            |                   |
                     +----------------------+                   +----------------------+
                     | MQTT Client Sub                                                 | Async SQLAlchemy
                     v                                                                 v
+------------------------------------------+                               +-----------------------+
|  amqtt Embedded Broker (TCP 1883 / WS 9001) |                               |   SQLite Database     |
+--------------------+---------------------+                               |      pxt_iot.db       |
                     ^                                                     +-----------------------+
                     | Telemetry / Commands / ACKs
+--------------------+-----------------------------------------------------------------------------+
|                                25 Virtual IoT Device Simulators                                  |
| (Smart Grid, HVAC, Smart Water, Industrial Automation, Environmental Monitoring Noise Models)    |
+--------------------------------------------------------------------------------------------------+
```

---

## 6. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Canvas API.
- **Backend**: Python 3.12, FastAPI, AsyncIO, SQLAlchemy Async, PyJWT, Pydantic v2.
- **Messaging & Protocols**: `amqtt` embedded MQTT Broker (TCP 1883 & WS 9001), Modbus TCP Adapter, HTTP/REST Ingestion.
- **Database**: SQLite 3 (`aiosqlite` async driver).
- **Testing & Tooling**: Pytest, Asyncio Pytest Plugin, ESLint, TypeScript Compiler (`tsc`).

---

## 7. Frontend & Backend Descriptions

### Frontend SCADA Interface (`/frontend`)
Built as a single-page SCADA application optimized for high-density information display. Uses modular component layout:
- `Navbar.tsx`: Live system clock, active alert counts, broker connection status chips, and Mode A/B toggle.
- `Overview.tsx`: System operational state, 6 sector KPI tiles, real-time telemetry stream, and critical event ticker.
- `Topology.tsx`: Interactive SVG node graph with zoom/pan capabilities, connection line status, and telemetry modal inspector.
- `DeviceList.tsx`: Grid/Table inventory browser with domain filtering, status sorting, search bar, and direct control action triggers.
- `Alerts.tsx`: Incident console supporting one-click incident acknowledgement and resolution.

### Backend Services (`/backend`)
Asynchronous Python architecture utilizing FastAPI:
- `main.py`: Application factory, REST router registration, WebSocket connection management, security headers middleware.
- `mqtt_ingestion.py`: Subscribes to MQTT topics, parses telemetry frames, checks rules, updates DB, and broadcasts live WebSockets.
- `health_monitor.py`: Background watcher checking device heartbeat timestamps every 2s (marks offline after 10s).
- `automation_engine.py`: Dynamic rule evaluator checking metric thresholds (`>`, `<`, `==`) and executing actions.
- `adapters/`: Modular protocol translation layer (`BaseDeviceAdapter`, `ModbusTcpAdapter`, `HttpRestAdapter`).

---

## 8. IoT Device Simulation Explanation

> [!IMPORTANT]
> **Provenance & Simulation Disclosure**:
> Telemetry metrics and actuator command responses generated by the 25 default devices originate from **Python-powered mathematical simulation models** (`simulator/`). These scripts simulate physical properties (transformer temperatures, chiller pressures, flow rates, vibration noise, sensor drift, and random anomaly spikes).
> No physical hardware (e.g. physical SCADA PLCs or physical Modbus RTU hardware) is required to run this prototype platform. Physical hardware can be connected by enabling **Mode B (Physical Hardware Ingestion)**.

### Simulated Device Matrix (5 Domains, 25 Devices):
1. **Smart Grid**: Substation Transformer T1, Solar Inverter Array, BESS Battery Storage, Distribution Transformer D4, HV Feeder Line F-12.
2. **HVAC**: Centrifugal Chiller CH-1, Air Handling Unit AHU-02, Industrial Boiler B-3, Cooling Tower CT-4, VAV Terminal.
3. **Smart Water**: District Water Pump P-101, Pressure Reducing Valve PRV-22, Water Quality Analyzer WQ-3, Storage Reservoir, Wastewater Digester D-5.
4. **Industrial Automation**: Heavy Robotic Arm RB-01, High-Speed Conveyor C-2, 5-Axis CNC Milling Center, Air Compressor AC-4, Cartoner PK-5.
5. **Environmental Monitoring**: Meteorological Weather Tower, Air Quality Station, Hazardous Gas Sniffer GS-3, Sound Level Meter, Soil Hydrology Probe.

---

## 9. MQTT Communication Architecture

The system utilizes standard topic hierarchies over TCP (`1883`) and WebSockets (`9001`):

| Topic Pattern | Direction | Description |
| :--- | :--- | :--- |
| `pxt/telemetry/{device_id}` | Simulator -> Broker -> Backend | Real-time sensor reading payload JSON |
| `pxt/heartbeat/{device_id}` | Simulator -> Broker -> Backend | Liveness ping timestamp frame |
| `pxt/commands/{device_id}` | Backend/UI -> Broker -> Simulator | Actuator control payload (`POWER`, `RESTART`, `FAIL`, `RECOVER`, `ANOMALY`) |
| `pxt/ack/{device_id}` | Simulator -> Broker -> Backend | Command execution confirmation response |

---

## 10. Installation Requirements

- **Operating System**: Windows 10/11, macOS, or Linux.
- **Python**: Python 3.10 or higher.
- **Node.js**: Node.js v18.0.0 or higher & `npm` v9+.
- **Git**: Git 2.30+.

---

## 11. Step-by-Step Local Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/elliotcyber911/pxt-smart-infrastructure-engine.git
   cd pxt-smart-infrastructure-engine
   ```

2. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Frontend Dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Environment Setup**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

---

## 12. Environment Configuration

The environment configuration is specified in `.env`:

```env
HOST=127.0.0.1
PORT=8000
MQTT_HOST=127.0.0.1
MQTT_PORT=1883
MQTT_WS_PORT=9001
SECRET_KEY=PXT_SMART_INFRASTRUCTURE_SECRET_KEY_PROTOTYPE
DATABASE_URL=sqlite+aiosqlite:///./pxt_iot.db
TELEMETRY_RETENTION_DAYS=30
HEARTBEAT_TIMEOUT_SECONDS=10
SYSTEM_OPERATING_MODE=SIMULATION
```

---

## 13. Frontend Launch Instructions

To launch only the React development server:
```bash
cd frontend
npm run dev
```
Dashboard URL: `http://localhost:5173`

To build for production:
```bash
cd frontend
npm run build
```

---

## 14. Backend Launch Instructions

To launch the master orchestration script (Boots MQTT Broker, FastAPI Engine, 25 Simulators, and Frontend):
```bash
python start_system.py
```

To stop all running services cleanly:
```bash
python stop_system.py
```

---

## 15. Testing Instructions

To run the automated Pytest end-to-end integration test suite:
```bash
python run_tests.py
```
Expected Output: `8 passed in ~33s (100% Success Rate)`.

---

## 16. API Documentation

When the backend server is running (`http://127.0.0.1:8000`), access the interactive Swagger OpenAPI documentation at:
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc UI**: `http://127.0.0.1:8000/redoc`

### Core API Endpoints:
- `POST /api/auth/token` - Authenticate & obtain JWT Bearer Token
- `GET /api/devices` - Retrieve device inventory & status
- `GET /api/devices/{id}` - Retrieve individual device detail & historical telemetry
- `POST /api/devices/{id}/command` - Issue actuator control command
- `GET /api/alerts/summary` - Retrieve active, acknowledged, and resolved incident counts
- `GET /api/health/liveness` - Service liveness status
- `GET /api/health/readiness` - Service readiness status

---

## 17. Security Considerations

- **Authentication**: JWT Bearer Tokens with expiration timeout.
- **Credential Storage**: Passwords hashed using double SHA-256 with custom salt.
- **HTTP Security Headers**: Middleware injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, and `Content-Security-Policy`.
- **Audit Logging**: Write-only audit log entries for all critical administrative actions.

---

## 18. Deployment Limitations

- **Storage Engine**: Built on SQLite with `aiosqlite`. For large-scale production (>1,000 devices), migration to PostgreSQL/TimescaleDB is recommended.
- **MQTT Scale**: The embedded `amqtt` broker is optimized for local laptop and single-node edge deployments (~100 concurrent topics). For enterprise cluster scale, EMQX or Mosquitto is recommended.

---

## 19. Known Issues & Troubleshooting

- **Port Conflicts (1883, 8000, 9001, 5173)**: If a previous process crashed without releasing ports, run `python stop_system.py` to identify and terminate holding PIDs.

---

## 20. Roadmap

- [ ] Modbus RTU RS485 Serial Gateway Bridge.
- [ ] TimescaleDB / InfluxDB Retention Sink Integration.
- [ ] Multi-tenant Role-Based Access Control (RBAC) matrix.
- [ ] Mobile-optimized PWA HMI view.

---

## 21. Founder Attribution

**PXT Smart Infrastructure Engine**  
Designed, Engineered, and Developed by **Sahil Maisuria (Elliot PXT sec26)**.  
Copyright © 2026. All Rights Reserved.
