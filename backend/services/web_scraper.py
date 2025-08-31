# web_scraper.py

import httpx
import trafilatura
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)

async def scrape_url(url: str):
    """
    Scrape content from a URL with enhanced extraction and metadata.
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=15, follow_redirects=True)
            resp.raise_for_status()
            html = resp.text

            # Extract metadata
            parsed_url = urlparse(url)
            domain = parsed_url.netloc
            
            # First try trafilatura (best for articles)
            text = trafilatura.extract(html, include_links=False, include_tables=True)
            
            if text and len(text.strip()) > 200:  # Reasonable amount of text
                return {
                    "content": text.strip(),
                    "title": get_title_from_html(html),
                    "url": url,
                    "domain": domain,
                    "source_type": "webpage",
                    "status": "success"
                }

            # Fallback → BeautifulSoup for structured content
            soup = BeautifulSoup(html, "html.parser")
            
            # Remove unwanted elements
            for element in soup(['script', 'style', 'nav', 'footer', 'header']):
                element.decompose()
            
            # Try to find main content
            main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=lambda x: x and ('content' in x or 'main' in x or 'article' in x))
            
            if main_content:
                paragraphs = [p.get_text().strip() for p in main_content.find_all(['p', 'h1', 'h2', 'h3'])]
                text = "\n\n".join([p for p in paragraphs if p])
            else:
                # Fallback to all paragraphs
                paragraphs = [p.get_text().strip() for p in soup.find_all('p')]
                text = "\n\n".join([p for p in paragraphs if p and len(p) > 20])  # Filter very short paragraphs

            if text and len(text.strip()) > 100:
                return {
                    "content": text.strip(),
                    "title": get_title_from_html(html),
                    "url": url,
                    "domain": domain,
                    "source_type": "webpage",
                    "status": "success"
                }
            else:
                return {
                    "error": "Insufficient text content extracted",
                    "url": url,
                    "status": "partial"
                }

    except httpx.HTTPError as e:
        return {"error": f"HTTP error: {str(e)}", "url": url, "status": "error"}
    except Exception as e:
        return {"error": f"Scraping error: {str(e)}", "url": url, "status": "error"}

def get_title_from_html(html: str) -> str:
    """Extract title from HTML."""
    try:
        soup = BeautifulSoup(html, "html.parser")
        title = soup.find('title')
        return title.get_text().strip() if title else "No title"
    except:
        return "No title"
