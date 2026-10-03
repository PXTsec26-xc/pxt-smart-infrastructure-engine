# PXT Smart Infrastructure — Architecture Specification

## System Topology & Data Flow

```
+-----------------------------------------------------------------------------------+
|                        Autonomous IoT Device Simulators                           |
|        (Smart Grid, HVAC, Smart Water, Industrial Automation, Environmental)      |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | MQTT (v3.1.1 / v5)
                                          v
+-----------------------------------------+-----------------------------------------+
|                  Embedded Python MQTT Broker (amqtt / asyncio)                    |
|             TCP Port: 127.0.0.1:1883  |  WS Port: 127.0.0.1:9001                  |
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
|   - Real-Time WebSocket Gateway: Live Event & Telemetry Broadcaster               |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | WebSockets & REST API
                                          v
+-----------------------------------------+-----------------------------------------+
|                  React + TypeScript Industrial Dashboard                  |
|     (Dark SCADA Palette: Cyan #00f2ff, Soft Blue, Amber, Red, Emerald)            |
+-----------------------------------------------------------------------------------+
```

## Protocol Topic Taxonomy

- `pxt/telemetry/{device_id}`: Sensor readings payload containing metric names, values, units, and timestamps.
- `pxt/heartbeat/{device_id}`: High-frequency availability ping containing device uptime and timestamp.
- `pxt/status/{device_id}`: Retained operational state message (`ONLINE`, `OFFLINE`, `DEGRADED`, `MALFUNCTIONING`).
- `pxt/commands/{device_id}`: Control actions published from backend to device.
- `pxt/ack/{device_id}`: Command execution acknowledgement published from device to backend.
- `pxt/events/{device_id}`: System state transition and anomaly events.
