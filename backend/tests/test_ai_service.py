"""AIService must never fabricate content or confidence when no provider is
configured or every provider fails — the rules engine is the trusted floor."""
import pytest

from services.ai_service import AIService


@pytest.mark.asyncio
async def test_generate_recommendations_empty_when_no_provider_configured():
    svc = AIService()
    svc._gemini = None
    svc._groq = None

    recs = await svc.generate_recommendations(
        face={"shape": "oval"}, colors={"skinUndertone": "warm"}, hair={"texture": "wavy"}
    )

    assert recs == []


@pytest.mark.asyncio
async def test_chat_returns_setup_hint_when_no_provider_configured():
    svc = AIService()
    svc._gemini = None
    svc._groq = None

    reply = await svc.chat("What colors suit me?", history=[])

    assert "GEMINI_API_KEY" in reply or "GROQ_API_KEY" in reply
