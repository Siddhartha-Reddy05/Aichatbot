"""
Core application components for the Document AI Assistant.
Includes models, application state, and question utilities.
"""

from .app_state import current_index, current_chunks
from .models import ChunkMetadata
from .question_utils import (
    is_document_question,
    is_summary_question,
    is_legal_document,
    is_technical_document,
    is_business_document
)

__all__ = [
    'current_index',
    'current_chunks',
    'ChunkMetadata',
    'is_document_question',
    'is_summary_question',
    'is_legal_document',
    'is_technical_document',
    'is_business_document'
]