import asyncio
import json
import logging
import time
import random
import sys
import os
from typing import Dict, Any, Optional

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import paho.mqtt.client as mqtt
from simulator.models import DeviceStatus, SensorModel

logger = logging.getLogger("PXT-Device")

class VirtualDevice:
    def __init__(
        self,
        device_id: str,
        name: str,
        device_type: str,
        domain: str,
        location: str,
        sensors: Dict[str, SensorModel],
        broker_host: str = "127.0.0.1",
        broker_port: int = 1883,
        telemetry_interval: float = 3.0,
        heartbeat_interval: float = 2.0
    ):
        self.device_id = device_id
        self.name = name
        self.device_type = device_type
        self.domain = domain
        self.location = location
        self.sensors = sensors
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.telemetry_interval = telemetry_interval
        self.heartbeat_interval = heartbeat_interval
        
        self.status = DeviceStatus.STARTING
        self.is_powered_on = True
        self.paused = False
        self.reconnect_count = 0
        self.uptime_start = time.time()
        self.forced_failure = False

        # MQTT Client initialization with callback API v2 support
        try:
            self.client = mqtt.Client(
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
                client_id=f"sim_{self.device_id}"
            )
        except Exception:
            self.client = mqtt.Client(client_id=f"sim_{self.device_id}")

        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message
        
        self._running = False
        self._loop_task: Optional[asyncio.Task] = None

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        logger.info(f"[{self.device_id}] Connected to MQTT Broker with code {rc}")
        if self.forced_failure:
            return
        self.status = DeviceStatus.ONLINE
        # Subscribe to command channel
        cmd_topic = f"pxt/commands/{self.device_id}"
        self.client.subscribe(cmd_topic, qos=1)
        # Publish initial retained status
        self._publish_status()

    def _on_disconnect(self, client, userdata, flags, rc, properties=None):
        logger.warning(f"[{self.device_id}] Disconnected from MQTT Broker (rc={rc})")
        if self.status != DeviceStatus.OFFLINE:
            self.reconnect_count += 1

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            logger.info(f"[{self.device_id}] Received command on {msg.topic}: {payload}")
            self._handle_command(payload)
        except Exception as e:
            logger.error(f"[{self.device_id}] Error handling incoming message: {e}")

    def _handle_command(self, payload: Dict[str, Any]):
        cmd_id = payload.get("command_id", f"cmd_{int(time.time()*1000)}")
        action = payload.get("action", "")
        params = payload.get("parameters", {})

        ack_status = "ACKNOWLEDGED"
        ack_msg = "Command executed successfully"

        if action == "set_power":
            power_state = str(params.get("state", "ON")).upper()
            if power_state == "OFF":
                self.is_powered_on = False
                self.status = DeviceStatus.OFFLINE
                ack_msg = "Device powered OFF"
            else:
                self.is_powered_on = True
                self.status = DeviceStatus.ONLINE
                ack_msg = "Device powered ON"
            self._publish_status()

        elif action == "set_parameter":
            sensor_key = params.get("sensor")
            val = params.get("value")
            if sensor_key in self.sensors:
                try:
                    val_float = float(val) if val is not None else None
                    self.sensors[sensor_key].set_override(val_float)
                    ack_msg = f"Sensor {sensor_key} override set to {val_float}"
                except ValueError:
                    ack_status = "FAILED"
                    ack_msg = f"Invalid sensor value: {val}"
            else:
                ack_status = "FAILED"
                ack_msg = f"Unknown sensor key: {sensor_key}"

        elif action == "trigger_anomaly":
            sensor_key = params.get("sensor")
            val = params.get("value", 999.0)
            if sensor_key in self.sensors:
                self.sensors[sensor_key].set_override(float(val))
                self.status = DeviceStatus.DEGRADED
                ack_msg = f"Anomaly injected into {sensor_key}: {val}"
                self._publish_status()
            else:
                ack_status = "FAILED"
                ack_msg = f"Unknown sensor key: {sensor_key}"

        elif action == "clear_anomaly":
            for sensor in self.sensors.values():
                sensor.set_override(None)
            self.status = DeviceStatus.ONLINE
            ack_msg = "All sensor anomalies cleared"
            self._publish_status()

        elif action == "simulate_failure":
            self.forced_failure = True
            self.status = DeviceStatus.MALFUNCTIONING
            ack_msg = "Simulated device failure engaged"
            self._publish_status()

        elif action == "simulate_recovery":
            self.forced_failure = False
            for sensor in self.sensors.values():
                sensor.set_override(None)
            self.is_powered_on = True
            self.status = DeviceStatus.ONLINE
            ack_msg = "Simulated device recovered to ONLINE"
            self._publish_status()

        elif action == "restart":
            self.status = DeviceStatus.STARTING
            self.is_powered_on = True
            self.forced_failure = False
            for sensor in self.sensors.values():
                sensor.set_override(None)
            self._publish_status()
            time.sleep(0.5)
            self.status = DeviceStatus.ONLINE
            ack_msg = "Device restarted successfully"
            self._publish_status()

        else:
            ack_status = "FAILED"
            ack_msg = f"Unsupported command action: {action}"

        ack_payload = {
            "command_id": cmd_id,
            "device_id": self.device_id,
            "action": action,
            "status": ack_status,
            "message": ack_msg,
            "device_status": self.status.value,
            "timestamp": time.time()
        }
        ack_topic = f"pxt/ack/{self.device_id}"
        self.client.publish(ack_topic, json.dumps(ack_payload), qos=1)
        logger.info(f"[{self.device_id}] Published ACK: {ack_payload}")

    def _publish_status(self):
        status_topic = f"pxt/status/{self.device_id}"
        payload = {
            "device_id": self.device_id,
            "name": self.name,
            "device_type": self.device_type,
            "domain": self.domain,
            "location": self.location,
            "status": self.status.value,
            "is_powered_on": self.is_powered_on,
            "uptime": round(time.time() - self.uptime_start, 1),
            "reconnect_count": self.reconnect_count,
            "timestamp": time.time()
        }
        self.client.publish(status_topic, json.dumps(payload), qos=1, retain=True)

    def _publish_heartbeat(self):
        if self.forced_failure or not self.is_powered_on:
            return
        hb_topic = f"pxt/heartbeat/{self.device_id}"
        payload = {
            "device_id": self.device_id,
            "status": self.status.value,
            "timestamp": time.time(),
            "uptime": round(time.time() - self.uptime_start, 1)
        }
        self.client.publish(hb_topic, json.dumps(payload), qos=0)

    def _publish_telemetry(self):
        if self.forced_failure or not self.is_powered_on:
            return
        telem_topic = f"pxt/telemetry/{self.device_id}"
        readings = {}
        for key, sensor in self.sensors.items():
            readings[key] = {
                "name": sensor.name,
                "value": sensor.read_value(self.is_powered_on),
                "unit": sensor.unit
            }
        
        payload = {
            "device_id": self.device_id,
            "device_type": self.device_type,
            "domain": self.domain,
            "location": self.location,
            "status": self.status.value,
            "metrics": readings,
            "timestamp": time.time()
        }
        self.client.publish(telem_topic, json.dumps(payload), qos=0)

    async def start(self):
        self._running = True
        logger.info(f"[{self.device_id}] Connecting to MQTT broker at {self.broker_host}:{self.broker_port}...")
        try:
            self.client.connect_async(self.broker_host, self.broker_port, keepalive=60)
            self.client.loop_start()
        except Exception as e:
            logger.error(f"[{self.device_id}] Connect failed: {e}")

        last_telem = 0.0
        last_hb = 0.0

        while self._running:
            now = time.time()
            if not self.paused:
                if now - last_hb >= self.heartbeat_interval:
                    self._publish_heartbeat()
                    last_hb = now

                if now - last_telem >= self.telemetry_interval:
                    self._publish_telemetry()
                    last_telem = now

            await asyncio.sleep(0.5)

    def stop(self):
        self._running = False
        self.status = DeviceStatus.OFFLINE
        self._publish_status()
        self.client.loop_stop()
        self.client.disconnect()
        logger.info(f"[{self.device_id}] Virtual Device stopped.")
