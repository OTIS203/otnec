from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.alerts import broadcaster

router = APIRouter(prefix="/ws", tags=["Live WebSocket Feed"])


@router.websocket("/live")
async def websocket_endpoint(websocket: WebSocket):
    await broadcaster.connect(websocket)
    try:
        while True:
            # Keep connection alive; wait for client pings or queries
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)

