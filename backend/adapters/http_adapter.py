import logging
from typing import Dict, Any, List
from backend.adapters.base_adapter import BaseDeviceAdapter

logger = logging.getLogger("PXT-HTTPAdapter")

class HTTPRESTAdapter(BaseDeviceAdapter):
    """
    HTTP/REST Adapter handling direct telemetry pushes from physical IoT hardware microcontrollers
    (e.g., ESP32, Raspberry Pi, Industrial Edge Gateways).
    """
    def __init__(self):
        super().__init__("HTTP/REST Adapter", "HTTP_REST")

    async def initialize(self):
        self.is_connected = True
        logger.info("HTTP/REST Hardware Ingestion Adapter Initialized.")

    async def shutdown(self):
        self.is_connected = False

    def parse_http_payload(self, device_id: str, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        metrics = []
        is_hardware = payload.get("is_physical_hardware", True)
        raw_metrics = payload.get("metrics", {})

        for name, data in raw_metrics.items():
            if isinstance(data, dict):
                val = float(data.get("value", 0.0))
                unit = str(data.get("unit", ""))
            else:
                val = float(data)
                unit = "raw"
            metrics.append(self.format_telemetry(device_id, name, val, unit, is_hardware=is_hardware))

        return metrics

    async def send_command(self, device_id: str, action: str, parameters: Dict[str, Any]) -> bool:
        logger.info(f"HTTP/REST Adapter queuing outbound webhook command to device {device_id}: {action}")
        return True
