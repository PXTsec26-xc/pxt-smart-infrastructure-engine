import { Device, TelemetryRecord, Alert, DeviceStatus } from '../types';
import { mqttService } from './mqttClient';

export interface SensorSpec {
  metricName: string;
  unit: string;
  minVal: number;
  maxVal: number;
  nominalVal: number;
  currentVal: number;
  volatility: number;
}

export interface VirtualDeviceSpec {
  id: string;
  name: string;
  deviceType: string;
  domain: string;
  location: string;
  status: DeviceStatus;
  isPoweredOn: boolean;
  sensors: Record<string, SensorSpec>;
  lastSeen: number;
  reconnectCount: number;
  anomalyActive?: string | null;
}

export type SimulatorTelemetryCallback = (record: TelemetryRecord) => void;
export type SimulatorDeviceCallback = (device: Device) => void;
export type SimulatorAlertCallback = (alert: Alert) => void;

function createSensor(metricName: string, unit: string, minVal: number, maxVal: number, nominalVal: number, volatility: number): SensorSpec {
  return {
    metricName,
    unit,
    minVal,
    maxVal,
    nominalVal,
    currentVal: nominalVal,
    volatility
  };
}

export const INITIAL_VIRTUAL_DEVICES: VirtualDeviceSpec[] = [
  // 1. SMART GRID
  {
    id: "grid-substation-01",
    name: "Main Substation Transformer T1",
    deviceType: "Substation Transformer",
    domain: "Smart Grid",
    location: "Substation Alpha - Sector 1",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      voltage: createSensor("Line Voltage", "kV", 110.0, 140.0, 132.0, 0.8),
      current: createSensor("Phase Current", "A", 200.0, 900.0, 450.0, 12.0),
      active_power: createSensor("Active Power", "MW", 30.0, 120.0, 85.0, 2.5),
      oil_temp: createSensor("Transformer Oil Temp", "°C", 35.0, 95.0, 58.0, 1.2),
      frequency: createSensor("Grid Frequency", "Hz", 49.0, 51.0, 50.0, 0.05)
    }
  },
  {
    id: "grid-inverter-02",
    name: "Commercial Solar Inverter Array",
    deviceType: "Solar Inverter",
    domain: "Smart Grid",
    location: "Solar Farm Zone B",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      power_output: createSensor("Active AC Output", "kW", 0.0, 500.0, 320.0, 15.0),
      efficiency: createSensor("Conversion Efficiency", "%", 85.0, 99.0, 97.5, 0.3),
      dc_voltage: createSensor("DC String Voltage", "V", 600.0, 1000.0, 820.0, 8.0),
      inverter_temp: createSensor("IGBT Heatsink Temp", "°C", 30.0, 85.0, 48.0, 1.0)
    }
  },
  {
    id: "grid-battery-03",
    name: "BESS Megawatt Battery Storage",
    deviceType: "Battery Storage",
    domain: "Smart Grid",
    location: "Grid Storage Hub 4",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      soc: createSensor("State of Charge", "%", 10.0, 100.0, 78.0, 0.2),
      charge_rate: createSensor("Discharge / Charge Rate", "kW", -250.0, 250.0, 45.0, 5.0),
      cell_temp: createSensor("Max Cell Temperature", "°C", 20.0, 55.0, 31.0, 0.5),
      health_soh: createSensor("State of Health", "%", 80.0, 100.0, 96.5, 0.01)
    }
  },
  {
    id: "grid-transformer-04",
    name: "Distribution Transformer D4",
    deviceType: "Distribution Transformer",
    domain: "Smart Grid",
    location: "North Industrial Park",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      load_pct: createSensor("Load Percentage", "%", 10.0, 110.0, 64.0, 2.0),
      winding_temp: createSensor("Winding Temp", "°C", 30.0, 105.0, 62.0, 1.1),
      power_factor: createSensor("Power Factor", "cosφ", 0.85, 1.0, 0.96, 0.01)
    }
  },
  {
    id: "grid-feeder-05",
    name: "High Voltage Feeder Line F-12",
    deviceType: "Grid Feeder",
    domain: "Smart Grid",
    location: "Substation Alpha Corridor",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      current_load: createSensor("Line Current", "A", 50.0, 600.0, 310.0, 8.0),
      reactive_power: createSensor("Reactive Power", "MVAr", 1.0, 25.0, 8.4, 0.4)
    }
  },

  // 2. HVAC & BUILDING AUTOMATION
  {
    id: "hvac-chiller-01",
    name: "Central Centrifugal Chiller CH-1",
    deviceType: "Water Chiller",
    domain: "HVAC",
    location: "Central Plant Basement",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      supply_temp: createSensor("Supply Water Temp", "°C", 4.0, 12.0, 6.5, 0.3),
      return_temp: createSensor("Return Water Temp", "°C", 8.0, 18.0, 12.0, 0.4),
      refrigerant_pressure: createSensor("Evaporator Pressure", "PSI", 40.0, 90.0, 65.0, 1.5),
      energy_consumption: createSensor("Power Usage", "kW", 100.0, 450.0, 280.0, 6.0)
    }
  },
  {
    id: "hvac-ahu-02",
    name: "Primary Air Handling Unit AHU-02",
    deviceType: "Air Handling Unit",
    domain: "HVAC",
    location: "Floor 4 Mechanical Room",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      duct_pressure: createSensor("Supply Air Static Pressure", "Pa", 100.0, 600.0, 350.0, 10.0),
      airflow_rate: createSensor("Airflow Volumetric Rate", "CFM", 2000.0, 12000.0, 8500.0, 150.0),
      filter_dp: createSensor("Filter Differential Pressure", "Pa", 20.0, 250.0, 85.0, 3.0),
      fan_speed: createSensor("Blower Fan Speed", "RPM", 300.0, 1800.0, 1420.0, 20.0)
    }
  },
  {
    id: "hvac-boiler-03",
    name: "High-Pressure Steam Boiler B-3",
    deviceType: "Industrial Boiler",
    domain: "HVAC",
    location: "Utility Boiler House",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      steam_pressure: createSensor("Steam Pressure", "Bar", 2.0, 15.0, 8.5, 0.2),
      flame_temp: createSensor("Combustion Chamber Temp", "°C", 600.0, 1200.0, 920.0, 12.0),
      efficiency: createSensor("Thermal Efficiency", "%", 75.0, 95.0, 88.5, 0.4)
    }
  },
  {
    id: "hvac-cooling-tower-04",
    name: "Evaporative Cooling Tower CT-4",
    deviceType: "Cooling Tower",
    domain: "HVAC",
    location: "Rooftop Deck B",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      basin_temp: createSensor("Water Basin Temp", "°C", 15.0, 38.0, 24.0, 0.5),
      fan_vibration: createSensor("Fan Shaft Vibration", "mm/s", 0.5, 12.0, 2.1, 0.2),
      water_level: createSensor("Basin Water Level", "%", 40.0, 100.0, 88.0, 1.0)
    }
  },
  {
    id: "hvac-vav-05",
    name: "Executive Zone VAV Controller",
    deviceType: "VAV Terminal",
    domain: "HVAC",
    location: "Floor 12 Executive Wing",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      room_temp: createSensor("Ambient Room Temp", "°C", 18.0, 30.0, 22.5, 0.2),
      co2_ppm: createSensor("CO2 Concentration", "PPM", 400.0, 1800.0, 650.0, 25.0),
      damper_pos: createSensor("Damper Opening", "%", 0.0, 100.0, 45.0, 2.0)
    }
  },

  // 3. SMART WATER & HYDRAULICS
  {
    id: "water-pump-01",
    name: "Main District Water Pump P-101",
    deviceType: "Centrifugal Lift Pump",
    domain: "Smart Water",
    location: "Pumping Station West",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      flow_rate: createSensor("Volumetric Flow", "GPM", 500.0, 3500.0, 2200.0, 45.0),
      discharge_pressure: createSensor("Discharge Pressure", "PSI", 40.0, 150.0, 95.0, 2.0),
      motor_vibration: createSensor("Bearing Vibration", "mm/s", 0.2, 10.0, 1.4, 0.1),
      motor_temp: createSensor("Winding Temp", "°C", 30.0, 90.0, 52.0, 0.8)
    }
  },
  {
    id: "water-valve-02",
    name: "District Pressure Reducing Valve PRV-22",
    deviceType: "Control Valve",
    domain: "Smart Water",
    location: "Pipeline Junction 7",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      inlet_pressure: createSensor("Upstream Pressure", "PSI", 80.0, 160.0, 120.0, 2.5),
      outlet_pressure: createSensor("Downstream Pressure", "PSI", 30.0, 70.0, 55.0, 1.2),
      valve_opening: createSensor("Valve Stem Opening", "%", 0.0, 100.0, 62.0, 1.0)
    }
  },
  {
    id: "water-quality-03",
    name: "Water Treatment Station Analyzer WQ-3",
    deviceType: "Water Quality Analyzer",
    domain: "Smart Water",
    location: "Treatment Facility Lab",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      turbidity: createSensor("Water Turbidity", "NTU", 0.1, 10.0, 0.8, 0.05),
      ph_level: createSensor("Water pH Level", "pH", 6.0, 9.0, 7.4, 0.05),
      free_chlorine: createSensor("Free Chlorine", "mg/L", 0.2, 3.0, 1.2, 0.04)
    }
  },
  {
    id: "water-tank-04",
    name: "Elevated Municipal Storage Reservoir",
    deviceType: "Storage Reservoir",
    domain: "Smart Water",
    location: "Highland Reservoir Peak",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      water_level: createSensor("Water Level Depth", "m", 1.0, 15.0, 11.8, 0.1),
      volume_m3: createSensor("Stored Volume", "m³", 1000.0, 25000.0, 18500.0, 100.0)
    }
  },
  {
    id: "water-digester-05",
    name: "Wastewater Anaerobic Digester D-5",
    deviceType: "Sludge Digester",
    domain: "Smart Water",
    location: "Wastewater Facility South",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      methane_pct: createSensor("Biogas Methane Conc", "%", 45.0, 75.0, 62.5, 0.8),
      sludge_temp: createSensor("Digester Temp", "°C", 30.0, 45.0, 37.0, 0.3)
    }
  },

  // 4. INDUSTRIAL AUTOMATION
  {
    id: "ind-robot-arm-01",
    name: "Heavy Assembly Robotic Arm RB-01",
    deviceType: "Industrial Robot",
    domain: "Industrial Automation",
    location: "Automotive Assembly Line 1",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      axis1_temp: createSensor("Servo Motor 1 Temp", "°C", 25.0, 85.0, 42.0, 1.0),
      payload_kg: createSensor("Current Payload Mass", "kg", 0.0, 150.0, 85.0, 2.0),
      cycle_count: createSensor("Completed Work Cycles", "cycles", 0.0, 100000.0, 14200.0, 0.0),
      vibration: createSensor("Joint 3 Vibration", "g", 0.05, 5.0, 0.45, 0.05)
    }
  },
  {
    id: "ind-conveyor-02",
    name: "High-Speed Logistics Conveyor C-2",
    deviceType: "Sorting Conveyor",
    domain: "Industrial Automation",
    location: "Fulfillment Logistics Hub",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      belt_speed: createSensor("Linear Belt Speed", "m/s", 0.0, 4.0, 2.4, 0.05),
      motor_current: createSensor("Drive Motor Current", "A", 2.0, 40.0, 18.5, 0.6),
      bearing_temp: createSensor("Drive Pulley Bearing Temp", "°C", 25.0, 90.0, 48.0, 1.1)
    }
  },
  {
    id: "ind-cnc-mill-03",
    name: "Precision 5-Axis CNC Milling Center",
    deviceType: "CNC Machining Center",
    domain: "Industrial Automation",
    location: "Precision Fabrication Cell",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      spindle_rpm: createSensor("Spindle Speed", "RPM", 0.0, 24000.0, 12500.0, 150.0),
      coolant_pressure: createSensor("Coolant Flow Pressure", "Bar", 1.0, 20.0, 12.0, 0.3),
      tool_wear_pct: createSensor("Cutter Tool Wear", "%", 0.0, 100.0, 34.0, 0.1)
    }
  },
  {
    id: "ind-compressor-04",
    name: "Rotary Screw Air Compressor AC-4",
    deviceType: "Air Compressor",
    domain: "Industrial Automation",
    location: "Plant Utility Bay",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      air_pressure: createSensor("Pneumatic Header Pressure", "Bar", 4.0, 12.0, 7.8, 0.15),
      oil_temp: createSensor("Compressor Oil Temp", "°C", 40.0, 110.0, 76.0, 1.2)
    }
  },
  {
    id: "ind-packer-05",
    name: "High-Speed Automated Cartoner PK-5",
    deviceType: "Packaging Machine",
    domain: "Industrial Automation",
    location: "Packaging Line 3",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      throughput_ppm: createSensor("Pack Rate", "units/min", 0.0, 300.0, 210.0, 8.0),
      sealer_temp: createSensor("Heat Sealing Jaw Temp", "°C", 120.0, 240.0, 185.0, 1.5)
    }
  },

  // 5. ENVIRONMENTAL MONITORING
  {
    id: "env-station-01",
    name: "Main Meteorological Weather Tower",
    deviceType: "Weather Station",
    domain: "Environmental Monitoring",
    location: "Rooftop Atmospheric Array",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      ambient_temp: createSensor("Ambient Air Temp", "°C", -10.0, 50.0, 26.5, 0.4),
      humidity: createSensor("Relative Humidity", "%", 10.0, 100.0, 58.0, 1.2),
      baro_pressure: createSensor("Barometric Pressure", "hPa", 950.0, 1050.0, 1013.2, 0.5),
      wind_speed: createSensor("Wind Speed Velocity", "m/s", 0.0, 45.0, 5.2, 0.8)
    }
  },
  {
    id: "env-aqi-02",
    name: "Urban Air Quality Monitoring Station",
    deviceType: "Air Quality Station",
    domain: "Environmental Monitoring",
    location: "Perimeter Wall South",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      pm2_5: createSensor("Particulate PM2.5", "µg/m³", 0.0, 300.0, 18.5, 2.0),
      pm10: createSensor("Particulate PM10", "µg/m³", 0.0, 500.0, 42.0, 3.5),
      no2_ppm: createSensor("Nitrogen Dioxide", "PPM", 0.0, 2.0, 0.08, 0.01),
      co2_ppm: createSensor("Ambient CO2 Level", "PPM", 350.0, 1500.0, 420.0, 15.0)
    }
  },
  {
    id: "env-gas-detector-03",
    name: "Hazardous Industrial Gas Sensor GS-3",
    deviceType: "Gas Sniffer",
    domain: "Environmental Monitoring",
    location: "Chemical Storage Vault",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      ch4_pct: createSensor("Methane LEL", "%", 0.0, 100.0, 0.2, 0.05),
      h2s_ppm: createSensor("Hydrogen Sulfide", "PPM", 0.0, 50.0, 0.1, 0.02),
      o2_pct: createSensor("Oxygen Concentration", "%", 15.0, 25.0, 20.9, 0.1)
    }
  },
  {
    id: "env-noise-04",
    name: "Facility Boundary Noise Level Monitor",
    deviceType: "Sound Meter",
    domain: "Environmental Monitoring",
    location: "Facility Fence North",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      sound_db: createSensor("Equivalent Sound Level", "dBA", 30.0, 120.0, 58.4, 2.5),
      peak_db: createSensor("Peak Impulse Level", "dBC", 40.0, 140.0, 72.1, 4.0)
    }
  },
  {
    id: "env-soil-05",
    name: "Subsurface Soil & Hydrology Sensor",
    deviceType: "Agri-Soil Probe",
    domain: "Environmental Monitoring",
    location: "Greenbelt Buffer Zone",
    status: "ONLINE",
    isPoweredOn: true,
    lastSeen: Date.now() / 1000,
    reconnectCount: 0,
    sensors: {
      soil_moisture: createSensor("Soil Volumetric Water Content", "%", 5.0, 60.0, 28.0, 0.8),
      soil_temp: createSensor("Deep Soil Temp", "°C", 5.0, 35.0, 18.2, 0.3),
      salinity_ec: createSensor("Electrical Conductivity", "dS/m", 0.1, 10.0, 1.4, 0.05)
    }
  }
];

class BrowserDigitalTwinSimulator {
  private devices: VirtualDeviceSpec[] = JSON.parse(JSON.stringify(INITIAL_VIRTUAL_DEVICES));
  private isRunning: boolean = false;
  private intervalId: any = null;
  private stepCount: number = 0;

  private telemetryListeners: Set<SimulatorTelemetryCallback> = new Set();
  private deviceListeners: Set<SimulatorDeviceCallback> = new Set();
  private alertListeners: Set<SimulatorAlertCallback> = new Set();

  public getDevices(): Device[] {
    return this.devices.map(d => ({
      id: d.id,
      name: d.name,
      device_type: d.deviceType,
      domain: d.domain,
      location: d.location,
      status: d.status,
      is_powered_on: d.isPoweredOn,
      last_seen: d.lastSeen,
      uptime: this.stepCount * 2.5,
      reconnect_count: d.reconnectCount,
      created_at: Date.now() / 1000 - 86400,
      updated_at: d.lastSeen
    }));
  }

  public onTelemetry(cb: SimulatorTelemetryCallback): () => void {
    this.telemetryListeners.add(cb);
    return () => this.telemetryListeners.delete(cb);
  }

  public onDeviceUpdate(cb: SimulatorDeviceCallback): () => void {
    this.deviceListeners.add(cb);
    return () => this.deviceListeners.delete(cb);
  }

  public onAlert(cb: SimulatorAlertCallback): () => void {
    this.alertListeners.add(cb);
    return () => this.alertListeners.delete(cb);
  }

  public start(intervalMs: number = 2500): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalId = setInterval(() => this.tick(), intervalMs);
    // Initial immediate tick
    this.tick();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public isSimulating(): boolean {
    return this.isRunning;
  }

  public injectAnomaly(deviceId: string, anomalyType: 'OVERHEAT' | 'PRESSURE_DROP' | 'GAS_LEAK' | 'VIBRATION_SPIKE'): void {
    const dev = this.devices.find(d => d.id === deviceId);
    if (!dev) return;

    dev.anomalyActive = anomalyType;
    if (anomalyType === 'OVERHEAT' && dev.sensors.oil_temp) {
      dev.sensors.oil_temp.currentVal = 92.4;
    } else if (anomalyType === 'PRESSURE_DROP' && dev.sensors.refrigerant_pressure) {
      dev.sensors.refrigerant_pressure.currentVal = 38.2;
    } else if (anomalyType === 'GAS_LEAK' && dev.sensors.ch4_pct) {
      dev.sensors.ch4_pct.currentVal = 14.8;
    } else if (anomalyType === 'VIBRATION_SPIKE' && dev.sensors.motor_vibration) {
      dev.sensors.motor_vibration.currentVal = 7.9;
    }

    dev.status = 'DEGRADED';
    this.emitDeviceUpdate(dev);
  }

  public clearAnomaly(deviceId: string): void {
    const dev = this.devices.find(d => d.id === deviceId);
    if (!dev) return;
    dev.anomalyActive = null;
    Object.values(dev.sensors).forEach(s => {
      s.currentVal = s.nominalVal;
    });
    dev.status = 'ONLINE';
    this.emitDeviceUpdate(dev);
  }

  public setPower(deviceId: string, powered: boolean): void {
    const dev = this.devices.find(d => d.id === deviceId);
    if (!dev) return;
    dev.isPoweredOn = powered;
    dev.status = powered ? 'ONLINE' : 'OFFLINE';
    this.emitDeviceUpdate(dev);
  }

  private tick(): void {
    this.stepCount += 1;
    const now = Date.now() / 1000;

    // Pick 3 to 6 active devices per tick to simulate asynchronous distributed nodes
    const sampleSize = 5;
    const shuffled = [...this.devices].sort(() => 0.5 - Math.random());
    const batch = shuffled.slice(0, sampleSize);

    batch.forEach(dev => {
      if (!dev.isPoweredOn) return;

      dev.lastSeen = now;
      const telemetryBatch: Array<{ metric_name: string; value: number; unit: string; timestamp: number }> = [];

      Object.entries(dev.sensors).forEach(([key, sensor]) => {
        // Gaussian noise walk
        const u1 = Math.random() || 0.001;
        const u2 = Math.random() || 0.001;
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        
        let drift = z * (sensor.volatility * 0.4);
        
        // Gentle pull towards nominal value
        const pull = (sensor.nominalVal - sensor.currentVal) * 0.05;
        
        if (!dev.anomalyActive) {
          sensor.currentVal = Math.max(sensor.minVal, Math.min(sensor.maxVal, sensor.currentVal + drift + pull));
        }

        const reading = {
          metric_name: key,
          value: parseFloat(sensor.currentVal.toFixed(2)),
          unit: sensor.unit,
          timestamp: now
        };

        telemetryBatch.push(reading);

        const rec: TelemetryRecord = {
          id: Math.floor(Math.random() * 10000000),
          device_id: dev.id,
          metric_name: reading.metric_name,
          value: reading.value,
          unit: reading.unit,
          timestamp: reading.timestamp
        };

        // 1. Emit to local UI subscribers directly
        this.telemetryListeners.forEach(fn => {
          try { fn(rec); } catch (e) { console.error(e); }
        });

        // 2. Evaluate automation safety rules
        this.checkSafetyRule(dev, rec);
      });

      // Emit device state update
      this.emitDeviceUpdate(dev);

      // 3. Publish to MQTT broker if connected
      if (mqttService.isConnected()) {
        mqttService.publishTelemetry(dev.id, telemetryBatch);
      }
    });
  }

  private checkSafetyRule(dev: VirtualDeviceSpec, rec: TelemetryRecord) {
    let triggeredAlert: Alert | null = null;

    if (dev.id === "grid-substation-01" && rec.metric_name === "oil_temp" && rec.value > 85.0) {
      triggeredAlert = {
        id: Date.now() + 1,
        device_id: dev.id,
        severity: "CRITICAL",
        title: "Substation Transformer Overheating Alert",
        description: `Oil Temperature exceeded critical safety threshold: ${rec.value} °C (Max: 85.0 °C)`,
        acknowledged: false,
        resolved: false,
        created_at: Date.now() / 1000
      };
    } else if (dev.id === "hvac-chiller-01" && rec.metric_name === "refrigerant_pressure" && rec.value < 45.0) {
      triggeredAlert = {
        id: Date.now() + 2,
        device_id: dev.id,
        severity: "WARNING",
        title: "Chiller Evaporator Low Refrigerant Pressure",
        description: `Evaporator Pressure dropped below operating threshold: ${rec.value} PSI (Min: 45.0 PSI)`,
        acknowledged: false,
        resolved: false,
        created_at: Date.now() / 1000
      };
    } else if (dev.id === "hvac-vav-05" && rec.metric_name === "co2_ppm" && rec.value > 1000.0) {
      triggeredAlert = {
        id: Date.now() + 3,
        device_id: dev.id,
        severity: "WARNING",
        title: "Executive Zone High Indoor CO2 Alert",
        description: `CO2 concentration elevated: ${rec.value} PPM. Automated ventilation sequence initiated.`,
        acknowledged: false,
        resolved: false,
        created_at: Date.now() / 1000
      };
    } else if (dev.id === "water-pump-01" && rec.metric_name === "motor_vibration" && rec.value > 5.0) {
      triggeredAlert = {
        id: Date.now() + 4,
        device_id: dev.id,
        severity: "WARNING",
        title: "District Lift Pump Excessive Bearing Vibration",
        description: `Bearing vibration reached ${rec.value} mm/s (Threshold: 5.0 mm/s). Predictive maintenance scheduled.`,
        acknowledged: false,
        resolved: false,
        created_at: Date.now() / 1000
      };
    } else if (dev.id === "env-gas-detector-03" && rec.metric_name === "ch4_pct" && rec.value > 5.0) {
      triggeredAlert = {
        id: Date.now() + 5,
        device_id: dev.id,
        severity: "CRITICAL",
        title: "Hazardous Atmospheric Methane Gas Warning",
        description: `Methane concentration exceeded explosive limit: ${rec.value} % LEL. Emergency shutoff armed.`,
        acknowledged: false,
        resolved: false,
        created_at: Date.now() / 1000
      };
    }

    if (triggeredAlert) {
      this.alertListeners.forEach(fn => {
        try { fn(triggeredAlert!); } catch (e) { console.error(e); }
      });
      if (mqttService.isConnected()) {
        mqttService.publishAlert(triggeredAlert);
      }
    }
  }

  private emitDeviceUpdate(dev: VirtualDeviceSpec) {
    const d: Device = {
      id: dev.id,
      name: dev.name,
      device_type: dev.deviceType,
      domain: dev.domain,
      location: dev.location,
      status: dev.status,
      is_powered_on: dev.isPoweredOn,
      last_seen: dev.lastSeen,
      uptime: this.stepCount * 2.5,
      reconnect_count: dev.reconnectCount,
      created_at: Date.now() / 1000 - 86400,
      updated_at: dev.lastSeen
    };
    this.deviceListeners.forEach(fn => {
      try { fn(d); } catch (e) { console.error(e); }
    });
  }
}

export const simulatorEngine = new BrowserDigitalTwinSimulator();
