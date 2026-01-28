import uuid
import logging
import asyncio
import json
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import websockets as ws_lib
from dotenv import load_dotenv

load_dotenv()
DIRECTLINE_SECRET = os.getenv("HCP_DIRECTLINE_SECRET")
GLOBAL_URL = os.getenv("BOT_GLOBAL_URL")
BASE_URL = os.getenv("BOT_BASE_URL")
BOT_ID = os.getenv("COPILOTSTUDIOAGENT__BOTID")
TENANT_ID = os.getenv("COPILOTSTUDIOAGENT__TENANTID")
ENV_ID = os.getenv('COPILOTSTUDIOAGENT__ENVIRONMENTID')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

active_streams = {}

class MessagePayload(BaseModel):
    conversationId: str
    token: str
    userId: str
    message: Optional[str] = ""
    value: Optional[dict] = None
    context: Optional[dict] = None

@app.websocket("/api/session/chat")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()

    headers = {"Authorization": f"Bearer {DIRECTLINE_SECRET}"}
    async with httpx.AsyncClient() as http_client:

        resp = await http_client.post(f"{GLOBAL_URL}/conversations", headers=headers)
        session_info = resp.json()
        print("session_info:", session_info)

        conv_id = session_info.get("conversationId")
        token = session_info.get("token")
        stream_url = session_info.get("streamUrl")

        await websocket.send_json({
            "type": "session_started",
            "conversationId": conv_id,
            "token": token
        })

        async with ws_lib.connect(stream_url) as bot_ws:
            try:
                async for message in bot_ws:
                    data = json.loads(message)
                    for act in data.get("activities", []):
                        if act.get("from", {}).get("role") == "bot":
                            await websocket.send_json({
                                "type": "bot_response",
                                "text": act.get("text"),
                                "attachments": act.get("attachments", []),
                                "suggestedActions": act.get("suggestedActions", {}).get("actions", []),
                                "id": act.get("id")
                            })
            except WebSocketDisconnect:
                logging.info(f"WebSocket closed for {conv_id}")

@app.post("/api/session/send")
async def send_message(data: MessagePayload):
    payload = {
        "type": "message",
        "from": {"id": data.userId, "role": "user"},
        "text": data.message,
        "value": data.value,
        "textFormat": "plain",
        "locale": "en",
        "channelId": "webchat",
        "cci_bot_id": BOT_ID,
        "cci_tenant_id": TENANT_ID,
        "cci_environment_id": ENV_ID,
        "channelData": {
            "pva_context": data.context,
            "clientActivityID": uuid.uuid4().hex[:10],
            "cci_trace_id": uuid.uuid4().hex[:5]
        }
    }

    headers = {"Authorization": f"Bearer {data.token}"}
    post_url = f"{BASE_URL}/conversations/{data.conversationId}/activities"

    async with httpx.AsyncClient() as client:
        resp = await client.post(post_url, json=payload, headers=headers)
        if resp.status_code != 202:
            raise HTTPException(status_code=resp.status_code, detail="Failed to send activity")
        return {"status": "sent"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)