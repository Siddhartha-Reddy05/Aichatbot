from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from services.chat_history import update_chat_history, get_chat_context, clear_chat_history
from services.file_handler import extract_text_from_file
from data_processing.build_vector_store import build_and_save_index
from services.retrieval import search_similar_chunks, delete_file_chunks, list_files, clear_entire_collection, get_chunks_for_file, get_detailed_file_info, health_check
from services.gemini_setup import stream_answer
from services.prompt_utils import format_prompt
from prompts.legalprompt import system_prompt
from services.live_news import fetch_weather_news
from services.web_scraper import scrape_url
from services.web_processor import process_web_content
from typing import Optional, List, Dict, Any
from datetime import datetime
import re
from dotenv import load_dotenv
import os
from core.logger import get_logger
from routes.log_test import router as log_test_router
import time

# Load environment variables from .env at startup
load_dotenv()

# Configure structured logger
logger = get_logger("backend")

url_pattern = re.compile(r'https?://\S+')

app = FastAPI(title="Document AI Assistant", version="1.0.0")

# ✅ Enable CORS with explicit origin (wildcard + credentials is blocked by browsers)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount debug routes for logger testing
app.include_router(log_test_router, prefix="/debug", tags=["debug"])

# Request/Response timing middleware
@app.middleware("http")
async def log_requests(request, call_next):
    start = time.perf_counter()
    response = None
    try:
        response = await call_next(request)
        return response
    finally:
        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "HTTP",
            extra={
                "method": getattr(request, "method", ""),
                "path": getattr(request, "url", ""),
                "status_code": getattr(response, "status_code", None),
                "duration_ms": round(duration_ms, 2),
                "client": getattr(getattr(request, "client", None), "host", None),
            },
        )

# Global variables
most_recent_file: Optional[str] = None
web_content_sources: Dict[str, Dict[str, Any]] = {}

@app.get("/")
async def root():
    return {"message": "Document AI Assistant API is running!", "version": "1.0.0"}

@app.post("/upload")
async def upload_file(files: list[UploadFile] = File(..., max_size=200*1024*1024)):
    """
    Upload and process document files.
    """
    try:
        global most_recent_file
        results = []
        for file in files:
            content = await file.read()
            
            # Delete existing file with the same name first
            try:
                delete_file_chunks(file.filename)
                logger.info(f"Deleted existing chunks for: {file.filename}")
            except Exception as delete_error:
                logger.warning(f"Could not delete existing file (might not exist): {delete_error}")
            
            # Extract text and build index
            page_chunks = extract_text_from_file(file.filename, content)
            status = build_and_save_index(page_chunks)
            results.append(status)
            
            # Update the most recent file
            most_recent_file = file.filename
            logger.info(f"Set most recent file to: {most_recent_file}")

        clear_chat_history()  # reset on new upload
        return {"results": results}

    except Exception as e:
        logger.exception("Error in /upload")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/scrape-and-process")
async def scrape_and_process_url(url: str = Form(...)):
    """
    Scrape a URL, process the content, and add it to the knowledge base.
    """
    try:
        result = await process_web_content(url)
        
        if result["status"] == "success":
            # Track the web content source
            global web_content_sources, most_recent_file
            source_name = result["source_name"]
            web_content_sources[source_name] = {
                "url": url,
                "title": result["title"],
                "sections": result["sections"],
                "chunks": result["chunks_generated"],
                "processed_at": datetime.now().isoformat()
            }
            
            # Set as most recent file for queries
            most_recent_file = source_name
            
            return {
                "status": "success",
                "message": result["message"],
                "details": {
                    "url": url,
                    "title": result["title"],
                    "sections": result["sections"],
                    "chunks_generated": result["chunks_generated"],
                    "source_name": source_name
                }
            }
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "error",
                    "message": result["message"],
                    "url": url
                }
            )
            
    except Exception as e:
        logger.exception("Error in /scrape-and-process")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Internal server error: {str(e)}",
                "url": url
            }
        )

@app.post("/ask")
async def ask_question(question: str = Form(...)):
    """
    Ask a question about the uploaded documents or web content.
    """
    try:
        global most_recent_file, web_content_sources
        logger.info(f"Question received: {question}")
        logger.debug(f"Most recent file: {most_recent_file}")

        # Check if question contains a URL to process
        if url_pattern.search(question):
            url = url_pattern.search(question).group(0)
            logger.info(f"URL detected in question: {url}")
            
            # Check if this URL has been processed already
            processed_source = None
            for source_name, source_info in web_content_sources.items():
                if source_info["url"] == url:
                    processed_source = source_name
                    break
            
            if processed_source:
                # Use the already processed content
                most_recent_file = processed_source
                logger.info(f"Found previously processed URL: {url}")
            else:
                # Process the URL on the fly
                logger.info(f"Processing URL on the fly: {url}")
                result = await process_web_content(url)
                if result["status"] == "success":
                    web_content_sources[result["source_name"]] = {
                        "url": url,
                        "title": result["title"],
                        "sections": result["sections"],
                        "chunks": result["chunks_generated"],
                        "processed_at": datetime.now().isoformat()
                    }
                    most_recent_file = result["source_name"]
                    logger.info("Successfully processed and stored web content")
                else:
                    logger.warning(f"Failed to process URL: {result['message']}")

        # Always check available files
        files = list_files()
        logger.debug(f"Files available in Qdrant: {files}")

        # Search in vector DB - prioritize the most recent file
        top_chunks, similarity_score = search_similar_chunks(question, preferred_file=most_recent_file)
        history_context = get_chat_context()

        # Handle greetings
        greetings = ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]
        if question.strip().lower() in greetings:
            greeting_text = "Hello! How can I help you with your uploaded documents today?"
            return StreamingResponse(stream_answer(greeting_text), media_type="text/plain")

        # Case A: Relevant chunks found
        if top_chunks and similarity_score >= 0.10:
            context_parts = []
            for chunk in top_chunks:
                # Handle web content sources differently
                if chunk['file_name'].startswith('web_'):
                    # Find the URL for this web source
                    web_info = web_content_sources.get(chunk['file_name'], {})
                    url = web_info.get('url', 'Unknown URL')
                    meta = f"[Source: {web_info.get('title', 'Web Content')} - {url} - Section {chunk['page']}]"
                else:
                    meta = f"[Source: {chunk['file_name']} - Page {chunk['page']}]"
                
                context_parts.append(f"{meta}\n{chunk['text']}")
            
            context = "\n\n".join(context_parts)
            prompt = format_prompt(context, question, history_context)
            update_chat_history(question)
            return StreamingResponse(stream_answer(prompt), media_type="text/plain")

        # Case B: Files exist but no relevant info
        if files:
            prompt = (
                f"{system_prompt}\n\n"
                f"{history_context}\n\n"
                f"The user asked:\n{question}\n\n"
                "⚠️ No direct match found in uploaded documents. This answer is based on general knowledge."
            )
            update_chat_history(question)
            return StreamingResponse(stream_answer(prompt), media_type="text/plain")

        # Case C: No files at all
        return JSONResponse({"message": "⚠️ No documents found. Please upload a document to begin."})

    except Exception as e:
        logger.exception("Error in /ask")
        return JSONResponse(status_code=500, content={"error": str(e)})

# GET weather-related news via NewsData.io
@app.get("/news")
async def get_news(
    query: str = "weather",
    language: str = "en",
    country: str | None = None,
    page: int | None = None,
    api_key: str | None = None,
):
    # Fetch from NewsData.io and normalize to the frontend's expected shape
    result = await fetch_weather_news(query=query, language=language, country=country, page=page, api_key=api_key)

    # If the downstream returned an error JSONResponse, pass it through
    if isinstance(result, dict) and result.get("error"):
        return JSONResponse(status_code=400, content={"detail": result.get("error")})

    # Expecting a dict with 'articles' list from fetch_weather_news
    if isinstance(result, dict):
        articles = result.get("articles", [])
        normalized = [
            {
                "title": item.get("title"),
                "url": item.get("link"),
                "published_at": item.get("pubDate"),
                "source": item.get("source_id") or (item.get("country") or "")
            }
            for item in articles
            if item.get("title") and (item.get("link") or item.get("url"))
        ]
        return normalized

    # Fallback: if result is already a list, return as-is
    return result

# POST: scrape from URL and store (full pipeline)
@app.post("/scrape")
async def scrape_from_url(url: str = Form(...)):
    """
    Scrape a URL, chunk, embed, and store in Qdrant. Returns processing summary.
    Use /scrape-and-process as well; this is a convenience alias.
    """
    try:
        result = await process_web_content(url)
        if result.get("status") == "success":
            # Track the web content source and set most recent file
            global web_content_sources, most_recent_file
            source_name = result["source_name"]
            web_content_sources[source_name] = {
                "url": url,
                "title": result.get("title", "Web Content"),
                "sections": result.get("sections", 0),
                "chunks": result.get("chunks_generated", 0),
                "processed_at": datetime.now().isoformat()
            }
            most_recent_file = source_name
            return {
                "status": "success",
                "message": result["message"],
                "details": {
                    "url": url,
                    "title": result.get("title"),
                    "sections": result.get("sections"),
                    "chunks_generated": result.get("chunks_generated"),
                    "source_name": source_name
                }
            }
        else:
            return JSONResponse(status_code=400, content=result)
    except Exception as e:
        logger.exception("Error in /scrape")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

# File management endpoints
@app.get("/files")
async def get_files():
    """Get list of all files in the database."""
    try:
        return list_files()
    except Exception as e:
        logger.exception("Error in /files")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.delete("/delete/{file_name}")
async def delete_file(file_name: str):
    """Delete a specific file from the database."""
    try:
        delete_file_chunks(file_name)
        return {"message": f"File '{file_name}' deleted successfully."}
    except Exception as e:
        logger.exception("Error deleting file")
        return JSONResponse(status_code=500, content={"error": f"Error deleting file: {str(e)}"})

@app.delete("/clear-database")
async def clear_database():
    """Clear the entire Qdrant database."""
    try:
        clear_entire_collection()
        clear_chat_history()
        global web_content_sources, most_recent_file
        web_content_sources = {}
        most_recent_file = None
        return {"message": "Database cleared successfully."}
    except Exception as e:
        logger.exception("Error clearing database")
        return JSONResponse(status_code=500, content={"error": f"Error clearing database: {str(e)}"})

# Web content management
@app.get("/web-sources")
async def get_web_sources():
    """Get list of all processed web sources."""
    return {"web_sources": web_content_sources}

@app.delete("/clear-web-sources")
async def clear_web_sources():
    """Clear all web sources tracking."""
    global web_content_sources
    web_content_sources = {}
    return {"message": "Web sources cleared successfully"}

# Debug and monitoring endpoints
@app.get("/debug-chunks")
async def debug_chunks(file_name: str = None, limit: int = 10):
    """Debug endpoint to see what chunks are stored in the database."""
    try:
        chunks = get_chunks_for_file(file_name, limit)
        return {"chunks": chunks}
    except Exception as e:
        logger.exception("Error getting chunks")
        return JSONResponse(status_code=500, content={"error": f"Error getting chunks: {str(e)}"})

@app.get("/database-status")
async def database_status():
    """Get detailed information about the database content."""
    try:
        return get_detailed_file_info()
    except Exception as e:
        logger.exception("Error getting database status")
        return JSONResponse(status_code=500, content={"error": f"Error getting database status: {str(e)}"})

@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        return health_check()
    except Exception as e:
        logger.exception("Health check failed")
        return JSONResponse(status_code=500, content={"error": f"Health check failed: {str(e)}"})

@app.get("/current-file")
async def get_current_file():
    """Get the most recently uploaded file."""
    return {"most_recent_file": most_recent_file}

@app.post("/set-current-file")
async def set_current_file(file_name: str = Form(...)):
    """Manually set the current file to focus on."""
    global most_recent_file
    
    # Verify the file exists in the database
    files = list_files()
    file_exists = any(f["file_name"] == file_name for f in files)
    
    if file_exists:
        most_recent_file = file_name
        return {"message": f"Current file set to: {file_name}"}
    else:
        return JSONResponse(status_code=404, content={"error": f"File '{file_name}' not found in database"})

# Test endpoint for text extraction
@app.post("/test-extraction")
async def test_extraction(file: UploadFile = File(...)):
    """
    Test text extraction from a file without saving to database.
    """
    try:
        content = await file.read()
        pages = extract_text_from_file(file.filename, content)
        
        # Also test chunking
        from data_processing.chunk import chunk_text
        pages_as_dicts = [{"text": t, "page": p, "source": s} for (t, p, s) in pages]
        chunks = chunk_text(pages_as_dicts)
        
        return {
            "file_name": file.filename,
            "pages_extracted": len(pages),
            "chunks_generated": len(chunks),
            "pages": pages[:3],  # First 3 pages for preview
            "chunks": chunks[:5]  # First 5 chunks for preview
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)