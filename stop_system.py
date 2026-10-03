import subprocess
import re
import sys

PORTS_TO_CLEAN = [1883, 8000, 9001, 5173]

def kill_processes_on_ports():
    print("Scanning for processes bound to PXT ports (1883, 8000, 9001, 5173)...")
    pids_to_kill = set()

    try:
        # Run netstat to find listening PIDs
        res = subprocess.run(["netstat", "-ano"], capture_output=True, text=True)
        lines = res.stdout.splitlines()
        for line in lines:
            for port in PORTS_TO_CLEAN:
                if f":{port} " in line or f":{port}\t" in line:
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        if pid.isdigit() and int(pid) > 0 and int(pid) != os.getpid():
                            pids_to_kill.add(pid)

        for pid in pids_to_kill:
            print(f"Terminating process PID {pid}...")
            subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True)

        print("PXT ports cleared successfully.")

    except Exception as e:
        print(f"Error terminating processes: {e}")

if __name__ == "__main__":
    import os
    kill_processes_on_ports()
