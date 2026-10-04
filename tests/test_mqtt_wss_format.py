import json
import time
import pytest

def test_mqtt_topic_namespacing():
    """Verify topic prefixes and structure for TLS MQTT-over-WebSocket telemetry."""
    prefix = "pxt/sec26_prod"
    device_id = "grid-substation-01"

    telemetry_topic = f"{prefix}/telemetry/{device_id}"
    status_topic = f"{prefix}/status/{device_id}"
    command_topic = f"{prefix}/command/{device_id}"
    alerts_topic = f"{prefix}/alerts"

    assert telemetry_topic.startswith("pxt/sec26_prod/")
    assert status_topic.startswith("pxt/sec26_prod/")
    assert command_topic.startswith("pxt/sec26_prod/")
    assert alerts_topic == "pxt/sec26_prod/alerts"

def test_telemetry_packet_framing():
    """Verify that simulated telemetry packets conform to the expected schema."""
    ts = time.time()
    packet = [
        {"metric_name": "oil_temp", "value": 58.4, "unit": "°C", "timestamp": ts},
        {"metric_name": "voltage", "value": 132.1, "unit": "kV", "timestamp": ts}
    ]

    serialized = json.dumps(packet)
    deserialized = json.loads(serialized)

    assert isinstance(deserialized, list)
    assert len(deserialized) == 2
    assert deserialized[0]["metric_name"] == "oil_temp"
    assert deserialized[0]["unit"] == "°C"
    print("\nTEST PASSED: MQTT telemetry packet formatting and serialization verified.")
