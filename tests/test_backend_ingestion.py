import sys
import os
import time
import json
import subprocess
import logging
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("TestBackendIngestion")

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)

BASE_URL = "http://127.0.0.1:8000"

def run_backend_test():
    logger.info("--- STARTING BACKEND INGESTION, DATABASE & COMMAND TEST ---")
    broker_proc = None
    backend_proc = None
    sim_proc = None

    try:
        # 1. Launch MQTT Broker
        broker_proc = subprocess.Popen([sys.executable, os.path.join(ROOT_DIR, "broker", "mqtt_broker.py")], cwd=ROOT_DIR)
        time.sleep(2.5)
        assert broker_proc.poll() is None, "Broker failed to start"

        # 2. Launch FastAPI Backend Core
        backend_proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"], cwd=ROOT_DIR)
        time.sleep(3.5)
        assert backend_proc.poll() is None, "Backend failed to start"

        # 3. Launch Devices Simulator Suite
        sim_proc = subprocess.Popen([sys.executable, os.path.join(ROOT_DIR, "simulator", "simulator_manager.py")], cwd=ROOT_DIR)
        time.sleep(2.5)
        assert sim_proc.poll() is None, "Simulator failed to start"

        # 4. Wait for ingestion & data propagation (6 seconds)
        logger.info("Waiting 6 seconds for telemetry ingestion into SQLite database...")
        time.sleep(6.0)

        # 5. REST API Checks
        # A) Health Endpoint
        resp_health = requests.get(f"{BASE_URL}/api/health", timeout=5)
        logger.info(f"Health API Response: {resp_health.status_code} -> {resp_health.json()}")
        assert resp_health.status_code == 200, "Health API failed"
        health_data = resp_health.json()
        assert health_data["status"] == "OPERATIONAL"
        assert health_data["mqtt_broker_connected"] is True

        # B) List Devices API
        resp_devices = requests.get(f"{BASE_URL}/api/devices", timeout=5)
        devices = resp_devices.json()
        logger.info(f"Devices API Response: {len(devices)} devices found in DB")
        assert len(devices) == 25, f"Expected 25 registered devices in SQLite DB, got {len(devices)}"

        # C) Ingested Telemetry API
        resp_telem = requests.get(f"{BASE_URL}/api/telemetry/latest", timeout=5)
        telem_list = resp_telem.json()
        logger.info(f"Telemetry API Response: {len(telem_list)} telemetry records in DB")
        assert len(telem_list) > 0, "No telemetry records stored in SQLite database!"

        # D) Auth & Token Login
        resp_auth = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"}, timeout=5)
        assert resp_auth.status_code == 200, "Admin login failed"
        token = resp_auth.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # E) Bidirectional Command & Acknowledgement Test
        cmd_target = "grid-substation-01"
        logger.info(f"Issuing REST command to device {cmd_target}...")
        cmd_resp = requests.post(
            f"{BASE_URL}/api/devices/{cmd_target}/command",
            json={"action": "trigger_anomaly", "parameters": {"sensor": "oil_temp", "value": 98.5}},
            headers=headers,
            timeout=5
        )
        assert cmd_resp.status_code == 200, f"Command issue failed: {cmd_resp.text}"
        cmd_info = cmd_resp.json()
        cmd_id = cmd_info["command_id"]
        logger.info(f"Command issued with ID {cmd_id}. Waiting 2 seconds for simulator ACK...")
        time.sleep(2.0)

        # F) Verify Command ACK in Database
        cmd_list_resp = requests.get(f"{BASE_URL}/api/commands?device_id={cmd_target}", timeout=5)
        cmds = cmd_list_resp.json()
        matching_cmd = next((c for c in cmds if c["id"] == cmd_id), None)
        assert matching_cmd is not None, f"Command #{cmd_id} not found in DB history"
        logger.info(f"Command Execution Record: Status={matching_cmd['status']}, Message='{matching_cmd['message']}'")
        assert matching_cmd["status"] == "ACKNOWLEDGED", f"Command status is {matching_cmd['status']}, expected ACKNOWLEDGED!"

        logger.info("✅ BACKEND INGESTION, DATABASE & BIDIRECTIONAL COMMAND TEST PASSED!")
        return 0

    except Exception as e:
        logger.error(f"❌ BACKEND TEST FAILED: {e}", exc_info=True)
        return 1

    finally:
        if sim_proc and sim_proc.poll() is None:
            sim_proc.terminate()
            sim_proc.wait()
        if backend_proc and backend_proc.poll() is None:
            backend_proc.terminate()
            backend_proc.wait()
        if broker_proc and broker_proc.poll() is None:
            broker_proc.terminate()
            broker_proc.wait()

if __name__ == "__main__":
    sys.exit(run_backend_test())
