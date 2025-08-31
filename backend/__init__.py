"""
Document AI Assistant - A FastAPI-based application for document analysis and Q&A.
"""

__version__ = "1.0.0"
__author__ = "Your Name"
__description__ = "AI-powered document analysis and question answering system"

# Import main components for easy access
from core import *
from services import *
from data_processing import *
from prompts import *

__all__ = [
    # Core components
    'current_index', 'current_chunks', 'ChunkMetadata',
    'is_document_question', 'is_summary_question',
    'is_legal_document', 'is_technical_document', 'is_business_document',
    
    # Services
    'update_chat_history', 'get_chat_context', 'clear_chat_history',
    'extract_text_from_file', 'search_similar_chunks', 'delete_file_chunks',
    'list_files', 'stream_answer', 'scrape_url', 'fetch_legal_news', 'format_prompt',
    
    # Data processing
    'chunk_text', 'build_and_save_index', 'file_exists',
    
    # Prompts
    'system_prompt'
]