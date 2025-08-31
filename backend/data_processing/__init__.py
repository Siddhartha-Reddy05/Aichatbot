"""
Data processing modules for the Document AI Assistant.
Text chunking and vector store management.
"""

from .chunk import chunk_text
from .build_vector_store import build_and_save_index, file_exists

__all__ = [
    'chunk_text',
    'build_and_save_index',
    'file_exists'
]