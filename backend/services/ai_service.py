import json
import logging
from typing import Optional

from groq import AsyncGroq

from core.config import settings

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types as genai_types
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore
    genai_types = None  # type: ignore
    _GENAI_AVAILABLE = False

SYSTEM_PROMPT = """You are VibeFit, an expert personal stylist AI. Based on facial analysis data provided,
generate personalized, empowering style recommendations. Focus on enhancement and compatibility — never use
negative or judgmental language. Always frame suggestions positively."""

REC_PROMPT = """Based on this style analysis data, generate 8-12 style recommendations as a JSON array.
Each recommendation: {{"category": "aesthetic|outfit|hair|color|accessory", "title": "short title",
"description": "1-2 sentences", "confidence": 0.0-1.0, "items": []}}

Analysis data:
Face: {face}
Color: {colors}
Hair: {hair}

Return ONLY a valid JSON array, no markdown, no code fences."""

CHAT_SYSTEM = """You are VibeFit, a warm, expert AI personal stylist. You have access to the user's
style analysis. Give specific, actionable, empowering advice. Keep responses concise (2-4 sentences).
Never be negative or compare the user unfavorably."""

PLAN_REPHRASE_SYSTEM = """You rephrase the "why" text of a personal style action plan in a warmer,
more natural tone. You must NOT invent new facts, measurements, allergies, ingredients, or medical
claims. You must NOT change the "category" or "title" fields, add items, remove items, or reorder the
list. Return a JSON array with exactly the same number of objects, in the same order, each with the
same "category" and "title" you were given, and only the "why" field reworded."""

PLAN_REPHRASE_PROMPT = """Reword only the "why" field of each action below, in one warm, non-judgmental
sentence. Keep every fact — do not add or remove anything factual.

Actions:
{actions}

Return ONLY a valid JSON array, no markdown, no code fences."""


class AIService:
    def __init__(self) -> None:
        self._gemini = self._init_gemini()
        self._groq = AsyncGroq(api_key=settings.groq_api_key) if settings.groq_api_key else None

    def _init_gemini(self):
        if not _GENAI_AVAILABLE or not settings.gemini_api_key:
            return None
        try:
            return genai.Client(api_key=settings.gemini_api_key)
        except Exception as exc:
            logger.warning("Gemini client init failed: %s", exc)
            return None

    def _providers_in_order(self) -> list[str]:
        pref = settings.ai_provider.lower()
        if pref == "gemini":
            return ["gemini"]
        if pref == "groq":
            return ["groq"]
        return ["gemini", "groq"]

    async def generate_recommendations(self, face: dict, colors: dict, hair: dict) -> list[dict]:
        prompt = REC_PROMPT.format(
            face=json.dumps(face, default=str),
            colors=json.dumps(colors, default=str),
            hair=json.dumps(hair, default=str),
        )
        for provider in self._providers_in_order():
            try:
                if provider == "gemini" and self._gemini:
                    raw = await self._gemini_complete(SYSTEM_PROMPT, prompt, max_tokens=1200)
                elif provider == "groq" and self._groq:
                    raw = await self._groq_complete(SYSTEM_PROMPT, prompt, max_tokens=1200, temperature=0.7)
                else:
                    continue
                return _parse_json_array(raw)
            except Exception as exc:
                logger.warning("Provider %s failed for recommendations: %s", provider, exc)
                continue
        # No provider configured, or every provider failed: return nothing rather
        # than invented generic content with made-up confidence. The deterministic
        # rules engine (rules/engine.py) already guarantees a complete, grounded
        # baseline, so there is nothing useful an untethered fallback can add.
        return []

    async def rephrase_plan_actions(self, actions: list[dict]) -> Optional[list[dict]]:
        """Tone-only rephrase of grounded action plan items. Returns None (never
        raises) if no provider is configured or the response can't be trusted —
        callers must fall back to the original, rule-generated text unchanged."""
        if not actions:
            return None
        prompt = PLAN_REPHRASE_PROMPT.format(
            actions=json.dumps([{"category": a["category"], "title": a["title"], "why": a["why"]}
                                 for a in actions], default=str)
        )
        for provider in self._providers_in_order():
            try:
                if provider == "gemini" and self._gemini:
                    raw = await self._gemini_complete(PLAN_REPHRASE_SYSTEM, prompt, max_tokens=800)
                elif provider == "groq" and self._groq:
                    raw = await self._groq_complete(PLAN_REPHRASE_SYSTEM, prompt, max_tokens=800, temperature=0.6)
                else:
                    continue
                return _parse_json_array(raw)
            except Exception as exc:
                logger.warning("Provider %s failed for plan rephrase: %s", provider, exc)
                continue
        return None

    async def chat(self, message: str, history: list[dict], analysis_context: Optional[dict] = None) -> str:
        system = CHAT_SYSTEM
        if analysis_context:
            system += f"\n\nUser's style analysis:\n{json.dumps(analysis_context, default=str)}"

        for provider in self._providers_in_order():
            try:
                if provider == "gemini" and self._gemini:
                    return await self._gemini_chat(system, history, message)
                if provider == "groq" and self._groq:
                    return await self._groq_chat(system, history, message)
            except Exception as exc:
                logger.warning("Provider %s failed for chat: %s", provider, exc)
                continue

        return (
            "I'm your VibeFit stylist! To enable AI chat, add GEMINI_API_KEY "
            "(free at aistudio.google.com/apikey) or GROQ_API_KEY (free at console.groq.com)."
        )

    async def _gemini_complete(self, system: str, prompt: str, max_tokens: int) -> str:
        for model in (settings.gemini_model, settings.gemini_fallback_model):
            try:
                resp = await self._gemini.aio.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=genai_types.GenerateContentConfig(
                        system_instruction=system,
                        max_output_tokens=max_tokens,
                        temperature=0.7,
                    ),
                )
                text = (resp.text or "").strip()
                if text:
                    return text
            except Exception as exc:
                logger.warning("Gemini model %s failed: %s", model, exc)
                continue
        raise RuntimeError("All Gemini models failed")

    async def _gemini_chat(self, system: str, history: list[dict], message: str) -> str:
        contents = []
        for h in history[-10:]:
            role = "model" if h["role"] == "assistant" else "user"
            contents.append(genai_types.Content(role=role, parts=[genai_types.Part(text=h["content"])]))
        contents.append(genai_types.Content(role="user", parts=[genai_types.Part(text=message)]))

        for model in (settings.gemini_model, settings.gemini_fallback_model):
            try:
                resp = await self._gemini.aio.models.generate_content(
                    model=model,
                    contents=contents,
                    config=genai_types.GenerateContentConfig(
                        system_instruction=system,
                        max_output_tokens=400,
                        temperature=0.8,
                    ),
                )
                text = (resp.text or "").strip()
                if text:
                    return text
            except Exception as exc:
                logger.warning("Gemini chat model %s failed: %s", model, exc)
                continue
        raise RuntimeError("All Gemini models failed")

    async def _groq_complete(self, system: str, prompt: str, max_tokens: int, temperature: float) -> str:
        resp = await self._groq.chat.completions.create(
            model=settings.groq_model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return (resp.choices[0].message.content or "").strip()

    async def _groq_chat(self, system: str, history: list[dict], message: str) -> str:
        messages = [{"role": "system", "content": system}]
        for h in history[-10:]:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})

        resp = await self._groq.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            max_tokens=400,
            temperature=0.8,
        )
        return (resp.choices[0].message.content or "I'm here to help with your style questions!").strip()


def _parse_json_array(raw: str) -> list[dict]:
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()
    return json.loads(text)
