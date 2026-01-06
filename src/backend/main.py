import uuid
import logging
import asyncio
import time
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

# --- CONFIG ---
DIRECTLINE_SECRET = "abc"
BASE_URL = "https://unitedstates.directline.botframework.com/v3/directline"
GLOBAL_URL = "https://directline.botframework.com/v3/directline"

BOT_ID = "cbc95bf5-5855-ea17-bf90-006dd26051bf"
TENANT_ID = "a5a8bcaa-3292-41e6-b735-5e8b21f4dbfd"
ENV_ID = "a26b9f3d-97e6-e3f0-840c-b199d34fcf0b"

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
    watermark: Optional[str] = None

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

    send_time = datetime.now(timezone.utc)

    # 1. POST the user message ("Thumbs up" or "Done")
    post_url = f"{BASE_URL}/conversations/{data.conversationId}/activities"
    activity_payload = {
        "type": "message",
        "from": {"id": "1f56e39b-21f4-4c0b-8761-b100c6190448", "role": "user"},
        "text": data.message,
        "cci_bot_id": BOT_ID,
        "cci_tenant_id": TENANT_ID,
        "cci_environment_id": ENV_ID,
        "channelId": "webchat"
    }

    async with httpx.AsyncClient(timeout=80.0) as client:
        try:
            send_res = await client.post(post_url, json=activity_payload, headers=auth_headers)
            send_res.raise_for_status()
            sent_msg_id = send_res.json().get("id")

            # 2. POLL for the NEW response
            # Note: We prioritize the new watermark returned by the POST if available
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

                # FILTERING LOGIC
                valid_bot_msgs = []
                for act in activities:
                    if act.get("from", {}).get("role") == "bot":
                        act_ts = datetime.fromisoformat(act.get("timestamp").replace("Z", "+00:00"))

                        # LOGIC: It must be a new activity ID and occur after our send_time
                        if act_ts > send_time and act.get("id") != sent_msg_id:
                            valid_bot_msgs.append(act)

                if valid_bot_msgs:
                    last_msg = valid_bot_msgs[-1]

                    # If the bot is just saying a single text string (e.g. "Done"),
                    # we return it clearly and ensure the watermark is updated.
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
        except Exception as e:
            logging.error(f"Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)