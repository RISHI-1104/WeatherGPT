"""
weather_router.py — WeatherGPT unified weather data interface
Primary: Open-Meteo (keyless, WMO-sourced GFS data)
Fallback: OpenWeatherMap (requires OPENWEATHER_API_KEY)

Features:
- 15-minute TTL cache per (lat, lon) using cachetools
- 8s timeout + 1 retry before triggering source fallback
- If both sources fail: return last cached entry with stale=True flag
- Normalized output schema regardless of source used
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from cachetools import TTLCache
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("weather_router")

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

# ─── Cache (15-minute TTL, max 256 locations) ─────────────────────────────────
_weather_cache: TTLCache = TTLCache(maxsize=256, ttl=900)
_stale_cache: dict[tuple, dict] = {}  # persistent fallback store
_cache_hits = 0
_cache_total = 0
_last_successful_fetch: dict[str, Optional[str]] = {
    "open-meteo": None,
    "openweathermap": None,
}

# ─── HTTP helpers ──────────────────────────────────────────────────────────────

async def _get_with_retry(url: str, params: dict, timeout: float = 8.0, retries: int = 1) -> dict:
    """GET with one retry before raising. Raises httpx.HTTPError on failure."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(retries + 1):
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                return resp.json()
            except (httpx.TimeoutException, httpx.HTTPStatusError) as exc:
                if attempt == retries:
                    raise
                logger.warning(f"Retry {attempt + 1} for {url}: {exc}")
                await asyncio.sleep(0.5)
    raise RuntimeError("unreachable")


# ─── Geocoding ────────────────────────────────────────────────────────────────

async def geocode_location(location_name: str) -> Optional[dict[str, Any]]:
    """
    Resolve a location name to lat/lon/display_name using Open-Meteo geocoding.
    Returns None if not found.
    """
    try:
        data = await _get_with_retry(
            "https://geocoding-api.open-meteo.com/v1/search",
            {"name": location_name, "count": 1, "language": "en", "format": "json"},
        )
        results = data.get("results", [])
        if not results:
            return None
        r = results[0]
        return {
            "name": r.get("name", location_name),
            "display_name": f"{r.get('name', '')}, {r.get('admin1', '')}, {r.get('country', '')}".strip(", "),
            "lat": r["latitude"],
            "lon": r["longitude"],
            "country": r.get("country", ""),
        }
    except Exception as exc:
        logger.error(f"Geocoding failed for '{location_name}': {exc}")
        return None


# ─── Open-Meteo ───────────────────────────────────────────────────────────────

def _wmo_to_condition(code: int) -> tuple[str, str]:
    """Map WMO weather code to human-readable condition + icon code."""
    mapping = {
        0: ("Clear Sky", "sunny"),
        1: ("Mainly Clear", "sunny"),
        2: ("Partly Cloudy", "partly_cloudy"),
        3: ("Overcast", "cloudy"),
        45: ("Foggy", "fog"),
        48: ("Icy Fog", "fog"),
        51: ("Light Drizzle", "drizzle"),
        53: ("Moderate Drizzle", "drizzle"),
        55: ("Heavy Drizzle", "drizzle"),
        61: ("Light Rain", "rain"),
        63: ("Moderate Rain", "rain"),
        65: ("Heavy Rain", "heavy_rain"),
        71: ("Light Snow", "snow"),
        73: ("Moderate Snow", "snow"),
        75: ("Heavy Snow", "snow"),
        80: ("Rain Showers", "rain"),
        81: ("Heavy Showers", "heavy_rain"),
        82: ("Violent Showers", "heavy_rain"),
        95: ("Thunderstorm", "thunderstorm"),
        96: ("Thunderstorm with Hail", "thunderstorm"),
        99: ("Thunderstorm with Heavy Hail", "thunderstorm"),
    }
    condition, icon = mapping.get(code, ("Unknown", "cloudy"))
    return condition, icon


async def _fetch_open_meteo(lat: float, lon: float) -> dict[str, Any]:
    data = await _get_with_retry(
        "https://api.open-meteo.com/v1/forecast",
        {
            "latitude": lat,
            "longitude": lon,
            "current": [
                "temperature_2m", "apparent_temperature", "relative_humidity_2m",
                "wind_speed_10m", "precipitation", "weathercode",
            ],
            "daily": [
                "temperature_2m_max", "temperature_2m_min",
                "precipitation_sum", "wind_speed_10m_max", "weathercode",
            ],
            "timezone": "auto",
            "forecast_days": 7,
        },
    )

    current = data["current"]
    daily = data["daily"]

    wmo_code = current.get("weathercode", 0)
    condition, icon_code = _wmo_to_condition(wmo_code)

    forecast = []
    for i in range(len(daily["time"])):
        day_code = daily["weathercode"][i] if i < len(daily.get("weathercode", [])) else 0
        day_condition, _ = _wmo_to_condition(day_code)
        forecast.append({
            "date": daily["time"][i],
            "max_temp_c": daily["temperature_2m_max"][i],
            "min_temp_c": daily["temperature_2m_min"][i],
            "rain_mm": daily["precipitation_sum"][i] or 0.0,
            "wind_kmh": daily["wind_speed_10m_max"][i] or 0.0,
            "condition": day_condition,
        })

    return {
        "current": {
            "temp_c": current["temperature_2m"],
            "feels_like_c": current["apparent_temperature"],
            "humidity_pct": current["relative_humidity_2m"],
            "wind_kmh": current["wind_speed_10m"],
            "rain_mm": current.get("precipitation", 0.0) or 0.0,
            "condition": condition,
            "icon_code": icon_code,
        },
        "forecast": forecast,
    }


# ─── OpenWeatherMap ───────────────────────────────────────────────────────────

def _owm_icon_to_code(icon: str) -> str:
    mapping = {
        "01": "sunny", "02": "partly_cloudy", "03": "cloudy", "04": "cloudy",
        "09": "drizzle", "10": "rain", "11": "thunderstorm", "13": "snow", "50": "fog",
    }
    return mapping.get(icon[:2], "cloudy")


async def _fetch_openweathermap(lat: float, lon: float) -> dict[str, Any]:
    if not OPENWEATHER_API_KEY:
        raise ValueError("OPENWEATHER_API_KEY not set")

    # Current weather
    current_data = await _get_with_retry(
        "https://api.openweathermap.org/data/2.5/weather",
        {"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric"},
    )

    # 5-day forecast (3h intervals → daily aggregation)
    forecast_data = await _get_with_retry(
        "https://api.openweathermap.org/data/2.5/forecast",
        {"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric"},
    )

    icon_code = _owm_icon_to_code(current_data["weather"][0]["icon"])
    condition = current_data["weather"][0]["description"].title()

    # Aggregate 3-hourly to daily
    daily_map: dict[str, dict] = {}
    for item in forecast_data["list"]:
        date = item["dt_txt"][:10]
        if date not in daily_map:
            daily_map[date] = {"temps": [], "rain": 0.0, "winds": [], "condition": condition}
        daily_map[date]["temps"].append(item["main"]["temp"])
        daily_map[date]["rain"] += item.get("rain", {}).get("3h", 0.0)
        daily_map[date]["winds"].append(item["wind"]["speed"] * 3.6)  # m/s → km/h

    forecast = []
    for date, vals in sorted(daily_map.items()):
        forecast.append({
            "date": date,
            "max_temp_c": max(vals["temps"]),
            "min_temp_c": min(vals["temps"]),
            "rain_mm": round(vals["rain"], 2),
            "wind_kmh": round(max(vals["winds"]), 1),
            "condition": vals["condition"],
        })

    return {
        "current": {
            "temp_c": current_data["main"]["temp"],
            "feels_like_c": current_data["main"]["feels_like"],
            "humidity_pct": current_data["main"]["humidity"],
            "wind_kmh": round(current_data["wind"]["speed"] * 3.6, 1),
            "rain_mm": current_data.get("rain", {}).get("1h", 0.0) or 0.0,
            "condition": condition,
            "icon_code": icon_code,
        },
        "forecast": forecast[:7],
    }


# ─── Unified Router ───────────────────────────────────────────────────────────

async def get_weather(location_name: str) -> dict[str, Any]:
    """
    Main entry point. Returns normalized weather dict.
    Tries Open-Meteo → OpenWeatherMap → stale cache.
    Tracks cache hit rate and last fetch timestamps.
    """
    global _cache_hits, _cache_total

    # Step 1: Geocode
    location = await geocode_location(location_name)
    if not location:
        return {
            "error": "Location not found",
            "location": None,
            "current": None,
            "forecast": [],
            "source": "none",
            "stale": False,
        }

    lat, lon = round(location["lat"], 3), round(location["lon"], 3)
    cache_key = (lat, lon)
    _cache_total += 1

    # Step 2: Check TTL cache
    if cache_key in _weather_cache:
        _cache_hits += 1
        cached = _weather_cache[cache_key]
        logger.info(f"Cache HIT for ({lat}, {lon})")
        return {**cached, "cache_hit": True}

    logger.info(f"Cache MISS for ({lat}, {lon}) — fetching live data")

    # Step 3: Try Open-Meteo
    source_used = "open-meteo"
    weather_payload: Optional[dict] = None
    try:
        weather_payload = await _fetch_open_meteo(lat, lon)
        _last_successful_fetch["open-meteo"] = datetime.now(timezone.utc).isoformat()
        logger.info(f"Open-Meteo fetch OK for ({lat}, {lon})")
    except Exception as exc:
        logger.warning(f"Open-Meteo failed for ({lat}, {lon}): {exc} — trying OpenWeatherMap")

        # Step 4: Try OpenWeatherMap fallback
        try:
            weather_payload = await _fetch_openweathermap(lat, lon)
            source_used = "openweathermap"
            _last_successful_fetch["openweathermap"] = datetime.now(timezone.utc).isoformat()
            logger.info(f"OpenWeatherMap fetch OK for ({lat}, {lon})")
        except Exception as exc2:
            logger.error(f"OpenWeatherMap also failed for ({lat}, {lon}): {exc2}")
            source_used = "cache-stale"

    # Step 5: Build response
    if weather_payload is not None:
        result = {
            "location": location,
            **weather_payload,
            "source": source_used,
            "stale": False,
            "cached_at": None,
            "cache_hit": False,
        }
        _weather_cache[cache_key] = result
        _stale_cache[cache_key] = {
            **result,
            "cached_at": datetime.now(timezone.utc).isoformat(),
        }
        return result
    else:
        # Both sources failed — return stale cache with flag
        if cache_key in _stale_cache:
            stale = _stale_cache[cache_key]
            logger.warning(f"Returning stale cached data for ({lat}, {lon})")
            return {**stale, "source": "cache-stale", "stale": True, "location": location}
        # Absolute failure — no cache at all
        return {
            "error": "All weather sources unavailable",
            "location": location,
            "current": None,
            "forecast": [],
            "source": "none",
            "stale": False,
        }


async def get_historical_weather(location_name: str, days: int = 7) -> dict[str, Any]:
    """Fetch historical daily weather for trend charts using Open-Meteo historical endpoint."""
    location = await geocode_location(location_name)
    if not location:
        return {"error": "Location not found", "history": []}

    lat, lon = location["lat"], location["lon"]
    from datetime import timedelta
    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=days)

    try:
        data = await _get_with_retry(
            "https://archive-api.open-meteo.com/v1/archive",
            {
                "latitude": lat,
                "longitude": lon,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "wind_speed_10m_max"],
                "timezone": "auto",
            },
        )
        daily = data.get("daily", {})
        history = []
        for i, date in enumerate(daily.get("time", [])):
            history.append({
                "date": date,
                "max_temp_c": daily["temperature_2m_max"][i],
                "min_temp_c": daily["temperature_2m_min"][i],
                "rain_mm": daily["precipitation_sum"][i] or 0.0,
                "wind_kmh": daily["wind_speed_10m_max"][i] or 0.0,
            })
        return {"location": location, "history": history, "source": "open-meteo-historical"}
    except Exception as exc:
        logger.error(f"Historical fetch failed: {exc}")
        return {"error": str(exc), "history": [], "location": location}


def get_cache_stats() -> dict:
    """Return cache performance statistics for /health endpoint."""
    hit_rate = round(_cache_hits / _cache_total, 3) if _cache_total > 0 else 0.0
    return {
        "cache_size": len(_weather_cache),
        "cache_hits": _cache_hits,
        "cache_total": _cache_total,
        "cache_hit_rate": hit_rate,
        "last_successful_fetch": _last_successful_fetch,
    }
