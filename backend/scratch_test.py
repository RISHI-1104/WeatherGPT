# -*- coding: utf-8 -*-
import sys
import httpx
import json

sys.stdout.reconfigure(encoding='utf-8')

tests = [
    ('en', 'Nagpur', 'Should I irrigate my paddy field tomorrow?'),
    ('hi', 'Nagpur', 'क्या मुझे कल अपने धान के खेत में सिंचाई करनी चाहिए?'),
    ('ta', 'Chennai', 'சென்னையில் இன்று மழை பெய்யுமா?'),
]

for lang, loc, q in tests:
    try:
        r = httpx.post('http://127.0.0.1:8000/chat', json={'question': q, 'location': loc, 'language': lang}, timeout=30.0)
        data = r.json()
        llm_info = data.get('source_used', {})
        print(f"=== {lang.upper()} (LLM: {llm_info.get('llm')}, Model: {llm_info.get('llm_model')}, Latency: {data.get('latency_ms')}ms) ===")
        print(f"Location: {data.get('location_resolved', {}).get('display_name')}")
        print(f"Answer:\n{data.get('answer')}")
        print("-" * 50)
    except Exception as e:
        print(f"Error for {lang}: {e}")
