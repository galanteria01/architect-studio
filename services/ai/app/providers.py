"""Optional multi-provider LLM integration (OpenAI / Anthropic / Gemini).

All calls go through httpx so the sidecar has no heavy SDK dependencies. If no
API key is configured, callers fall back to the heuristic engine.
"""

from __future__ import annotations

import json
import os
import re
from typing import Optional

import httpx

OPENAI_KEY = "OPENAI_API_KEY"
ANTHROPIC_KEY = "ANTHROPIC_API_KEY"
GEMINI_KEY = "GEMINI_API_KEY"

DEFAULT_MODELS = {
    "anthropic": "claude-3-5-sonnet-latest",
    "openai": "gpt-4o-mini",
    "gemini": "gemini-1.5-flash",
}


def available_providers() -> dict[str, bool]:
    return {
        "openai": bool(os.environ.get(OPENAI_KEY)),
        "anthropic": bool(os.environ.get(ANTHROPIC_KEY)),
        "gemini": bool(os.environ.get(GEMINI_KEY)),
    }


def active_provider() -> Optional[str]:
    # Priority: explicit override, then anthropic, openai, gemini.
    override = os.environ.get("AI_PROVIDER")
    providers = available_providers()
    if override and providers.get(override):
        return override
    for name in ("anthropic", "openai", "gemini"):
        if providers[name]:
            return name
    return None


def active_model() -> Optional[str]:
    provider = active_provider()
    if not provider:
        return None
    return os.environ.get("AI_MODEL", DEFAULT_MODELS[provider])


async def _complete(system: str, user: str) -> Optional[str]:
    provider = active_provider()
    if not provider:
        return None
    model = active_model()
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            if provider == "anthropic":
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": os.environ[ANTHROPIC_KEY],
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": model,
                        "max_tokens": 2048,
                        "system": system,
                        "messages": [{"role": "user", "content": user}],
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return "".join(block.get("text", "") for block in data.get("content", []))

            if provider == "openai":
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {os.environ[OPENAI_KEY]}"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user},
                        ],
                        "temperature": 0.4,
                    },
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]

            if provider == "gemini":
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    params={"key": os.environ[GEMINI_KEY]},
                    json={
                        "system_instruction": {"parts": [{"text": system}]},
                        "contents": [{"parts": [{"text": user}]}],
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        return None
    return None


def _extract_json(text: str) -> Optional[dict]:
    if not text:
        return None
    # Strip ```json fences if present.
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    candidate = fenced.group(1) if fenced else text
    # Fall back to the outermost braces.
    if not fenced:
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start >= 0 and end > start:
            candidate = candidate[start : end + 1]
    try:
        return json.loads(candidate)
    except Exception:
        return None


async def complete_json(system: str, user: str) -> Optional[dict]:
    text = await _complete(system, user)
    if text is None:
        return None
    return _extract_json(text)
