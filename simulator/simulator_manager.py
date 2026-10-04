import sys
import os
import asyncio
import logging
import signal
import json
from typing import Dict, List, Optional

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from simulator.models import SensorModel, DeviceStatus
from simulator.device import VirtualDevice

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("PXT-Simulator-Manager")

def build_25_devices(broker_host: Optional[str] = None, broker_port: Optional[int] = None) -> List[VirtualDevice]:
    b_host = broker_host or os.getenv("MQTT_HOST", "127.0.0.1")
    b_port = broker_port or int(os.getenv("MQTT_PORT", "1883"))
    devices = []

    # --- 1. SMART GRID ENERGY (5 Devices) ---
    devices.append(VirtualDevice(
        device_id="grid-substation-01",
        name="Main Substation Transformer T1",
        device_type="Substation Transformer",
        domain="Smart Grid",
        location="Substation Alpha - Sector 1",
        sensors={
            "voltage": SensorModel("Line Voltage", "kV", 110.0, 140.0, 132.0, 0.8),
            "current": SensorModel("Phase Current", "A", 200.0, 900.0, 450.0, 12.0),
            "active_power": SensorModel("Active Power", "MW", 30.0, 120.0, 85.0, 2.5),
            "oil_temp": SensorModel("Transformer Oil Temp", "°C", 35.0, 95.0, 58.0, 1.2),
            "frequency": SensorModel("Grid Frequency", "Hz", 49.0, 51.0, 50.0, 0.05)
        },
        broker_host=b_host, broker_port=b_port
    ))

    devices.append(VirtualDevice(
        device_id="grid-inverter-02",
        name="Commercial Solar Inverter Array",
        device_type="Solar Inverter",
        domain="Smart Grid",
        location="Solar Farm Zone B",
        sensors={
            "power_output": SensorModel("Active AC Output", "kW", 0.0, 500.0, 320.0, 15.0),
            "efficiency": SensorModel("Conversion Efficiency", "%", 85.0, 99.0, 97.5, 0.3),
            "dc_voltage": SensorModel("DC String Voltage", "V", 600.0, 1000.0, 820.0, 8.0),
            "inverter_temp": SensorModel("IGBT Heatsink Temp", "°C", 30.0, 85.0, 48.0, 1.0)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="grid-battery-03",
        name="BESS Megawatt Battery Storage",
        device_type="Battery Storage",
        domain="Smart Grid",
        location="Grid Storage Hub 4",
        sensors={
            "soc": SensorModel("State of Charge", "%", 10.0, 100.0, 78.0, 0.2),
            "charge_rate": SensorModel("Discharge / Charge Rate", "kW", -250.0, 250.0, 45.0, 5.0),
            "cell_temp": SensorModel("Max Cell Temperature", "°C", 20.0, 55.0, 31.0, 0.5),
            "health_soh": SensorModel("State of Health", "%", 80.0, 100.0, 96.5, 0.01)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="grid-transformer-04",
        name="Distribution Transformer D4",
        device_type="Distribution Transformer",
        domain="Smart Grid",
        location="North Industrial Park",
        sensors={
            "load_pct": SensorModel("Load Percentage", "%", 10.0, 110.0, 64.0, 2.0),
            "winding_temp": SensorModel("Winding Temp", "°C", 30.0, 105.0, 62.0, 1.1),
            "power_factor": SensorModel("Power Factor", "cosφ", 0.85, 1.0, 0.96, 0.01)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="grid-feeder-05",
        name="High Voltage Feeder Line F-12",
        device_type="Grid Feeder",
        domain="Smart Grid",
        location="Substation Alpha Corridor",
        sensors={
            "current_load": SensorModel("Line Current", "A", 50.0, 600.0, 310.0, 8.0),
            "reactive_power": SensorModel("Reactive Power", "MVAr", 1.0, 25.0, 8.4, 0.4)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    # --- 2. HVAC & BUILDING AUTOMATION (5 Devices) ---
    devices.append(VirtualDevice(
        device_id="hvac-chiller-01",
        name="Central Centrifugal Chiller CH-1",
        device_type="Water Chiller",
        domain="HVAC",
        location="Central Plant Basement",
        sensors={
            "supply_temp": SensorModel("Supply Water Temp", "°C", 4.0, 12.0, 6.5, 0.3),
            "return_temp": SensorModel("Return Water Temp", "°C", 8.0, 18.0, 12.0, 0.4),
            "refrigerant_pressure": SensorModel("Evaporator Pressure", "PSI", 40.0, 90.0, 65.0, 1.5),
            "energy_consumption": SensorModel("Power Usage", "kW", 100.0, 450.0, 280.0, 6.0)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="hvac-ahu-02",
        name="Primary Air Handling Unit AHU-02",
        device_type="Air Handling Unit",
        domain="HVAC",
        location="Floor 4 Mechanical Room",
        sensors={
            "duct_pressure": SensorModel("Supply Air Static Pressure", "Pa", 100.0, 600.0, 350.0, 10.0),
            "airflow_rate": SensorModel("Airflow Volumetric Rate", "CFM", 2000.0, 12000.0, 8500.0, 150.0),
            "filter_dp": SensorModel("Filter Differential Pressure", "Pa", 20.0, 250.0, 85.0, 3.0),
            "fan_speed": SensorModel("Blower Fan Speed", "RPM", 300.0, 1800.0, 1420.0, 20.0)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="hvac-boiler-03",
        name="High-Pressure Steam Boiler B-3",
        device_type="Industrial Boiler",
        domain="HVAC",
        location="Utility Boiler House",
        sensors={
            "steam_pressure": SensorModel("Steam Pressure", "Bar", 2.0, 15.0, 8.5, 0.2),
            "flame_temp": SensorModel("Combustion Chamber Temp", "°C", 600.0, 1200.0, 920.0, 12.0),
            "efficiency": SensorModel("Thermal Efficiency", "%", 75.0, 95.0, 88.5, 0.4)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="hvac-cooling-tower-04",
        name="Evaporative Cooling Tower CT-4",
        device_type="Cooling Tower",
        domain="HVAC",
        location="Rooftop Deck B",
        sensors={
            "basin_temp": SensorModel("Water Basin Temp", "°C", 15.0, 38.0, 24.0, 0.5),
            "fan_vibration": SensorModel("Fan Shaft Vibration", "mm/s", 0.5, 12.0, 2.1, 0.2),
            "water_level": SensorModel("Basin Water Level", "%", 40.0, 100.0, 88.0, 1.0)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="hvac-vav-05",
        name="Executive Zone VAV Controller",
        device_type="VAV Terminal",
        domain="HVAC",
        location="Floor 12 Executive Wing",
        sensors={
            "room_temp": SensorModel("Ambient Room Temp", "°C", 18.0, 30.0, 22.5, 0.2),
            "co2_ppm": SensorModel("CO2 Concentration", "PPM", 400.0, 1800.0, 650.0, 25.0),
            "damper_pos": SensorModel("Damper Opening", "%", 0.0, 100.0, 45.0, 2.0)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    # --- 3. SMART WATER & HYDRAULICS (5 Devices) ---
    devices.append(VirtualDevice(
        device_id="water-pump-01",
        name="Main District Water Pump P-101",
        device_type="Centrifugal Lift Pump",
        domain="Smart Water",
        location="Pumping Station West",
        sensors={
            "flow_rate": SensorModel("Volumetric Flow", "GPM", 500.0, 3500.0, 2200.0, 45.0),
            "discharge_pressure": SensorModel("Discharge Pressure", "PSI", 40.0, 150.0, 95.0, 2.0),
            "motor_vibration": SensorModel("Bearing Vibration", "mm/s", 0.2, 10.0, 1.4, 0.1),
            "motor_temp": SensorModel("Winding Temp", "°C", 30.0, 90.0, 52.0, 0.8)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="water-valve-02",
        name="District Pressure Reducing Valve PRV-22",
        device_type="Control Valve",
        domain="Smart Water",
        location="Pipeline Junction 7",
        sensors={
            "inlet_pressure": SensorModel("Upstream Pressure", "PSI", 80.0, 160.0, 120.0, 2.5),
            "outlet_pressure": SensorModel("Downstream Pressure", "PSI", 30.0, 70.0, 55.0, 1.2),
            "valve_opening": SensorModel("Valve Stem Opening", "%", 0.0, 100.0, 62.0, 1.0)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="water-quality-03",
        name="Water Treatment Station Analyzer WQ-3",
        device_type="Water Quality Analyzer",
        domain="Smart Water",
        location="Treatment Facility Lab",
        sensors={
            "turbidity": SensorModel("Water Turbidity", "NTU", 0.1, 10.0, 0.8, 0.05),
            "ph_level": SensorModel("Water pH Level", "pH", 6.0, 9.0, 7.4, 0.05),
            "free_chlorine": SensorModel("Free Chlorine", "mg/L", 0.2, 3.0, 1.2, 0.04)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="water-tank-04",
        name="Elevated Municipal Storage Reservoir",
        device_type="Storage Reservoir",
        domain="Smart Water",
        location="Highland Reservoir Peak",
        sensors={
            "water_level": SensorModel("Water Level Depth", "m", 1.0, 15.0, 11.8, 0.1),
            "volume_m3": SensorModel("Stored Volume", "m³", 1000.0, 25000.0, 18500.0, 100.0)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="water-digester-05",
        name="Wastewater Anaerobic Digester D-5",
        device_type="Sludge Digester",
        domain="Smart Water",
        location="Wastewater Facility South",
        sensors={
            "methane_pct": SensorModel("Biogas Methane Conc", "%", 45.0, 75.0, 62.5, 0.8),
            "sludge_temp": SensorModel("Digester Temp", "°C", 30.0, 45.0, 37.0, 0.3)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    # --- 4. INDUSTRIAL AUTOMATION (5 Devices) ---
    devices.append(VirtualDevice(
        device_id="ind-robot-arm-01",
        name="Heavy Assembly Robotic Arm RB-01",
        device_type="Industrial Robot",
        domain="Industrial Automation",
        location="Automotive Assembly Line 1",
        sensors={
            "axis1_temp": SensorModel("Servo Motor 1 Temp", "°C", 25.0, 85.0, 42.0, 1.0),
            "payload_kg": SensorModel("Current Payload Mass", "kg", 0.0, 150.0, 85.0, 2.0),
            "cycle_count": SensorModel("Completed Work Cycles", "cycles", 0.0, 100000.0, 14200.0, 0.0),
            "vibration": SensorModel("Joint 3 Vibration", "g", 0.05, 5.0, 0.45, 0.05)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="ind-conveyor-02",
        name="High-Speed Logistics Conveyor C-2",
        device_type="Sorting Conveyor",
        domain="Industrial Automation",
        location="Fulfillment Logistics Hub",
        sensors={
            "belt_speed": SensorModel("Linear Belt Speed", "m/s", 0.0, 4.0, 2.4, 0.05),
            "motor_current": SensorModel("Drive Motor Current", "A", 2.0, 40.0, 18.5, 0.6),
            "bearing_temp": SensorModel("Drive Pulley Bearing Temp", "°C", 25.0, 90.0, 48.0, 1.1)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="ind-cnc-mill-03",
        name="Precision 5-Axis CNC Milling Center",
        device_type="CNC Machining Center",
        domain="Industrial Automation",
        location="Precision Fabrication Cell",
        sensors={
            "spindle_rpm": SensorModel("Spindle Speed", "RPM", 0.0, 24000.0, 12500.0, 150.0),
            "coolant_pressure": SensorModel("Coolant Flow Pressure", "Bar", 1.0, 20.0, 12.0, 0.3),
            "tool_wear_pct": SensorModel("Cutter Tool Wear", "%", 0.0, 100.0, 34.0, 0.1)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="ind-compressor-04",
        name="Rotary Screw Air Compressor AC-4",
        device_type="Air Compressor",
        domain="Industrial Automation",
        location="Plant Utility Bay",
        sensors={
            "air_pressure": SensorModel("Pneumatic Header Pressure", "Bar", 4.0, 12.0, 7.8, 0.15),
            "oil_temp": SensorModel("Compressor Oil Temp", "°C", 40.0, 110.0, 76.0, 1.2)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="ind-packer-05",
        name="High-Speed Automated Cartoner PK-5",
        device_type="Packaging Machine",
        domain="Industrial Automation",
        location="Packaging Line 3",
        sensors={
            "throughput_ppm": SensorModel("Pack Rate", "units/min", 0.0, 300.0, 210.0, 8.0),
            "sealer_temp": SensorModel("Heat Sealing Jaw Temp", "°C", 120.0, 240.0, 185.0, 1.5)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    # --- 5. ENVIRONMENTAL MONITORING (5 Devices) ---
    devices.append(VirtualDevice(
        device_id="env-station-01",
        name="Main Meteorological Weather Tower",
        device_type="Weather Station",
        domain="Environmental Monitoring",
        location="Rooftop Atmospheric Array",
        sensors={
            "ambient_temp": SensorModel("Ambient Air Temp", "°C", -10.0, 50.0, 26.5, 0.4),
            "humidity": SensorModel("Relative Humidity", "%", 10.0, 100.0, 58.0, 1.2),
            "baro_pressure": SensorModel("Barometric Pressure", "hPa", 950.0, 1050.0, 1013.2, 0.5),
            "wind_speed": SensorModel("Wind Speed Velocity", "m/s", 0.0, 45.0, 5.2, 0.8)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="env-aqi-02",
        name="Urban Air Quality Monitoring Station",
        device_type="Air Quality Station",
        domain="Environmental Monitoring",
        location="Perimeter Wall South",
        sensors={
            "pm2_5": SensorModel("Particulate PM2.5", "µg/m³", 0.0, 300.0, 18.5, 2.0),
            "pm10": SensorModel("Particulate PM10", "µg/m³", 0.0, 500.0, 42.0, 3.5),
            "no2_ppm": SensorModel("Nitrogen Dioxide", "PPM", 0.0, 2.0, 0.08, 0.01),
            "co2_ppm": SensorModel("Ambient CO2 Level", "PPM", 350.0, 1500.0, 420.0, 15.0)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="env-gas-detector-03",
        name="Hazardous Industrial Gas Sensor GS-3",
        device_type="Gas Sniffer",
        domain="Environmental Monitoring",
        location="Chemical Storage Vault",
        sensors={
            "ch4_pct": SensorModel("Methane LEL", "%", 0.0, 100.0, 0.2, 0.05),
            "h2s_ppm": SensorModel("Hydrogen Sulfide", "PPM", 0.0, 50.0, 0.1, 0.02),
            "o2_pct": SensorModel("Oxygen Concentration", "%", 15.0, 25.0, 20.9, 0.1)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="env-noise-04",
        name="Facility Boundary Noise Level Monitor",
        device_type="Sound Meter",
        domain="Environmental Monitoring",
        location="Facility Fence North",
        sensors={
            "sound_db": SensorModel("Equivalent Sound Level", "dBA", 30.0, 120.0, 58.4, 2.5),
            "peak_db": SensorModel("Peak Impulse Level", "dBC", 40.0, 140.0, 72.1, 4.0)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    devices.append(VirtualDevice(
        device_id="env-soil-05",
        name="Subsurface Soil & Hydrology Sensor",
        device_type="Agri-Soil Probe",
        domain="Environmental Monitoring",
        location="Greenbelt Buffer Zone",
        sensors={
            "soil_moisture": SensorModel("Soil Volumetric Water Content", "%", 5.0, 60.0, 28.0, 0.8),
            "soil_temp": SensorModel("Deep Soil Temp", "°C", 5.0, 35.0, 18.2, 0.3),
            "salinity_ec": SensorModel("Electrical Conductivity", "dS/m", 0.1, 10.0, 1.4, 0.05)
        },
        broker_host=broker_host, broker_port=broker_port
    ))

    return devices

class SimulatorRunner:
    def __init__(self, broker_host: str = None, broker_port: int = None):
        self.broker_host = broker_host or os.getenv("MQTT_HOST", "127.0.0.1")
        self.broker_port = broker_port or int(os.getenv("MQTT_PORT", "1883"))
        self.devices = build_25_devices(self.broker_host, self.broker_port)

    async def run(self):
        logger.info(f"Starting PXT Simulator Suite with {len(self.devices)} autonomous virtual devices...")
        tasks = []
        for dev in self.devices:
            tasks.append(asyncio.create_task(dev.start()))
        logger.info(f"ALL {len(self.devices)} VIRTUAL DEVICES RUNNING AND PUBLISHING TELEMETRY/HEARTBEATS.")
        try:
            await asyncio.gather(*tasks)
        except asyncio.CancelledError:
            logger.info("Stopping all virtual device simulation tasks...")
            for dev in self.devices:
                dev.stop()

if __name__ == "__main__":
    runner = SimulatorRunner()
    try:
        asyncio.run(runner.run())
    except KeyboardInterrupt:
        logger.info("Simulator process terminated by user.")
