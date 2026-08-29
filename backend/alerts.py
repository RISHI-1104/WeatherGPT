"""
alerts.py — WeatherGPT custom threshold alert engine
Based on IMD rainfall/temperature classification thresholds.
No external feed — purely rule-based on weather data provided.
"""

from typing import Any


# ─── Threshold Definitions ────────────────────────────────────────────────────

RAIN_THRESHOLDS = [
    {
        "key": "extremely_heavy_rain",
        "label": "Extremely Heavy Rainfall",
        "threshold_mm": 204.5,
        "severity": "extreme",
        "message": "Extremely heavy rainfall exceeding 204.5 mm/24h. Risk of flash floods, landslides, and severe infrastructure damage.",
        "color": "red",
        "icon": "🌊",
    },
    {
        "key": "very_heavy_rain",
        "label": "Very Heavy Rainfall",
        "threshold_mm": 115.5,
        "severity": "severe",
        "message": "Very heavy rainfall exceeding 115.5 mm/24h. Significant waterlogging and local flooding expected.",
        "color": "orange",
        "icon": "🌧️",
    },
    {
        "key": "heavy_rain",
        "label": "Heavy Rainfall",
        "threshold_mm": 64.5,
        "severity": "moderate",
        "message": "Heavy rainfall exceeding 64.5 mm/24h. Exercise caution while commuting.",
        "color": "yellow",
        "icon": "🌦️",
    },
]

TEMP_THRESHOLDS = [
    {
        "key": "severe_heatwave",
        "label": "Severe Heatwave",
        "threshold_c": 45.0,
        "severity": "severe",
        "message": "Severe heatwave conditions — temperature exceeds 45°C. Avoid outdoor activity; risk of heat stroke.",
        "color": "orange",
        "icon": "🔥",
    },
    {
        "key": "heatwave",
        "label": "Heatwave",
        "threshold_c": 40.0,
        "severity": "moderate",
        "message": "Heatwave conditions — temperature exceeds 40°C. Stay hydrated and limit outdoor exposure.",
        "color": "yellow",
        "icon": "☀️",
    },
]

WIND_THRESHOLDS = [
    {
        "key": "cyclone_wind",
        "label": "Cyclone-Strength Winds",
        "threshold_kmh": 62.0,
        "severity": "extreme",
        "message": "Cyclone-strength winds exceeding 62 km/h. Secure loose objects; potential structural damage.",
        "color": "red",
        "icon": "🌀",
    },
    {
        "key": "high_wind",
        "label": "High Wind Warning",
        "threshold_kmh": 50.0,
        "severity": "moderate",
        "message": "High winds exceeding 50 km/h. Caution advised for travel and outdoor structures.",
        "color": "yellow",
        "icon": "💨",
    },
]

# Severity ordering for sorting
SEVERITY_ORDER = {"extreme": 0, "severe": 1, "moderate": 2}


# ─── Alert Engine ─────────────────────────────────────────────────────────────

def check_alerts(weather_data: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Evaluate weather data against IMD-defined thresholds.
    
    Args:
        weather_data: Normalized weather dict from weather_router
        
    Returns:
        List of active alert dicts, sorted by severity (extreme first)
    """
    alerts: list[dict[str, Any]] = []
    current = weather_data.get("current", {})
    forecast = weather_data.get("forecast", [])

    # Use current rain + max from next 24h forecast for rain checks
    rain_candidates = [current.get("rain_mm", 0.0)]
    for day in forecast[:1]:  # look at tomorrow
        rain_candidates.append(day.get("rain_mm", 0.0))
    rain_24h = max(rain_candidates)

    temp_c = current.get("temp_c", 0.0)
    wind_kmh = current.get("wind_kmh", 0.0)

    # Rainfall alerts (only highest triggered bracket)
    for threshold in RAIN_THRESHOLDS:
        if rain_24h > threshold["threshold_mm"]:
            alerts.append({
                "type": threshold["key"],
                "label": threshold["label"],
                "severity": threshold["severity"],
                "value": round(rain_24h, 1),
                "threshold": threshold["threshold_mm"],
                "unit": "mm/24h",
                "message": threshold["message"],
                "color": threshold["color"],
                "icon": threshold["icon"],
            })
            break  # only highest bracket

    # Temperature alerts (only highest triggered bracket)
    for threshold in TEMP_THRESHOLDS:
        if temp_c > threshold["threshold_c"]:
            alerts.append({
                "type": threshold["key"],
                "label": threshold["label"],
                "severity": threshold["severity"],
                "value": round(temp_c, 1),
                "threshold": threshold["threshold_c"],
                "unit": "°C",
                "message": threshold["message"],
                "color": threshold["color"],
                "icon": threshold["icon"],
            })
            break  # only highest bracket

    # Wind alerts (only highest triggered bracket)
    for threshold in WIND_THRESHOLDS:
        if wind_kmh > threshold["threshold_kmh"]:
            alerts.append({
                "type": threshold["key"],
                "label": threshold["label"],
                "severity": threshold["severity"],
                "value": round(wind_kmh, 1),
                "threshold": threshold["threshold_kmh"],
                "unit": "km/h",
                "message": threshold["message"],
                "color": threshold["color"],
                "icon": threshold["icon"],
            })
            break  # only highest bracket

    # Sort by severity: extreme → severe → moderate
    alerts.sort(key=lambda a: SEVERITY_ORDER.get(a["severity"], 99))
    return alerts


def format_alerts_for_llm(alerts: list[dict[str, Any]]) -> str:
    """Format active alerts as a concise string for injection into LLM prompt."""
    if not alerts:
        return "No active weather alerts."
    lines = []
    for a in alerts:
        lines.append(
            f"[{a['severity'].upper()}] {a['icon']} {a['label']}: "
            f"{a['value']} {a['unit']} (threshold: {a['threshold']} {a['unit']}) — {a['message']}"
        )
    return "\n".join(lines)
