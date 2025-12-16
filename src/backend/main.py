import os
import time
from typing import List, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from msal import ConfidentialClientApplication

from microsoft_agents.activity import ActivityTypes
from microsoft_agents.copilotstudio.client import ConnectionSettings, CopilotClient

# ---------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------
load_dotenv()

app = FastAPI(title="Copilot Studio Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------
PP_SCOPE = ["https://api.powerplatform.com/.default"]

AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID") or os.getenv("COPILOTSTUDIOAGENT__TENANTID")
AZURE_CLIENT_ID = os.getenv("AZURE_CLIENT_ID") or os.getenv("COPILOTSTUDIOAGENT__AGENTAPPID")
AZURE_CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")

COPILOT_ENV_ID = os.getenv("COPILOTSTUDIOAGENT__ENVIRONMENTID")
COPILOT_SCHEMA_NAME = os.getenv("COPILOTSTUDIOAGENT__SCHEMANAME")

if not all([AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET,
            COPILOT_ENV_ID, COPILOT_SCHEMA_NAME]):
    raise RuntimeError("Missing required environment variables")

# ---------------------------------------------------------------------
# Token Cache (simple in-memory)
# ---------------------------------------------------------------------
_token_cache = {"access_token": None, "expires_at": 0}


def get_access_token() -> str:
    now = int(time.time())

    if _token_cache["access_token"] and now < (_token_cache["expires_at"] - 60):
        return _token_cache["access_token"]

    authority = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}"

    cca = ConfidentialClientApplication(
        client_id=AZURE_CLIENT_ID,
        client_credential=AZURE_CLIENT_SECRET,
        authority=authority,
    )

    result = cca.acquire_token_for_client(scopes=PP_SCOPE)
    print("Acquired new access token -------------", result)

    if "access_token" not in result:
        raise RuntimeError(
            f"Token acquisition failed: {result.get('error')} - {result.get('error_description')}"
        )

    _token_cache["access_token"] = result["access_token"]
    _token_cache["expires_at"] = now + int(result.get("expires_in", 3600))

    return _token_cache["access_token"]


def create_copilot_client() -> CopilotClient:
    token = get_access_token()
    settings = ConnectionSettings(
        environment_id=COPILOT_ENV_ID,
        agent_identifier=COPILOT_SCHEMA_NAME,
        cloud=None,
        copilot_agent_type=None,
        custom_power_platform_cloud=None,
    )
    return CopilotClient(settings, token)


# ---------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------
class StartSessionResponse(BaseModel):
    conversationId: str
    messages: List[Dict]


class SendMessageRequest(BaseModel):
    conversationId: str
    text: str


class SendMessageResponse(BaseModel):
    messages: List[Dict]


# ---------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------

@app.post("/api/session/start", response_model=StartSessionResponse)
async def start_session():
    client = create_copilot_client()
    stream = client.start_conversation()

    conversation_id = None
    messages = []

    async for act in stream:
        if not conversation_id and getattr(act, "conversation", None):
            conversation_id = act.conversation.id

        if act.type == ActivityTypes.message and act.text:
            messages.append({
                "id": getattr(act, "id", None),
                "sender": "bot",
                "text": act.text,
                "timestamp": getattr(act, "timestamp", None),
            })

    if not conversation_id:
        raise HTTPException(status_code=500, detail="Failed to obtain conversationId")

    return {
        "conversationId": conversation_id,
        "messages": messages,
    }


@app.post("/api/session/send", response_model=SendMessageResponse)
async def send_message(payload: SendMessageRequest):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    client = create_copilot_client()
    replies = client.ask_question(text, payload.conversationId)

    out = []

    async for act in replies:
        if act.type == ActivityTypes.message and act.text:
            out.append({
                "id": getattr(act, "id", None),
                "sender": "bot",
                "text": act.text,
                "timestamp": getattr(act, "timestamp", None),
            })
        elif act.type == ActivityTypes.end_of_conversation:
            break

    return {"messages": out}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/test-copilot")
async def test_copilot():
    client = create_copilot_client()
    activities = client.start_conversation(True)

    messages = []
    async for activity in activities:
        if activity.text:
            messages.append(activity.text)

    return {"messages": messages}
