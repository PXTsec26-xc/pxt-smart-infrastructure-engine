import sys
import os
import time
import json
import subprocess
import logging
from typing import List, Dict, Any

import paho.mqtt.client as mqtt

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("TestBrokerSimulator")

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)

received_telemetry: List[Dict[str, Any]] = []
received_heartbeats: List[Dict[str, Any]] = []
received_statuses: List[Dict[str, Any]] = []

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode("utf-8"))
        if "telemetry" in topic:
            received_telemetry.append(payload)
        elif "heartbeat" in topic:
            received_heartbeats.append(payload)
        elif "status" in topic:
            received_statuses.append(payload)
    except Exception as e:
        logger.error(f"Error parsing MQTT message on {msg.topic}: {e}")

def run_integration_test():
    logger.info("--- STARTING BROKER & SIMULATOR INTEGRATION TEST ---")
    broker_proc = None
    sim_proc = None
    client = None

    try:
        # 1. Launch MQTT Broker Subprocess
        broker_cmd = [sys.executable, os.path.join(ROOT_DIR, "broker", "mqtt_broker.py")]
        logger.info(f"Launching Broker: {' '.join(broker_cmd)}")
        broker_proc = subprocess.Popen(broker_cmd, cwd=ROOT_DIR)
        
        # Verify broker remains running
        time.sleep(2.5)
        if broker_proc.poll() is not None:
            raise RuntimeError(f"MQTT Broker process exited prematurely with code {broker_proc.poll()}")

        # 2. Connect Test Subscriber Client
        logger.info("Connecting test subscriber client to 127.0.0.1:1883...")
        try:
            client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2, client_id="test_verifier")
        except Exception:
            client = mqtt.Client(client_id="test_verifier")

        client.on_message = on_message
        client.connect("127.0.0.1", 1883, 60)
        client.subscribe("pxt/#", qos=0)
        client.loop_start()

        # 3. Launch Simulator Subprocess
        sim_cmd = [sys.executable, os.path.join(ROOT_DIR, "simulator", "simulator_manager.py")]
        logger.info(f"Launching Simulator: {' '.join(sim_cmd)}")
        sim_proc = subprocess.Popen(sim_cmd, cwd=ROOT_DIR)

        # Verify simulator remains running
        time.sleep(2.0)
        if sim_proc.poll() is not None:
            raise RuntimeError(f"Simulator process exited prematurely with code {sim_proc.poll()}")

        # 4. Collect & Verify MQTT Messages
        logger.info("Collecting MQTT telemetry & heartbeats for 8 seconds...")
        timeout = 8.0
        start_time = time.time()
        while time.time() - start_time < timeout:
            time.sleep(0.5)

        logger.info(f"Received Stats: Telemetry={len(received_telemetry)}, Heartbeats={len(received_heartbeats)}, Statuses={len(received_statuses)}")

        # 5. Execute Strict Assertions
        assert broker_proc.poll() is None, "Broker process stopped unexpectedly"
        assert sim_proc.poll() is None, "Simulator process stopped unexpectedly"
        
        assert len(received_statuses) >= 5, f"Expected >= 5 status messages, got {len(received_statuses)}"
        assert len(received_telemetry) >= 10, f"Expected >= 10 telemetry messages, got {len(received_telemetry)}"
        assert len(received_heartbeats) >= 10, f"Expected >= 10 heartbeat messages, got {len(received_heartbeats)}"

        # Validate message payload structure
        sample_telem = received_telemetry[0]
        assert "device_id" in sample_telem, "Telemetry missing 'device_id'"
        assert "metrics" in sample_telem, "Telemetry missing 'metrics'"
        assert "status" in sample_telem, "Telemetry missing 'status'"
        assert "timestamp" in sample_telem, "Telemetry missing 'timestamp'"

        sample_hb = received_heartbeats[0]
        assert "device_id" in sample_hb, "Heartbeat missing 'device_id'"
        assert "status" in sample_hb, "Heartbeat missing 'status'"

        unique_devices = set(m["device_id"] for m in received_telemetry)
        logger.info(f"Verified telemetry received from {len(unique_devices)} distinct virtual devices: {sorted(list(unique_devices))[:5]}...")
        assert len(unique_devices) >= 5, f"Expected telemetry from multiple devices, got {len(unique_devices)}"

        logger.info("✅ BROKER & SIMULATOR INTEGRATION TEST PASSED PERFECTLY!")
        return 0

    except Exception as e:
        logger.error(f"❌ INTEGRATION TEST FAILED: {e}", exc_info=True)
        return 1

    finally:
        # 6. Graceful Shutdown of processes
        if client:
            client.loop_stop()
            client.disconnect()

        if sim_proc and sim_proc.poll() is None:
            logger.info("Terminating simulator process...")
            sim_proc.terminate()
            try:
                sim_proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                sim_proc.kill()

        if broker_proc and broker_proc.poll() is None:
            logger.info("Terminating broker process...")
            broker_proc.terminate()
            try:
                broker_proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                broker_proc.kill()

if __name__ == "__main__":
    sys.exit(run_integration_test())
