import asyncio
import json
import time
from sqlalchemy import select
from backend.database import AsyncSessionLocal, init_db
from backend.models import DeviceORM, UserORM, AutomationRuleORM, SystemConfigORM
from backend.auth import hash_password

DEFAULT_DEVICES = [
    # 1. Smart Grid
    {"id": "grid-substation-01", "name": "Main Substation Transformer T1", "device_type": "Substation Transformer", "domain": "Smart Grid", "location": "Substation Alpha - Sector 1"},
    {"id": "grid-inverter-02", "name": "Commercial Solar Inverter Array", "device_type": "Solar Inverter", "domain": "Smart Grid", "location": "Solar Farm Zone B"},
    {"id": "grid-battery-03", "name": "BESS Megawatt Battery Storage", "device_type": "Battery Storage", "domain": "Smart Grid", "location": "Grid Storage Hub 4"},
    {"id": "grid-transformer-04", "name": "Distribution Transformer D4", "device_type": "Distribution Transformer", "domain": "Smart Grid", "location": "North Industrial Park"},
    {"id": "grid-feeder-05", "name": "High Voltage Feeder Line F-12", "device_type": "Grid Feeder", "domain": "Smart Grid", "location": "Substation Alpha Corridor"},
    # 2. HVAC
    {"id": "hvac-chiller-01", "name": "Central Centrifugal Chiller CH-1", "device_type": "Water Chiller", "domain": "HVAC", "location": "Central Plant Basement"},
    {"id": "hvac-ahu-02", "name": "Primary Air Handling Unit AHU-02", "device_type": "Air Handling Unit", "domain": "HVAC", "location": "Floor 4 Mechanical Room"},
    {"id": "hvac-boiler-03", "name": "High-Pressure Steam Boiler B-3", "device_type": "Industrial Boiler", "domain": "HVAC", "location": "Utility Boiler House"},
    {"id": "hvac-cooling-tower-04", "name": "Evaporative Cooling Tower CT-4", "device_type": "Cooling Tower", "domain": "HVAC", "location": "Rooftop Deck B"},
    {"id": "hvac-vav-05", "name": "Executive Zone VAV Controller", "device_type": "VAV Terminal", "domain": "HVAC", "location": "Floor 12 Executive Wing"},
    # 3. Smart Water
    {"id": "water-pump-01", "name": "Main District Water Pump P-101", "device_type": "Centrifugal Lift Pump", "domain": "Smart Water", "location": "Pumping Station West"},
    {"id": "water-valve-02", "name": "District Pressure Reducing Valve PRV-22", "device_type": "Control Valve", "domain": "Smart Water", "location": "Pipeline Junction 7"},
    {"id": "water-quality-03", "name": "Water Treatment Station Analyzer WQ-3", "device_type": "Water Quality Analyzer", "domain": "Smart Water", "location": "Treatment Facility Lab"},
    {"id": "water-tank-04", "name": "Elevated Municipal Storage Reservoir", "device_type": "Storage Reservoir", "domain": "Smart Water", "location": "Highland Reservoir Peak"},
    {"id": "water-digester-05", "name": "Wastewater Anaerobic Digester D-5", "device_type": "Sludge Digester", "domain": "Smart Water", "location": "Wastewater Facility South"},
    # 4. Industrial Automation
    {"id": "ind-robot-arm-01", "name": "Heavy Assembly Robotic Arm RB-01", "device_type": "Industrial Robot", "domain": "Industrial Automation", "location": "Automotive Assembly Line 1"},
    {"id": "ind-conveyor-02", "name": "High-Speed Logistics Conveyor C-2", "device_type": "Sorting Conveyor", "domain": "Industrial Automation", "location": "Fulfillment Logistics Hub"},
    {"id": "ind-cnc-mill-03", "name": "Precision 5-Axis CNC Milling Center", "device_type": "CNC Machining Center", "domain": "Industrial Automation", "location": "Precision Fabrication Cell"},
    {"id": "ind-compressor-04", "name": "Rotary Screw Air Compressor AC-4", "device_type": "Air Compressor", "domain": "Industrial Automation", "location": "Plant Utility Bay"},
    {"id": "ind-packer-05", "name": "High-Speed Automated Cartoner PK-5", "device_type": "Packaging Machine", "domain": "Industrial Automation", "location": "Packaging Line 3"},
    # 5. Environmental Monitoring
    {"id": "env-station-01", "name": "Main Meteorological Weather Tower", "device_type": "Weather Station", "domain": "Environmental Monitoring", "location": "Rooftop Atmospheric Array"},
    {"id": "env-aqi-02", "name": "Urban Air Quality Monitoring Station", "device_type": "Air Quality Station", "domain": "Environmental Monitoring", "location": "Perimeter Wall South"},
    {"id": "env-gas-detector-03", "name": "Hazardous Industrial Gas Sensor GS-3", "device_type": "Gas Sniffer", "domain": "Environmental Monitoring", "location": "Chemical Storage Vault"},
    {"id": "env-noise-04", "name": "Facility Boundary Noise Level Monitor", "device_type": "Sound Meter", "domain": "Environmental Monitoring", "location": "Facility Fence North"},
    {"id": "env-soil-05", "name": "Subsurface Soil & Hydrology Sensor", "device_type": "Agri-Soil Probe", "domain": "Environmental Monitoring", "location": "Greenbelt Buffer Zone"}
]

DEFAULT_RULES = [
    {
        "name": "Substation Transformer Overheating Protection",
        "description": "Triggers critical alert when Transformer Oil Temp exceeds 85.0 °C",
        "enabled": True,
        "target_device": "grid-substation-01",
        "metric_name": "oil_temp",
        "operator": ">",
        "threshold_val": 85.0,
        "action_type": "RAISE_ALERT",
        "action_params": json.dumps({"severity": "CRITICAL"})
    },
    {
        "name": "Chiller Evaporator Low Pressure Warning",
        "description": "Triggers warning alert when Chiller Evaporator Pressure drops below 45.0 PSI",
        "enabled": True,
        "target_device": "hvac-chiller-01",
        "metric_name": "refrigerant_pressure",
        "operator": "<",
        "threshold_val": 45.0,
        "action_type": "RAISE_ALERT",
        "action_params": json.dumps({"severity": "WARNING"})
    },
    {
        "name": "High CO2 Ambient Ventilation Trigger",
        "description": "Triggers warning alert when Executive Zone CO2 exceeds 1000 PPM",
        "enabled": True,
        "target_device": "hvac-vav-05",
        "metric_name": "co2_ppm",
        "operator": ">",
        "threshold_val": 1000.0,
        "action_type": "RAISE_ALERT",
        "action_params": json.dumps({"severity": "WARNING"})
    },
    {
        "name": "Water Pump High Bearing Vibration Anomaly",
        "description": "Triggers warning alert when Pump Motor Vibration exceeds 5.0 mm/s",
        "enabled": True,
        "target_device": "water-pump-01",
        "metric_name": "motor_vibration",
        "operator": ">",
        "threshold_val": 5.0,
        "action_type": "RAISE_ALERT",
        "action_params": json.dumps({"severity": "WARNING"})
    },
    {
        "name": "Hazardous Methane Concentration Emergency",
        "description": "Triggers critical alert when Methane LEL exceeds 5.0 %",
        "enabled": True,
        "target_device": "env-gas-detector-03",
        "metric_name": "ch4_pct",
        "operator": ">",
        "threshold_val": 5.0,
        "action_type": "RAISE_ALERT",
        "action_params": json.dumps({"severity": "CRITICAL"})
    }
]

async def seed_database():
    await init_db()
    async with AsyncSessionLocal() as session:
        # 1. Seed Devices
        for dev in DEFAULT_DEVICES:
            res = await session.execute(select(DeviceORM).where(DeviceORM.id == dev["id"]))
            if not res.scalar_one_or_none():
                orm_dev = DeviceORM(
                    id=dev["id"],
                    name=dev["name"],
                    device_type=dev["device_type"],
                    domain=dev["domain"],
                    location=dev["location"],
                    status="OFFLINE",
                    is_powered_on=True
                )
                session.add(orm_dev)

        # 2. Seed Default Admin User
        user_res = await session.execute(select(UserORM).where(UserORM.username == "admin"))
        if not user_res.scalar_one_or_none():
            admin_user = UserORM(
                username="admin",
                password_hash=hash_password("admin123"),
                role="admin"
            )
            session.add(admin_user)

        # 3. Seed Default Automation Rules
        rule_res = await session.execute(select(AutomationRuleORM))
        existing_rules = rule_res.scalars().all()
        if not existing_rules:
            for r in DEFAULT_RULES:
                rule_orm = AutomationRuleORM(
                    name=r["name"],
                    description=r["description"],
                    enabled=r["enabled"],
                    target_device=r["target_device"],
                    metric_name=r["metric_name"],
                    operator=r["operator"],
                    threshold_val=r["threshold_val"],
                    action_type=r["action_type"],
                    action_params=r["action_params"]
                )
                session.add(rule_orm)

        # 4. Seed System Settings
        cfg_res = await session.execute(select(SystemConfigORM).where(SystemConfigORM.key == "telemetry_retention_days"))
        if not cfg_res.scalar_one_or_none():
            session.add(SystemConfigORM(key="telemetry_retention_days", value="30"))
            session.add(SystemConfigORM(key="heartbeat_timeout_seconds", value="10"))

        await session.commit()
        print("PXT Smart Infrastructure Database Seeded Successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
