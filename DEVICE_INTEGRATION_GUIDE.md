# PXT Smart Infrastructure — Device Integration Guide

This guide details how physical hardware microcontrollers (ESP32, Raspberry Pi, Arduino, Modbus Gateway) connect to the PXT Smart Infrastructure Engine.

---

## 1. MQTT Hardware Integration

Hardware devices publish telemetry to topic `pxt/telemetry/{device_id}`:

```json
{
  "device_id": "esp32-water-01",
  "device_type": "Physical ESP32 Water Meter",
  "domain": "Smart Water",
  "location": "Sector 4 Pump House",
  "status": "ONLINE",
  "metrics": {
    "flow_rate": { "name": "Water Flow", "value": 142.5, "unit": "GPM" },
    "pressure": { "name": "Pipe Pressure", "value": 62.4, "unit": "PSI" }
  },
  "timestamp": 1791042500.0
}
```

Hardware devices subscribe to commands on `pxt/commands/{device_id}`:

```json
{
  "command_id": "cmd_1001",
  "device_id": "esp32-water-01",
  "action": "set_power",
  "parameters": { "state": "OFF" },
  "timestamp": 1791042501.0
}
```

Hardware devices respond with ACK on `pxt/ack/{device_id}`:

```json
{
  "command_id": "cmd_1001",
  "device_id": "esp32-water-01",
  "action": "set_power",
  "status": "ACKNOWLEDGED",
  "message": "Physical valve powered OFF",
  "timestamp": 1791042502.0
}
```

---

## 2. Direct HTTP/REST Ingestion API

Microcontrollers without MQTT clients push directly to `POST http://127.0.0.1:8000/api/telemetry/ingest`:

```bash
curl -X POST http://127.0.0.1:8000/api/telemetry/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "rpi-sensor-99",
    "is_physical_hardware": true,
    "metrics": {
      "temperature": { "value": 24.8, "unit": "°C" },
      "vibration": { "value": 1.2, "unit": "mm/s" }
    }
  }'
```
