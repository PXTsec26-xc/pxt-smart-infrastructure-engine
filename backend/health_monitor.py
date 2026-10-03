import asyncio
import logging
import time
from sqlalchemy import select
from backend.database import AsyncSessionLocal
from backend.models import DeviceORM, AlertORM, EventORM
from backend.websocket_manager import ws_manager

logger = logging.getLogger("PXT-HealthMonitor")

HEARTBEAT_TIMEOUT_SECONDS = 10.0 # Device marked OFFLINE if no message in 10s

async def start_health_monitor_loop():
    logger.info("Starting PXT Heartbeat & Health Monitoring Loop (2-second interval)...")
    while True:
        try:
            await asyncio.sleep(2.0)
            now = time.time()
            async with AsyncSessionLocal() as session:
                stmt = select(DeviceORM)
                result = await session.execute(stmt)
                devices = result.scalars().all()

                for dev in devices:
                    # Check for missed heartbeat timeout
                    if dev.status != "OFFLINE" and dev.is_powered_on:
                        if dev.last_seen > 0 and (now - dev.last_seen > HEARTBEAT_TIMEOUT_SECONDS):
                            logger.warning(f"Device '{dev.id}' missed heartbeat timeout ({round(now - dev.last_seen, 1)}s > {HEARTBEAT_TIMEOUT_SECONDS}s). Marking OFFLINE!")
                            dev.status = "OFFLINE"
                            dev.updated_at = now
                            
                            # Create system event
                            event = EventORM(
                                device_id=dev.id,
                                event_type="HEARTBEAT_TIMEOUT",
                                message=f"Device {dev.name} missed heartbeat (unresponsive for {round(now - dev.last_seen, 1)}s)",
                                timestamp=now
                            )
                            session.add(event)

                            # Create CRITICAL alert
                            alert = AlertORM(
                                device_id=dev.id,
                                severity="CRITICAL",
                                title=f"Device Connection Lost: {dev.name}",
                                description=f"Device {dev.id} ({dev.name}) stopped transmitting heartbeats. Status changed to OFFLINE.",
                                acknowledged=False,
                                created_at=now
                            )
                            session.add(alert)
                            await session.commit()

                            # Broadcast WS state update & alert
                            await ws_manager.broadcast("DEVICE_STATE_CHANGE", {
                                "device_id": dev.id,
                                "status": "OFFLINE",
                                "name": dev.name,
                                "timestamp": now
                            })
                            await ws_manager.broadcast("ALERT_CREATED", {
                                "id": alert.id,
                                "device_id": dev.id,
                                "severity": "CRITICAL",
                                "title": alert.title,
                                "description": alert.description,
                                "created_at": now
                            })

        except asyncio.CancelledError:
            logger.info("Health monitor loop cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in health monitor loop: {e}", exc_info=True)
