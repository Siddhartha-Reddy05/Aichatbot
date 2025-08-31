"""
Service modules for the Document AI Assistant.
Business logic and external service integrations.
"""

from .chat_history import update_chat_history, get_chat_context, clear_chat_history
from .file_handler import extract_text_from_file
from .retrieval import search_similar_chunks, delete_file_chunks, list_files
from .gemini_setup import stream_answer
from .web_scraper import scrape_url
from .live_news import fetch_weather_news
from .prompt_utils import format_prompt

__all__ = [
    'update_chat_history',
    'get_chat_context',
    'clear_chat_history',
    'extract_text_from_file',
    'search_similar_chunks',
    'delete_file_chunks',
    'list_files',
    'stream_answer',
    'scrape_url',
    'fetch_weather_news',
    'format_prompt'
]