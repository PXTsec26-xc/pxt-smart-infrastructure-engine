import asyncio
import logging
import sys
import os

from amqtt.broker import Broker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("PXT-MQTT-Broker")

MQTT_BIND_HOST = os.getenv("MQTT_BIND_HOST", os.getenv("MQTT_HOST", "0.0.0.0"))
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_WS_PORT = int(os.getenv("MQTT_WS_PORT", "9001"))

BROKER_CONFIG = {
    "listeners": {
        "default": {
            "type": "tcp",
            "bind": f"{MQTT_BIND_HOST}:{MQTT_PORT}",
            "max_connections": 1000,
        },
        "ws": {
            "type": "ws",
            "bind": f"{MQTT_BIND_HOST}:{MQTT_WS_PORT}",
            "max_connections": 1000,
        }
    },
    "sys_interval": 10,
    "auth": {
        "allow-anonymous": True,
        "plugins": ["auth_anonymous"]
    },
    "topic-check": {
        "enabled": False
    }
}

async def start_broker():
    logger.info(f"Initializing PXT Smart Infrastructure MQTT Broker on {MQTT_BIND_HOST}:{MQTT_PORT} (TCP) & {MQTT_WS_PORT} (WS)...")
    broker = Broker(BROKER_CONFIG)
    await broker.start()
    logger.info(f"MQTT Broker is FULLY OPERATIONAL on {MQTT_BIND_HOST}:{MQTT_PORT} and accepting connections.")
    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("Stopping MQTT Broker...")
        await broker.shutdown()
        logger.info("MQTT Broker stopped successfully.")

if __name__ == "__main__":
    try:
        asyncio.run(start_broker())
    except KeyboardInterrupt:
        logger.info("Broker process interrupted by user.")
