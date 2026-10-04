# PXT Smart Infrastructure — Architecture Specification

## Public Cloud & Hybrid Deployment Topology

```
+-----------------------------------------------------------------------------------+
|                        Autonomous IoT Device Simulators                           |
|        (Smart Grid, HVAC, Smart Water, Industrial Automation, Environmental)      |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | MQTT v3.1.1 (TCP Port 1883)
                                          v
+-----------------------------------------+-----------------------------------------+
|                  MQTT Messaging Broker Engine (amqtt / Mosquitto)                 |
|             TCP Port: 1883 (Ingestion)  |  WS Port: 9001 (Web Gateway)            |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | Async MQTT Client (paho-mqtt)
                                          v
+-----------------------------------------+-----------------------------------------+
|                         FastAPI Processing Engine Core                            |
|   - Ingestion Loop: Schema Validation, Metric Bounds, Anomaly Handling            |
|   - Heartbeat Health Engine: 2s Watcher (10s Missed Heartbeat Timeout -> OFFLINE)|
|   - Backend Rule Engine: Dynamic Threshold Evaluator & Auto-Alert Generator       |
|   - SQLite Persistence Engine: Async SQLAlchemy (pxt_iot.db)                       |
|   - Security & Auth: JWT Bearer & Salted SHA-256 Hashing                          |
|   - Real-Time WebSocket Gateway: Live Event & Telemetry Broadcaster (/ws)         |
|   - Public Config & Diagnostics: /api/config, /api/health/diagnostics              |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | HTTPS REST & Secure WebSockets (WSS)
                                          v
+-----------------------------------------+-----------------------------------------+
|                  React + TypeScript Industrial Dashboard                  |
|     (Public Web / Vercel / Netlify / Containerized NGINX Static Host)             |
|     - Dynamic Endpoint Resolution (URL Query > LocalStorage > Env > Origin)       |
|     - 5-State Connection Machine (CONNECTING, CONNECTED, DEGRADED, RETRY, OFFLINE)|
|     - Zero Local Software Requirement for Public Visitors                         |
+-----------------------------------------------------------------------------------+
```

## Protocol Topic Taxonomy

- `pxt/telemetry/{device_id}`: Sensor readings payload containing metric names, values, units, and timestamps.
- `pxt/heartbeat/{device_id}`: High-frequency availability ping containing device uptime and timestamp.
- `pxt/status/{device_id}`: Retained operational state message (`ONLINE`, `OFFLINE`, `DEGRADED`, `MALFUNCTIONING`).
- `pxt/commands/{device_id}`: Control actions published from backend to device.
- `pxt/ack/{device_id}`: Command execution acknowledgement published from device to backend.
- `pxt/events/{device_id}`: System state transition and anomaly events.

## Dual Operating Modes

1. **Mode A — Simulation Mode (Autonomous Digital Twin)**:
   - 25 Python simulated devices running mathematical sensor models.
   - Ideal for public demos, testing automation rules, and anomaly drills without physical hardware.

2. **Mode B — Physical Hardware Mode**:
   - Ingestion via HTTP REST endpoint (`POST /api/telemetry/ingest`) for microcontrollers (ESP32, Arduino, Raspberry Pi).
   - Ingestion via MQTT TCP Port 1883 for field gateways.
   - Industrial PLC register polling over Modbus TCP.
