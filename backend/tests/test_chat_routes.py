"""Chat endpoints through the real API, with no AI provider configured.

The response embeds the session's messages. A freshly created session was only
flushed, so serializing `messages` used to trigger a sync lazy load inside the
async session (MissingGreenlet -> 500).
"""
import pytest
from httpx import AsyncClient

from api.deps import get_ai_service
from main import app
from services.ai_service import AIService


def _keyless_ai() -> AIService:
    svc = AIService()
    svc._gemini = None
    svc._groq = None
    return svc


@pytest.fixture
def keyless_ai():
    app.dependency_overrides[get_ai_service] = _keyless_ai
    yield
    app.dependency_overrides.pop(get_ai_service, None)


async def _auth(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Chat", "email": email, "password": "password123"})
    assert reg.status_code in (200, 201), reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


@pytest.mark.asyncio
async def test_first_message_returns_session_with_both_messages(client: AsyncClient, keyless_ai):
    auth = await _auth(client, "chat-new@test.com")

    res = await client.post("/api/v1/chat/message", headers=auth, json={"content": "What suits me?"})

    assert res.status_code == 200, res.text
    messages = res.json()["messages"]
    assert [m["role"] for m in messages] == ["user", "assistant"]
    assert "GEMINI_API_KEY" in messages[1]["content"] or "GROQ_API_KEY" in messages[1]["content"]


@pytest.mark.asyncio
async def test_follow_up_message_returns_full_history(client: AsyncClient, keyless_ai):
    auth = await _auth(client, "chat-follow@test.com")
    first = await client.post("/api/v1/chat/message", headers=auth, json={"content": "Hi"})
    session_id = first.json()["id"]

    res = await client.post("/api/v1/chat/message", headers=auth,
                            json={"content": "And glasses?", "session_id": session_id})

    assert res.status_code == 200, res.text
    assert [m["role"] for m in res.json()["messages"]] == ["user", "assistant", "user", "assistant"]
