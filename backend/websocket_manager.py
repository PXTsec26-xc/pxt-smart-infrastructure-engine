import json
import logging
from typing import List
from fastapi import WebSocket

logger = logging.getLogger("PXT-WebSocketManager")

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining connections: {len(self.active_connections)}")

    async def broadcast(self, message_type: str, data: dict):
        if not self.active_connections:
            return
        payload = json.dumps({
            "type": message_type,
            "data": data
        })
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Error sending WS message: {e}")
                disconnected.append(connection)

        for dead in disconnected:
            self.disconnect(dead)

ws_manager = WebSocketManager()
