from enum import Enum
import random
import time
from typing import Dict, Any, List, Optional

class DeviceStatus(str, Enum):
    OFFLINE = "OFFLINE"
    STARTING = "STARTING"
    ONLINE = "ONLINE"
    DEGRADED = "DEGRADED"
    MALFUNCTIONING = "MALFUNCTIONING"
    MAINTENANCE = "MAINTENANCE"

class SensorModel:
    def __init__(
        self,
        name: str,
        unit: str,
        min_val: float,
        max_val: float,
        nominal_val: float,
        noise_std: float,
        drift_rate: float = 0.0,
        precision: int = 2
    ):
        self.name = name
        self.unit = unit
        self.min_val = min_val
        self.max_val = max_val
        self.nominal_val = nominal_val
        self.noise_std = noise_std
        self.drift_rate = drift_rate
        self.precision = precision
        self.current_val = nominal_val
        self.forced_override: Optional[float] = None

    def read_value(self, is_powered_on: bool = True) -> float:
        if not is_powered_on:
            return 0.0
        if self.forced_override is not None:
            return round(self.forced_override, self.precision)
        
        # Apply slight random walk drift & Gaussian noise
        drift = random.gauss(0, self.noise_std * 0.1)
        self.current_val = self.nominal_val + (self.current_val - self.nominal_val) * 0.95 + drift
        
        # Add random sensor noise
        noise = random.gauss(0, self.noise_std)
        val = self.current_val + noise
        
        # Clamp within min and max physical bounds
        val = max(self.min_val, min(self.max_val, val))
        return round(val, self.precision)

    def set_override(self, val: Optional[float]):
        self.forced_override = val
