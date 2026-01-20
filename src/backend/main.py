import uuid
import logging
import asyncio
import time
from datetime import datetime, timezone
import os
from typing import Optional, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

# --- CONFIG ---
load_dotenv()
DIRECTLINE_SECRET = os.getenv("HCP_DIRECTLINE_SECRET")
BASE_URL = os.getenv("BOT_BASE_URL")
GLOBAL_URL = os.getenv("BOT_GLOBAL_URL")

ENV_ID = os.getenv('COPILOTSTUDIOAGENT__ENVIRONMENTID')
TENANT_ID = os.getenv("COPILOTSTUDIOAGENT__TENANTID")
BOT_ID = os.getenv("COPILOTSTUDIOAGENT__BOTID")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SendMessageRequest(BaseModel):
    conversationId: str
    token: str
    message: str
    userId: str
    watermark: Optional[str] = None
    context: Optional[dict] = None

@app.post("/api/session/start")
async def start_session():
    headers = {"Authorization": f"Bearer {DIRECTLINE_SECRET}"}
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{GLOBAL_URL}/conversations", headers=headers)
        resp.raise_for_status()
        return resp.json()

@app.post("/api/session/send")
async def send_and_receive(data: SendMessageRequest):
    auth_headers = {
        "Authorization": f"Bearer {data.token}",
        "Content-Type": "application/json"
    }

    poll_start_time = datetime.now(timezone.utc)

    post_url = f"{BASE_URL}/conversations/{data.conversationId}/activities"
    activity_payload = {
        "type": "message",
        "from": {"id": data.userId, "role": "user"},
        "text": data.message,
        "textFormat": "plain",
        "locale": "en",
        "channelId": "webchat",
        "cci_bot_id": BOT_ID,
        "cci_tenant_id": TENANT_ID,
        "cci_environment_id": ENV_ID,
        "channelData": {
            "cci_trace_id": uuid.uuid4().hex[:5],
            "clientActivityID": uuid.uuid4().hex[:10],
            "pva_context": data.context
        }
    }

    async with httpx.AsyncClient(timeout=80.0) as client:
        try:
            send_res = await client.post(post_url, json=activity_payload, headers=auth_headers)
            send_res.raise_for_status()

            current_watermark = data.watermark
            get_url = f"{GLOBAL_URL}/conversations/{data.conversationId}/activities"

            start_loop = time.time()
            while (time.time() - start_loop) < 65:
                params = {"watermark": current_watermark} if current_watermark else {}
                get_res = await client.get(get_url, headers=auth_headers, params=params)
                get_res.raise_for_status()

                resp_data = get_res.json()
                activities = resp_data.get("activities", [])
                new_watermark = resp_data.get("watermark")

                new_bot_msgs = []
                for a in activities:
                    if a.get("from", {}).get("role") == "bot":
                        a_time = datetime.fromisoformat(a.get("timestamp").replace("Z", "+00:00"))
                        if a_time >= poll_start_time:
                            new_bot_msgs.append(a)

                if new_bot_msgs:
                    last_msg = new_bot_msgs[-1]
                    return {
                        "text": last_msg.get("text"),
                        "attachments": last_msg.get("attachments", []),
                        "suggestedActions": last_msg.get("suggestedActions", {}).get("actions", []),
                        "watermark": new_watermark,
                        "conversationId": data.conversationId,
                        "id": last_msg.get("id")
                    }

                current_watermark = new_watermark
                await asyncio.sleep(2.0)

            raise HTTPException(status_code=408, detail="Bot response timed out")

        except httpx.HTTPStatusError as e:
            logging.error(f"HTTP Error: {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail="Upstream bot error")
        except Exception as e:
            logging.error(f"General Error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)