import os
from microsoft.agents.copilotstudio.client import CopilotStudioClient
from microsoft.agents.copilotstudio.client.models import ConnectionSettings


class CopilotAgentService:
    def __init__(self):
        settings = ConnectionSettings(
            tenant_id=os.getenv("AZURE_TENANT_ID"),
            client_id=os.getenv("AZURE_CLIENT_ID"),
            client_secret=os.getenv("AZURE_CLIENT_SECRET"),
            environment_id=os.getenv("COPILOTSTUDIOAGENT__ENVIRONMENTID"),
            schema_name=os.getenv("COPILOTSTUDIOAGENT__SCHEMANAME")
        )
        self.client = CopilotStudioClient(settings)

    async def chat_with_agent(self, user_text: str, session_id: str = None):
        # The SDK handles the underlying 'Invoke' or 'Execute' calls
        response = await self.client.process_activity(
            message=user_text,
            session_id=session_id
        )

        return {
            "reply": response.text,
            "sessionId": response.session_id,
            "activities": response.activities  # Contains rich cards, etc.
        }
