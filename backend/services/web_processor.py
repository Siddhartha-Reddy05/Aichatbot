from services.web_scraper import scrape_url
from data_processing.chunk import chunk_text
from data_processing.build_vector_store import build_and_save_index
from typing import List, Optional, Dict, Any 
import uuid
import re
from core.logger import get_logger

logger = get_logger("backend.web_processor")

async def process_web_content(url: str) -> Dict[str, Any]:
    """
    Process web content: scrape → chunk → embed → store in Qdrant.
    """
    try:
        # Step 1: Scrape the web content
        logger.info(f"Scraping URL: {url}")
        scraped_data = await scrape_url(url)
        
        if "error" in scraped_data:
            return {
                "status": "error",
                "message": f"Failed to scrape URL: {scraped_data['error']}",
                "url": url
            }
        
        # Be more lenient: many sites block full extraction; accept smaller content
        if not scraped_data.get("content") or len(scraped_data["content"].strip()) < 50:
            return {
                "status": "error", 
                "message": "Insufficient content extracted from webpage",
                "url": url
            }
        
        # Step 2: Split content into logical sections (like pages)
        content = scraped_data["content"]
        title = scraped_data.get("title", "Web Content")
        domain = scraped_data.get("domain", "unknown")
        source_name = f"web_{domain}_{uuid.uuid4().hex[:8]}"
        
        logger.debug(f"Web content length: {len(content)} characters")
        
        # Step 3: Split content into logical sections (simulating pages)
        sections = split_content_into_sections(content)
        logger.debug(f"Split into {len(sections)} sections")
        
        # Step 4: Create page-like structure for chunking
        pages = []
        for i, section in enumerate(sections):
            if section.strip():  # Only add non-empty sections
                pages.append((section.strip(), i + 1, source_name))
        
        if not pages:
            return {
                "status": "error",
                "message": "No valid sections created from web content",
                "url": url
            }
        
        # Step 5: Chunk the content using your existing chunk.py
        pages_as_dicts = [{"text": t, "page": p, "source": s} for (t, p, s) in pages]
        chunks = chunk_text(pages_as_dicts)
        
        logger.debug(f"Generated {len(chunks)} chunks from {len(pages)} sections")
        
        if not chunks:
            return {
                "status": "error",
                "message": "No chunks generated from web content",
                "url": url
            }
        
        # Step 6: Build and save index
        result = build_and_save_index(pages)
        
        if result["status"] == "uploaded":
            return {
                "status": "success",
                "message": "Web content successfully processed and stored",
                "url": url,
                "title": title,
                "sections": len(pages),
                "chunks_generated": len(chunks),
                "source_name": source_name
            }
        else:
            return {
                "status": "error",
                "message": f"Failed to store web content: {result.get('reason', 'Unknown error')}",
                "url": url
            }
            
    except Exception as e:
        logger.exception("Error processing web content")
        return {
            "status": "error",
            "message": f"Error processing web content: {str(e)}",
            "url": url
        }

def split_content_into_sections(content: str, max_section_length: int = 1000) -> List[str]:
    """
    Split web content into logical sections for better chunking.
    """
    sections = []
    
    # Split by paragraphs first
    paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
    
    current_section = []
    current_length = 0
    
    for paragraph in paragraphs:
        paragraph_length = len(paragraph)
        
        # If adding this paragraph would exceed max length, start new section
        if current_length + paragraph_length > max_section_length and current_section:
            sections.append('\n\n'.join(current_section))
            current_section = []
            current_length = 0
        
        current_section.append(paragraph)
        current_length += paragraph_length
    
    # Add the last section
    if current_section:
        sections.append('\n\n'.join(current_section))
    
    # If no sections were created (very short content), use the original content
    if not sections:
        sections = [content]
    
    return sections