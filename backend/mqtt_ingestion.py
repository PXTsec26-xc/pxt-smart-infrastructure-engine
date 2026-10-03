import asyncio
import json
import logging
import time
from typing import Dict, Any, Optional

import paho.mqtt.client as mqtt
from sqlalchemy import select
from backend.database import AsyncSessionLocal
from backend.models import DeviceORM, TelemetryORM, EventORM, CommandORM, AlertORM
from backend.automation_engine import process_telemetry_rules
from backend.websocket_manager import ws_manager

logger = logging.getLogger("PXT-MQTT-Ingestion")

class MQTTIngestionService:
    def __init__(self, broker_host: str = "127.0.0.1", broker_port: int = 1883):
        self.broker_host = broker_host
        self.broker_port = broker_port
        
        try:
            self.client = mqtt.Client(
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
                client_id="pxt_backend_ingestion"
            )
        except Exception:
            self.client = mqtt.Client(client_id="pxt_backend_ingestion")

        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self._loop = None

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        logger.info(f"MQTT Ingestion Engine connected to broker (rc={rc}). Subscribing to pxt/# ...")
        self.client.subscribe("pxt/#", qos=1)

    def _on_message(self, client, userdata, msg):
        topic = msg.topic
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            if self._loop and self._loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    self._handle_payload(topic, payload), self._loop
                )
        except Exception as e:
            logger.error(f"Error handling message on {topic}: {e}")

    async def _handle_payload(self, topic: str, payload: Dict[str, Any]):
        now = time.time()
        device_id = payload.get("device_id")

        if not device_id:
            return

        async with AsyncSessionLocal() as session:
            # Fetch or register device
            stmt = select(DeviceORM).where(DeviceORM.id == device_id)
            res = await session.execute(stmt)
            device = res.scalar_one_or_none()

            was_offline = (device.status == "OFFLINE") if device else False

            # --- 1. TELEMETRY TOPIC ---
            if "pxt/telemetry/" in topic:
                metrics = payload.get("metrics", {})
                status = payload.get("status", "ONLINE")

                if not device:
                    device = DeviceORM(
                        id=device_id,
                        name=f"Device {device_id}",
                        device_type=payload.get("device_type", "Generic IoT Sensor"),
                        domain=payload.get("domain", "General"),
                        location=payload.get("location", "Facility"),
                        status=status,
                        last_seen=now,
                        updated_at=now
                    )
                    session.add(device)
                else:
                    device.last_seen = now
                    device.updated_at = now
                    if was_offline and status != "OFFLINE":
                        device.status = "ONLINE"
                        # Create RECOVERY event
                        rec_event = EventORM(
                            device_id=device_id,
                            event_type="DEVICE_RECOVERED",
                            message=f"Device {device_id} restored communication and recovered to ONLINE",
                            timestamp=now
                        )
                        session.add(rec_event)

                # Insert Telemetry records
                for metric_name, mdata in metrics.items():
                    val = float(mdata.get("value", 0.0))
                    unit = str(mdata.get("unit", ""))
                    telem = TelemetryORM(
                        device_id=device_id,
                        metric_name=metric_name,
                        value=val,
                        unit=unit,
                        timestamp=payload.get("timestamp", now)
                    )
                    session.add(telem)

                    # Evaluate dynamic automation rules in backend
                    await process_telemetry_rules(
                        session=session,
                        device_id=device_id,
                        metric_name=metric_name,
                        value=val,
                        unit=unit,
                        mqtt_client=self.client
                    )

                await session.commit()

                # Broadcast live telemetry over WebSocket
                await ws_manager.broadcast("TELEMETRY_UPDATED", payload)

                if was_offline:
                    await ws_manager.broadcast("DEVICE_STATE_CHANGE", {
                        "device_id": device_id,
                        "status": "ONLINE",
                        "timestamp": now
                    })

            # --- 2. HEARTBEAT TOPIC ---
            elif "pxt/heartbeat/" in topic:
                if device:
                    device.last_seen = now
                    device.uptime = payload.get("uptime", device.uptime)
                    if was_offline:
                        device.status = "ONLINE"
                        event = EventORM(
                            device_id=device_id,
                            event_type="HEARTBEAT_RESTORED",
                            message=f"Device {device_id} heartbeat restored",
                            timestamp=now
                        )
                        session.add(event)

                        # Auto-resolve connection lost alert
                        alert_stmt = select(AlertORM).where(
                            AlertORM.device_id == device_id,
                            AlertORM.resolved == False,
                            AlertORM.severity == "CRITICAL"
                        )
                        res = await session.execute(alert_stmt)
                        active_alerts = res.scalars().all()
                        for alt in active_alerts:
                            alt.resolved = True
                            alt.resolved_at = now

                    await session.commit()

            # --- 3. STATUS TOPIC ---
            elif "pxt/status/" in topic:
                status_str = payload.get("status", "ONLINE")
                if not device:
                    device = DeviceORM(
                        id=device_id,
                        name=payload.get("name", f"Device {device_id}"),
                        device_type=payload.get("device_type", "IoT Node"),
                        domain=payload.get("domain", "General"),
                        location=payload.get("location", "Facility"),
                        status=status_str,
                        last_seen=now,
                        reconnect_count=payload.get("reconnect_count", 0),
                        created_at=now,
                        updated_at=now
                    )
                    session.add(device)
                else:
                    if device.status != status_str:
                        ev_type = "DEVICE_RECOVERED" if (device.status == "OFFLINE" and status_str == "ONLINE") else "STATUS_CHANGE"
                        ev = EventORM(
                            device_id=device_id,
                            event_type=ev_type,
                            message=f"Status changed from {device.status} to {status_str}",
                            timestamp=now
                        )
                        session.add(ev)
                    device.status = status_str
                    device.last_seen = now
                    device.updated_at = now

                await session.commit()
                await ws_manager.broadcast("DEVICE_STATE_CHANGE", payload)

            # --- 4. ACKNOWLEDGEMENT TOPIC ---
            elif "pxt/ack/" in topic:
                cmd_id = payload.get("command_id")
                ack_status = payload.get("status", "ACKNOWLEDGED")
                msg_txt = payload.get("message", "")

                cmd_stmt = select(CommandORM).where(CommandORM.id == cmd_id)
                res = await session.execute(cmd_stmt)
                cmd_obj = res.scalar_one_or_none()

                if cmd_obj:
                    cmd_obj.status = ack_status
                    cmd_obj.message = msg_txt
                    cmd_obj.acknowledged_at = now
                    await session.commit()

                    logger.info(f"Updated Command #{cmd_id} status to {ack_status}")
                    await ws_manager.broadcast("COMMAND_ACKNOWLEDGED", payload)

    def start(self):
        self._loop = asyncio.get_running_loop()
        logger.info(f"Connecting MQTT Ingestion Service to {self.broker_host}:{self.broker_port}...")
        self.client.connect_async(self.broker_host, self.broker_port, keepalive=60)
        self.client.loop_start()

    def stop(self):
        self.client.loop_stop()
        self.client.disconnect()
        logger.info("MQTT Ingestion Service stopped.")
