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

MQTT_HOST = os.getenv("MQTT_HOST", "127.0.0.1")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_WS_PORT = int(os.getenv("MQTT_WS_PORT", "9001"))

BROKER_CONFIG = {
    "listeners": {
        "default": {
            "type": "tcp",
            "bind": f"{MQTT_HOST}:{MQTT_PORT}",
            "max_connections": 1000,
        },
        "ws": {
            "type": "ws",
            "bind": f"{MQTT_HOST}:{MQTT_WS_PORT}",
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
    logger.info("Initializing PXT Smart Infrastructure MQTT Broker on 127.0.0.1:1883 (TCP) & 9001 (WS)...")
    broker = Broker(BROKER_CONFIG)
    await broker.start()
    logger.info("MQTT Broker is FULLY OPERATIONAL and accepting connections.")
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
