# models.py
from pydantic import BaseModel, Field
from typing import Optional

class ChunkMetadata(BaseModel):
    text: str = Field(..., description="The chunk text content")
    page: Optional[int] = Field(None, description="Page number in the source document")
    source: Optional[str] = Field(None, description="Original file path or label")
    file_id: str = Field(..., description="Unique ID for the uploaded document")
    file_name: str = Field(..., description="Original filename")
    chunk_index: Optional[int] = Field(None, description="Position of the chunk in the document")