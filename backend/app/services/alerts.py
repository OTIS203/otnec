import json
from typing import List, Optional
from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.models.entities import Alert


class AlertBroadcaster:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_event(self, event_type: str, data: dict):
        payload = json.dumps({"event": event_type, "data": data})
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                disconnected.append(connection)

        for dead in disconnected:
            self.disconnect(dead)


broadcaster = AlertBroadcaster()


def create_alert(
    db: Session,
    network_id: str,
    severity: str,
    category: str,
    title: str,
    description: str,
    device_id: Optional[str] = None,
) -> Alert:
    alert = Alert(
        network_id=network_id,
        device_id=device_id,
        severity=severity,
        category=category,
        title=title,
        description=description,
    )
    db.add(alert)
    db.flush()

    return alert
