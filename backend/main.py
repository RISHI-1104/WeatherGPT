"""
main.py — WeatherGPT FastAPI Application
  | Ministry of Earth Sciences / IMD

Endpoints:
  POST /chat       — conversational weather Q&A with grounded LLM
  GET  /alerts     — active threshold alerts for a location
  GET  /history    — historical weather for trend charts
  GET  /health     — live resilience indicator (LLM + weather source status)
"""

import json
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from alerts import check_alerts, format_alerts_for_llm
from llm_router import generate_answer, get_llm_health
from weather_router import (
    get_cache_stats,
    get_historical_weather,
    get_weather,
    geocode_location,
)

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="WeatherGPT API",
    description="Conversational AI weather platform for India —  ",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://weathergpt-india.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request/Response Models ──────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    location: str
    language: str = "en"  # "en" | "hi" | "ta"


class ChatResponse(BaseModel):
    answer: Optional[str]
    location_resolved: Optional[dict]
    alerts: list
    source_used: dict
    latency_ms: Optional[float]
    stale: bool = False
    error: Optional[str] = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Conversational weather Q&A.
    Flow: geocode → fetch weather → check alerts → LLM with grounded weather context.
    """
    logger.info(f"Chat request: location={req.location!r}, lang={req.language}, q={req.question[:60]!r}")

    # 1. Fetch weather (geocodes internally)
    weather = await get_weather(req.location)

    if weather.get("error") and weather.get("source") == "none":
        raise HTTPException(
            status_code=404 if "not found" in weather["error"].lower() else 503,
            detail=weather["error"],
        )

    # 2. Check alerts
    active_alerts = check_alerts(weather) if weather.get("current") else []
    alerts_text = format_alerts_for_llm(active_alerts)

    # 3. Build weather JSON for LLM (strip internal cache fields)
    weather_for_llm = {
        k: v for k, v in weather.items()
        if k not in ("cache_hit", "cached_at", "stale")
    }
    weather_json_str = json.dumps(weather_for_llm, indent=2, default=str)

    # 4. Call LLM (grounded on weather data)
    llm_result = await generate_answer(
        question=req.question,
        weather_json=weather_json_str,
        alerts_text=alerts_text,
        language=req.language,
    )

    if llm_result.get("answer") is None:
        return ChatResponse(
            answer=None,
            location_resolved=weather.get("location"),
            alerts=active_alerts,
            source_used={
                "llm": llm_result.get("provider", "none"),
                "weather": weather.get("source", "none"),
            },
            latency_ms=llm_result.get("latency_ms"),
            stale=weather.get("stale", False),
            error=llm_result.get("error", "AI temporarily unavailable"),
        )

    return ChatResponse(
        answer=llm_result["answer"],
        location_resolved=weather.get("location"),
        alerts=active_alerts,
        source_used={
            "llm": llm_result["provider"],
            "llm_model": llm_result["model_used"],
            "weather": weather.get("source"),
            "fallback_triggered": llm_result.get("fallback_triggered", False),
        },
        latency_ms=llm_result.get("latency_ms"),
        stale=weather.get("stale", False),
    )


@app.get("/alerts")
async def alerts(location: str = Query(..., description="City/region name")):
    """Return active weather alerts for a location based on threshold rules."""
    weather = await get_weather(location)
    if weather.get("error"):
        raise HTTPException(status_code=404, detail=weather["error"])
    active_alerts = check_alerts(weather) if weather.get("current") else []
    return {
        "location": weather.get("location"),
        "alerts": active_alerts,
        "source": weather.get("source"),
        "stale": weather.get("stale", False),
    }


@app.get("/history")
async def history(
    location: str = Query(..., description="City/region name"),
    days: int = Query(7, ge=1, le=30, description="Number of historical days"),
):
    """Return historical daily weather data for trend charts."""
    result = await get_historical_weather(location, days)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.get("/geocode")
async def geocode(q: str = Query(..., description="Location search query")):
    """Autocomplete geocoding for the search bar (returns top match)."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": q, "count": 5, "language": "en", "format": "json"},
            )
            data = resp.json()
            results = data.get("results", [])
            return {
                "results": [
                    {
                        "name": r.get("name", ""),
                        "display_name": f"{r.get('name', '')}, {r.get('admin1', '')}, {r.get('country', '')}".strip(", "),
                        "lat": r["latitude"],
                        "lon": r["longitude"],
                        "country": r.get("country", ""),
                    }
                    for r in results
                ]
            }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Geocoding service error: {exc}")


@app.get("/health")
async def health():
    """
    Live resilience indicator.
    Returns active LLM/weather source, cache stats, latency, last fetch timestamps.
    """
    llm_health = get_llm_health()
    cache_stats = get_cache_stats()

    return {
        "status": "ok",
        "llm": {
            "active_provider": llm_health["active_provider"] or "not_used_yet",
            "last_model": llm_health["last_model"],
            "last_latency_ms": llm_health["last_latency_ms"],
            "last_used_at": llm_health["last_used_at"],
            "total_calls": llm_health["total_calls"],
            "fallback_count": llm_health["fallback_count"],
            "fallback_rate": llm_health["fallback_rate"],
        },
        "weather": {
            "active_source": "open-meteo (primary)",
            "cache_size": cache_stats["cache_size"],
            "cache_hits": cache_stats["cache_hits"],
            "cache_total": cache_stats["cache_total"],
            "cache_hit_rate": cache_stats["cache_hit_rate"],
            "last_successful_fetch": cache_stats["last_successful_fetch"],
        },
    }


@app.get("/")
async def root():
    return {
        "app": "WeatherGPT",
        "version": "1.0.0",
        "description": "Conversational AI weather platform for India —  ",
        "docs": "/docs",
    }
