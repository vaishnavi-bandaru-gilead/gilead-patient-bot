import asyncio
import logging
import httpx
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

dl_sec = "abc"

app = FastAPI(title="Copilot Studio Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fastapi-bot")

http_client = httpx.AsyncClient(follow_redirects=True)

class MessageRequest(BaseModel):
    conversationId: str
    token: str
    baseUri: str
    text: str
    watermark: Optional[str] = None

class MessageResponse(BaseModel):
    messages: List[str]
    watermark: str

@app.on_event("shutdown")
async def shutdown_event():
    await http_client.aclose()

@app.post("/api/session/start")
async def start_session():
    url = "https://directline.botframework.com/v3/directline/conversations"
    headers = {
        "Authorization": f"Bearer {dl_sec}",
        "Content-Type": "application/json"
    }

    try:
        response = await http_client.post(url, headers=headers, json={})

        if response.status_code == 403:
            logger.warning("Global 403, attempting India regional gateway...")
            url = "https://india.directline.botframework.com/v3/directline/conversations"
            response = await http_client.post(url, headers=headers, json={})

        if response.status_code not in (200, 201):
            raise HTTPException(status_code=response.status_code, detail=f"Downstream Error: {response.text}")

        data = response.json()
        base_uri = "https://directline.botframework.com" if "india" not in str(response.url) else "https://india.directline.botframework.com"

        return {
            "token": data.get("token"),
            "conversationId": data.get("conversationId"),
            "baseUri": base_uri
        }
    except Exception as e:
        logger.error(f"Handshake error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/session/send")
async def send_message(req: MessageRequest):
    activity_url = f"{req.baseUri}/v3/directline/conversations/{req.conversationId}/activities"
    headers = {
        "Authorization": f"Bearer {req.token}",
        "Content-Type": "application/json"
    }

    payload = {
        "type": "message",
        "from": {"id": "user1"},
        "text": req.text
    }
    await http_client.post(activity_url, headers=headers, json=payload)

    max_retries = 3
    bot_messages = []
    current_watermark = req.watermark

    for i in range(max_retries):
        await asyncio.sleep(2.0) # Wait between polls

        poll_url = activity_url
        if current_watermark:
            poll_url += f"?watermark={current_watermark}"

        get_res = await http_client.get(poll_url, headers=headers)
        data = get_res.json()

        activities = data.get("activities", [])
        current_watermark = data.get("watermark", current_watermark)

        new_bot_msgs = [
            act.get("text") for act in activities
            if act.get("from", {}).get("id") != "user1" and act.get("type") == "message"
        ]

        if new_bot_msgs:
            bot_messages.extend(new_bot_msgs)
            break # Exit loop once we get a reply

    return {
        "messages": bot_messages,
        "watermark": current_watermark
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)