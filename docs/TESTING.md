# PXT Smart Infrastructure Engine — Automated Testing & Quality Gates

**Project Designation**: PXT SMART INFRASTRUCTURE ENGINE  
**Project Owner**: Sahil Maisuria (Elliot PXT sec26)  

---

## 1. Automated Test Execution Commands

### Execute Pytest End-to-End Test Suite
```bash
python run_tests.py
```

### Execute Frontend Production Build & TypeScript Type Validation
```bash
cd frontend
npm run build
```

---

## 2. Test Suite Coverage Breakdown (`tests/test_e2e.py`)

The automated Pytest suite validates 8 mandatory end-to-end integration contracts:

| Test Name | Validated Architectural Contract | Target Endpoint / Transport |
| :--- | :--- | :--- |
| `test_a_device_telemetry_flow` | Ingestion of live telemetry from simulator through broker to SQLite & WS | `GET /api/telemetry/latest` |
| `test_b_device_command_and_ack_flow` | Issuance of REST control command, MQTT publication, and simulator ACK | `POST /api/devices/{id}/command` |
| `test_c_device_failure_detection` | Device failure detection and creation of incident alert in SQLite | `POST /api/devices/{id}/command` |
| `test_d_device_recovery_detection` | Device recovery detection, status restoration to ONLINE, and event logging | `GET /api/events` |
| `test_e_automation_rule_execution` | Backend automation engine metric threshold evaluation and alert trigger | `GET /api/automation/history` |
| `test_f_data_persistence_across_restarts` | SQLite database schema persistence and historical record count verification | `pxt_iot.db` file check |
| `test_g_security_and_auth_controls` | Enforcement of 401 Unauthorized for missing tokens and bad passwords | `POST /api/auth/login` |
| `test_h_runtime_stability_and_resources` | 25-device concurrent simulator stability and system operational status | `GET /api/health` |

---

## 3. Test Outcome Verification History

```
============================= 8 passed in 12.90s ==============================
    STATUS: ALL MANDATORY END-TO-END TESTS PASSED PERFECTLY (100% SUCCESS)
```
