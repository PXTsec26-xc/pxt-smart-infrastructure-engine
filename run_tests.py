import sys
import os
import subprocess
import time

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))

def main():
    print("=" * 80)
    print("      PXT SMART INFRASTRUCTURE — AUTOMATED END-TO-END SUITE RUNNER")
    print("=" * 80)
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Python Executable: {sys.executable}")
    print(f"Working Directory: {ROOT_DIR}\n")

    cmd = [sys.executable, "-m", "pytest", "tests/test_e2e.py", "-v", "-s", "--color=yes"]
    print(f"Executing: {' '.join(cmd)}\n")

    result = subprocess.run(cmd, cwd=ROOT_DIR)
    
    print("\n" + "=" * 80)
    if result.returncode == 0:
        print("    STATUS: ALL MANDATORY END-TO-END TESTS PASSED PERFECTLY (100% SUCCESS)")
    else:
        print("    STATUS: TEST FAILURES DETECTED — CHECK LOGS ABOVE")
    print("=" * 80)

    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
