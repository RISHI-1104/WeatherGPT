"""
llm_router.py — WeatherGPT unified LLM interface
Primary: Google Gemini 3.6 Flash (via google-genai SDK)
Fallback: Groq qwen/qwen3.8-27b

Features:
- 20s timeout + 1 retry on Gemini before falling back to Groq
- Latency logging per provider (drives live resilience indicator)
- Returns provider name, model, latency_ms, fallback_triggered
- Gemini SDK is synchronous — runs in thread executor to avoid blocking event loop
"""

import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("llm_router")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

GEMINI_MODEL = "gemini-3.6-flash"
GROQ_MODEL = "qwen/qwen3.8-27b"

# ─── Telemetry (drives /health endpoint) ─────────────────────────────────────
_last_provider: Optional[str] = None
_last_model: Optional[str] = None
_last_latency_ms: Optional[float] = None
_last_used_at: Optional[str] = None
_fallback_count: int = 0
_total_calls: int = 0

LANGUAGE_INSTRUCTIONS = {
    "en": "Respond in clear, friendly English.",
    "hi": "हिंदी में उत्तर दें। स्पष्ट और सरल भाषा का प्रयोग करें।",
    "ta": "தமிழில் பதிலளிக்கவும். தெளிவான மற்றும் எளிய மொழியைப் பயன்படுத்தவும்.",
}

SYSTEM_PROMPT_TEMPLATE = """You are WeatherGPT, an AI weather assistant for India developed for the Smart India Hackathon (SIH Problem 26068, Ministry of Earth Sciences / IMD).

Your job is to answer weather-related questions in a helpful, accurate, and localized way for Indian citizens, farmers, disaster managers, and researchers.

## Current Weather Data (Ground Truth — use ONLY this data, never invent numbers):
{weather_json}

## Active Alerts:
{alerts_text}

## Critical Rules:
1. NEVER invent or hallucinate weather numbers. Only reason over the data provided above.
2. If the data above shows no rain, do NOT say it will rain.
3. Give actionable, practical advice relevant to the user's context (farming, travel, safety, etc.).
4. For farming questions, use rainfall and temperature data to give specific irrigation/harvest advice.
5. For safety questions, emphasize active alerts prominently.
6. Keep responses concise — 3-5 sentences max unless detail is specifically requested.
7. {language_instruction}
"""


def _build_prompt(question: str, weather_json: str, alerts_text: str, language: str) -> tuple[str, str]:
    lang_instr = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["en"])
    system = SYSTEM_PROMPT_TEMPLATE.format(
        weather_json=weather_json,
        alerts_text=alerts_text,
        language_instruction=lang_instr,
    )
    return system, question


# ─── Gemini ───────────────────────────────────────────────────────────────────

async def _call_gemini(system: str, user_message: str, timeout: float = 20.0) -> str:
    """
    Call Gemini 3.6 Flash.
    SDK is synchronous — runs in a thread executor so we can apply asyncio timeout
    without blocking the uvicorn event loop.
    """
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise RuntimeError("google-genai not installed. Run: pip install google-genai")

    client = genai.Client(api_key=GEMINI_API_KEY)

    def _sync_call() -> str:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=800,
                temperature=0.3,
            ),
        )
        # resp.text can be None for thinking models (3.6-flash, 2.5-flash)
        # Fall back to iterating candidates → parts to find the text part
        if response.text:
            return response.text
        # Walk candidates
        for candidate in (response.candidates or []):
            content = getattr(candidate, "content", None)
            if content is None:
                continue
            for part in (getattr(content, "parts", None) or []):
                # Skip thought parts; take the first real text part
                if getattr(part, "thought", False):
                    continue
                text = getattr(part, "text", None)
                if text:
                    return text
        raise ValueError(f"Gemini returned empty response. Finish reason: "
                         f"{response.candidates[0].finish_reason if response.candidates else 'unknown'}")

    loop = asyncio.get_event_loop()
    return await asyncio.wait_for(
        loop.run_in_executor(None, _sync_call),
        timeout=timeout,
    )


# ─── Groq ─────────────────────────────────────────────────────────────────────

async def _call_groq(system: str, user_message: str, timeout: float = 20.0) -> str:
    """Call Groq qwen/qwen3.8-27b with async client + timeout."""
    try:
        from groq import AsyncGroq
    except ImportError:
        raise RuntimeError("groq not installed. Run: pip install groq")

    client = AsyncGroq(api_key=GROQ_API_KEY)

    async def _inner() -> str:
        chat = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_message},
            ],
            max_tokens=600,
            temperature=0.3,
        )
        return chat.choices[0].message.content

    return await asyncio.wait_for(_inner(), timeout=timeout)


# ─── Unified Router ───────────────────────────────────────────────────────────

async def generate_answer(
    question: str,
    weather_json: str,
    alerts_text: str,
    language: str = "en",
) -> dict:
    """
    Main entry point. Tries Gemini, falls back to Groq on error/timeout.
    Returns answer + provider telemetry.
    """
    global _last_provider, _last_model, _last_latency_ms, _last_used_at
    global _fallback_count, _total_calls

    _total_calls += 1
    system, user_msg = _build_prompt(question, weather_json, alerts_text, language)

    # ── Attempt Gemini ────────────────────────────────────────────────────────
    for attempt in range(2):  # 1 retry before fallback
        start = time.perf_counter()
        try:
            answer = await _call_gemini(system, user_msg)
            latency_ms = round((time.perf_counter() - start) * 1000, 1)
            _last_provider = "gemini"
            _last_model = GEMINI_MODEL
            _last_latency_ms = latency_ms
            _last_used_at = datetime.now(timezone.utc).isoformat()
            logger.info(f"Gemini answered in {latency_ms}ms (attempt {attempt + 1})")
            return {
                "answer": answer,
                "provider": "gemini",
                "model_used": GEMINI_MODEL,
                "latency_ms": latency_ms,
                "fallback_triggered": False,
            }
        except asyncio.TimeoutError:
            logger.warning(f"Gemini timeout on attempt {attempt + 1}")
            if attempt < 1:
                await asyncio.sleep(0.3)
        except Exception as exc:
            logger.warning(f"Gemini error on attempt {attempt + 1}: {exc}")
            if attempt < 1:
                await asyncio.sleep(0.3)

    # ── Fallback: Groq ────────────────────────────────────────────────────────
    logger.warning("Falling back to Groq (Gemini unavailable)")
    _fallback_count += 1

    for attempt in range(2):  # 1 retry on Groq too
        start = time.perf_counter()
        try:
            answer = await _call_groq(system, user_msg)
            latency_ms = round((time.perf_counter() - start) * 1000, 1)
            _last_provider = "groq"
            _last_model = GROQ_MODEL
            _last_latency_ms = latency_ms
            _last_used_at = datetime.now(timezone.utc).isoformat()
            logger.info(f"Groq answered in {latency_ms}ms (attempt {attempt + 1})")
            return {
                "answer": answer,
                "provider": "groq",
                "model_used": GROQ_MODEL,
                "latency_ms": latency_ms,
                "fallback_triggered": True,
            }
        except asyncio.TimeoutError:
            logger.warning(f"Groq timeout on attempt {attempt + 1}")
            if attempt < 1:
                await asyncio.sleep(0.3)
        except Exception as exc:
            logger.warning(f"Groq error on attempt {attempt + 1}: {exc}")
            if attempt < 1:
                await asyncio.sleep(0.3)

    # Both failed
    logger.error("Both Gemini and Groq failed")
    return {
        "answer": None,
        "provider": "none",
        "model_used": "none",
        "latency_ms": None,
        "fallback_triggered": True,
        "error": "LLM unavailable — both Gemini and Groq failed to respond",
    }


def get_llm_health() -> dict:
    """Return LLM telemetry for /health endpoint."""
    return {
        "active_provider": _last_provider,
        "last_model": _last_model,
        "last_latency_ms": _last_latency_ms,
        "last_used_at": _last_used_at,
        "total_calls": _total_calls,
        "fallback_count": _fallback_count,
        "fallback_rate": round(_fallback_count / _total_calls, 3) if _total_calls > 0 else 0.0,
    }
