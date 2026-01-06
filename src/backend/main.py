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

# --- CONFIG ---
DL_SECRET = "DoOXtQ1biBgfkGUUBPBf7wgOBM0A4C6KHJ3NdIuI4yEYODwQz9EnJQQJ99BIAC4f1cMAArohAAABAZBS3Feq.Ep9vlh8JKanM9XU001FqoH1r8cNTeOJ68NabvYrMMvv4fn1e76BXJQQJ99BIAC4f1cMAArohAAABAZBS2dLv"

app = FastAPI(title="Copilot Studio Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # The URL of your React app
    allow_credentials=True,
    allow_methods=["*"],  # Allows POST, GET, OPTIONS, etc.
    allow_headers=["*"],  # Allows all headers (Content-Type, etc.)
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fastapi-bot")

# Global HTTP client for connection pooling
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
    """Starts a session and returns the Direct Line token and conversation ID."""
    url = "https://directline.botframework.com/v3/directline/conversations"
    headers = {
        "Authorization": f"Bearer {DL_SECRET}",
        "Content-Type": "application/json"
    }

    try:
        response = await http_client.post(url, headers=headers, json={})

        # India Regional Fallback if necessary
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

    # 1. Send user message
    payload = {
        "type": "message",
        "from": {"id": "user1"},
        "text": req.text
    }
    await http_client.post(activity_url, headers=headers, json=payload)

    # 2. Advanced Polling Loop
    # We poll up to 3 times with a small delay to "catch" the bot's response
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

        # Look for messages from the bot
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


# @app.post("/api/session/send")
# async def send_message(req: MessageRequest):
#     activity_url = f"{req.baseUri}/v3/directline/conversations/{req.conversationId}/activities"
#     headers = {
#         "Authorization": f"Bearer {req.token}",
#         "Content-Type": "application/json"
#     }
#
#     # 1. Send user message
#     payload = {
#         "type": "message",
#         "from": {"id": "user1"},
#         "text": req.text
#     }
#
#     # Send the message and verify it was accepted
#     send_res = await http_client.post(activity_url, headers=headers, json=payload)
#     if send_res.status_code not in (200, 201, 202):
#         raise HTTPException(status_code=send_res.status_code, detail="Failed to send message")
#
#     # 2. LONG POLLING: Wait for the bot to actually respond
#     bot_messages = []
#     current_watermark = req.watermark
#
#     # We will poll up to 5 times (total ~6-7 seconds)
#     for attempt in range(5):
#         # Give the bot some "thinking time" before each check
#         # First wait is longer (2s), subsequent checks are faster (1s)
#         await asyncio.sleep(2.0 if attempt == 0 else 1.0)
#
#         poll_url = activity_url
#         if current_watermark:
#             poll_url += f"?watermark={current_watermark}"
#
#         get_res = await http_client.get(poll_url, headers=headers)
#         if get_res.status_code != 200:
#             continue
#
#         data = get_res.json()
#         activities = data.get("activities", [])
#
#         # Filter for messages from the bot (ignore our own message)
#         new_replies = [
#             act for act in activities
#             if act.get("from", {}).get("id") != "user1" and act.get("type") == "message"
#         ]
#
#         if new_replies:
#             # We found the response!
#             bot_messages = new_replies
#             current_watermark = data.get("watermark", current_watermark)
#             break
#
#             # If we reach here, no response yet. Loop will sleep and try again.
#         logger.info(f"Attempt {attempt + 1}: No response yet, retrying...")
#
#     # 3. Format for Frontend
#     formatted = [
#         {
#             "id": m.get("id"),
#             "text": m.get("text"),
#             "attachments": m.get("attachments", []),
#             "timestamp": m.get("timestamp")
#         } for m in bot_messages
#     ]
#
#     return {
#         "messages": formatted,
#         "watermark": current_watermark
#     }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)