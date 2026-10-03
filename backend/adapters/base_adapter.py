from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import time

class BaseDeviceAdapter(ABC):
    def __init__(self, adapter_name: str, protocol: str):
        self.adapter_name = adapter_name
        self.protocol = protocol
        self.is_connected = False

    @abstractmethod
    async def initialize(self):
        pass

    @abstractmethod
    async def shutdown(self):
        pass

    @abstractmethod
    async def send_command(self, device_id: str, action: str, parameters: Dict[str, Any]) -> bool:
        pass

    def format_telemetry(self, device_id: str, metric_name: str, value: float, unit: str, is_hardware: bool = False) -> Dict[str, Any]:
        return {
            "device_id": device_id,
            "metric_name": metric_name,
            "value": float(value),
            "unit": unit,
            "timestamp": time.time(),
            "protocol": self.protocol,
            "hardware_type": "PHYSICAL_HARDWARE" if is_hardware else "VIRTUAL_SIMULATOR"
        }
