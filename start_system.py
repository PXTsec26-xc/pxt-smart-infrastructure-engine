import os
import sys
import time
import subprocess
import signal

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))

def main():
    print("=" * 80)
    print("      PXT SMART INFRASTRUCTURE — REAL-TIME IoT ENGINE LAUNCHER")
    print("=" * 80)
    print("Founder: Elliot PXT sec26")
    print("Deployment: Local laptop (Windows, ~8 GB RAM optimized)\n")

    processes = []

    try:
        # 1. Start Embedded MQTT Broker
        print("[1/4] Booting Embedded MQTT Broker (amqtt)...")
        broker_proc = subprocess.Popen([sys.executable, os.path.join(ROOT_DIR, "broker", "mqtt_broker.py")], cwd=ROOT_DIR)
        processes.append(("MQTT Broker (TCP 1883 / WS 9001)", broker_proc))
        time.sleep(2.5)

        # 2. Start FastAPI Ingestion Core & Backend REST/WS API
        print("[2/4] Booting FastAPI Backend & Ingestion Core (http://127.0.0.1:8000)...")
        backend_proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"], cwd=ROOT_DIR)
        processes.append(("FastAPI Backend (Port 8000)", backend_proc))
        time.sleep(3.5)

        # 3. Start 25 Autonomous Device Simulators
        print("[3/4] Launching 25 Autonomous Virtual IoT Devices across 5 Domain Sectors...")
        sim_proc = subprocess.Popen([sys.executable, os.path.join(ROOT_DIR, "simulator", "simulator_manager.py")], cwd=ROOT_DIR)
        processes.append(("Simulator Suite (25 Devices)", sim_proc))
        time.sleep(2.5)

        # 4. Start React Industrial Control Center Dashboard
        print("[4/4] Launching React + TypeScript Dashboard (http://localhost:5173)...")
        frontend_dir = os.path.join(ROOT_DIR, "frontend")
        frontend_proc = subprocess.Popen(["npm.cmd", "run", "dev"], cwd=frontend_dir, shell=True)
        processes.append(("React Dashboard (Port 5173)", frontend_proc))

        print("\n" + "=" * 80)
        print("    PXT SMART INFRASTRUCTURE IS FULLY OPERATIONAL AND RUNNING LIVE!")
        print("=" * 80)
        print("  - Industrial Dashboard: http://localhost:5173")
        print("  - Backend REST API Docs: http://127.0.0.1:8000/docs")
        print("  - MQTT Broker TCP Port: 127.0.0.1:1883")
        print("  - MQTT Broker WS Port:  127.0.0.1:9001")
        print("  - Active Virtual Devices: 25 Autonomous Simulators")
        print("  - SQLite Database File: pxt_iot.db")
        print("\nPress Ctrl+C at any time to gracefully shut down all services.\n")

        while True:
            time.sleep(1.0)

    except KeyboardInterrupt:
        print("\n[Shutdown Signal Received] Terminating all PXT child processes gracefully...")
        for name, proc in reversed(processes):
            if proc.poll() is None:
                print(f"Stopping {name}...")
                proc.terminate()
                try:
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    proc.kill()
        print("ALL PXT SERVICES TERMINATED CLEANLY.")

if __name__ == "__main__":
    main()
