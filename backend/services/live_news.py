"""
live_news.py

Replaced "live news" with Weather-related news using NewsData.io.

This module fetches recent weather-related articles using the NewsData.io API.
Docs: https://newsdata.io/documentation

Environment variable expected: NEWSDATA_API_KEY
If not set, pass your API key explicitly to the function.
"""

import os
import httpx
from fastapi.responses import JSONResponse

NEWSDATA_ENDPOINT = "https://newsdata.io/api/1/news"
NEWSDATA_API_KEY = os.getenv("NEWSDATA_API_KEY")

async def fetch_weather_news(query: str = "weather", language: str = "en", country: str | None = None, page: int | None = None, api_key: str | None = None, page_size: int = 10):
    """
    Fetch weather-related news articles from NewsData.io.

    Parameters:
    - query: search keyword, default 'weather'
    - language: ISO code, default 'en'
    - country: optional country filter (ISO 2-letter)
    - page: optional page token (int or str as supported); if None, fetch first page
    - api_key: if not provided, will use NEWSDATA_API_KEY env var
    - page_size: desired number of articles to return from the first page (client-side slice)
    """
    key = api_key or NEWSDATA_API_KEY
    if not key:
        return JSONResponse(status_code=400, content={"error": "Missing NewsData.io API key. Set NEWSDATA_API_KEY in backend/.env or pass api_key."})

    params = {
        "apikey": key,
        "q": query,
        "language": language,
    }
    if country:
        params["country"] = country
    if page is not None:
        params["page"] = page

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(NEWSDATA_ENDPOINT, params=params)
            data = resp.json()
            if resp.status_code != 200:
                return JSONResponse(status_code=resp.status_code, content={"error": data.get("message") or "Failed to fetch news"})

            results = data.get("results") or []
            articles = [
                {
                    "title": item.get("title"),
                    "link": item.get("link"),
                    "source_id": item.get("source_id"),
                    "pubDate": item.get("pubDate"),
                    "country": item.get("country"),
                }
                for item in results
                if item.get("title") and item.get("link")
            ][:page_size]

            return {
                "query": query,
                "language": language,
                "country": country,
                "count": len(articles),
                "articles": articles,
                "nextPage": data.get("nextPage")
            }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})