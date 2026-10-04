import os
import sys
import pytest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)

from simulator.simulator_manager import build_25_devices

def test_25_devices_specification():
    """Verify that all 25 virtual devices across 5 domains are correctly configured."""
    devices = build_25_devices("127.0.0.1", 1883)
    assert len(devices) == 25, f"Expected 25 devices, found {len(devices)}"

    domain_counts = {}
    for dev in devices:
        domain_counts[dev.domain] = domain_counts.get(dev.domain, 0) + 1
        assert len(dev.sensors) > 0, f"Device {dev.device_id} has no sensors configured"

    assert domain_counts.get("Smart Grid") == 5
    assert domain_counts.get("HVAC") == 5
    assert domain_counts.get("Smart Water") == 5
    assert domain_counts.get("Industrial Automation") == 5
    assert domain_counts.get("Environmental Monitoring") == 5
    print(f"\nTEST PASSED: Verified 25 devices correctly distributed across 5 domains: {domain_counts}")

def test_sensor_bounds_and_volatility():
    """Verify that virtual sensor readings stay within operational physics bounds."""
    devices = build_25_devices("127.0.0.1", 1883)
    for dev in devices:
        for metric_name, sensor in dev.sensors.items():
            assert sensor.min_val < sensor.max_val
            assert sensor.min_val <= sensor.nominal_val <= sensor.max_val
            assert sensor.noise_std >= 0
            val = sensor.read_value(is_powered_on=True)
            assert sensor.min_val <= val <= sensor.max_val
    print("\nTEST PASSED: Sensor boundary and physics models verified.")
