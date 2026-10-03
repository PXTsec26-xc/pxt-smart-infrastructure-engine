import asyncio
import struct
import logging
from typing import Dict, Any, List
from backend.adapters.base_adapter import BaseDeviceAdapter

logger = logging.getLogger("PXT-ModbusAdapter")

class ModbusTCPAdapter(BaseDeviceAdapter):
    """
    Modbus TCP Frame Decoder & Industrial Hardware Adapter.
    Translates Modbus Holding Registers (Function Code 03) and Input Registers (FC 04)
    into PXT standardized telemetry metrics.
    """
    def __init__(self, host: str = "127.0.0.1", port: int = 502):
        super().__init__("Modbus TCP Adapter", "MODBUS_TCP")
        self.host = host
        self.port = port

    async def initialize(self):
        logger.info(f"Modbus TCP Adapter initialized for host {self.host}:{self.port}")
        self.is_connected = True

    async def shutdown(self):
        logger.info("Modbus TCP Adapter shut down.")
        self.is_connected = False

    def decode_holding_registers(self, device_id: str, register_start: int, registers: List[int]) -> List[Dict[str, Any]]:
        metrics = []
        # Example Modbus register map decoding
        # Register 40001 (offset 0): Voltage (div 10)
        # Register 40002 (offset 1): Current (div 10)
        # Register 40003-40004 (offset 2-3): IEEE 754 Float Power Output
        if len(registers) >= 2:
            voltage = registers[0] / 10.0
            current = registers[1] / 10.0
            metrics.append(self.format_telemetry(device_id, "modbus_voltage", voltage, "V", is_hardware=True))
            metrics.append(self.format_telemetry(device_id, "modbus_current", current, "A", is_hardware=True))
            
        if len(registers) >= 4:
            raw_bytes = struct.pack(">HH", registers[2], registers[3])
            power_kw = struct.unpack(">f", raw_bytes)[0]
            metrics.append(self.format_telemetry(device_id, "modbus_power_kw", round(power_kw, 2), "kW", is_hardware=True))

        return metrics

    async def send_command(self, device_id: str, action: str, parameters: Dict[str, Any]) -> bool:
        logger.info(f"Modbus TCP Adapter executing Write Single Coil / Register for device {device_id}: {action} -> {parameters}")
        return True
