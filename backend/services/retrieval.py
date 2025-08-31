# from typing import List, Dict, Any, Tuple
# from qdrant_client import QdrantClient
# from qdrant_client.models import Filter, FieldCondition, MatchValue
# from sentence_transformers import SentenceTransformer
# import os
# from core.models import ChunkMetadata
# from qdrant_client.models import Filter, FilterSelector
# import logging

# logger = logging.getLogger(__name__)

# COLLECTION_NAME = "legal_chunks"
# EMBEDDER_MODEL = "all-MiniLM-L6-v2"

# def collection_exists(client: QdrantClient) -> bool:
#     """Check if the collection exists."""
#     try:
#         collections = client.get_collections()
#         return COLLECTION_NAME in [col.name for col in collections.collections]
#     except Exception as e:
#         logger.error(f"Error checking collection existence: {e}")
#         return False

# # MULTI-DOCUMENT SEARCH
# def search_similar_chunks(
#     query: str,
#     top_k: int = 10,
#     preferred_file: str = None
# ) -> Tuple[List[Dict[str, Any]], float]:
#     """
#     Vector search across ALL documents with preference for specific files.
#     Returns (matched_chunks, best_score)
#     """
#     client = QdrantClient(
#         url=os.getenv("QDRANT_URL"),
#         api_key=os.getenv("QDRANT_API_KEY")
#     )
    
#     # Check if collection exists
#     if not collection_exists(client):
#         return [], 0.0
        
#     model = SentenceTransformer(EMBEDDER_MODEL)
#     query_vec = model.encode([query]).tolist()[0]

#     try:
#         # First, try to search only in the preferred file
#         if preferred_file:
#             preferred_results = client.search(
#                 collection_name=COLLECTION_NAME,
#                 query_vector=query_vec,
#                 query_filter=Filter(
#                     must=[FieldCondition(key="file_name", match=MatchValue(value=preferred_file))]
#                 ),
#                 limit=top_k,
#                 with_payload=True
#             )
            
#             # If we found results in the preferred file, return them
#             if preferred_results and any(r.score > 0.1 for r in preferred_results):
#                 chunks, scores = [], []
#                 for r in preferred_results:
#                     try:
#                         validated = ChunkMetadata(**(r.payload or {}))
#                         chunks.append(validated.dict())
#                         scores.append(r.score)
#                     except Exception as e:
#                         print(f"⚠️ Skipping invalid payload: {e}")
                
#                 if chunks:  # Only return if we found valid chunks
#                     return chunks, (max(scores) if scores else 0.0)
        
#         # If no preferred file or no results in preferred file, search all files
#         results = client.search(
#             collection_name=COLLECTION_NAME,
#             query_vector=query_vec,
#             limit=top_k,
#             with_payload=True
#         )
#     except Exception as e:
#         print(f"❌ Qdrant search error: {e}")
#         return [], 0.0

#     chunks, scores = [], []
#     for r in results:
#         try:
#             validated = ChunkMetadata(**(r.payload or {}))
#             chunks.append(validated.dict())
#             scores.append(r.score)
#         except Exception as e:
#             print(f"⚠️ Skipping invalid payload: {e}")

#     return chunks, (max(scores) if scores else 0.0)

# # LIST FILES FOR FRONTEND DROPDOWN
# def list_files(limit: int = 5000) -> List[Dict[str, str]]:
#     """
#     Return unique {file_id, file_name} pairs present in Qdrant.
#     """
#     client = QdrantClient(
#         url=os.getenv("QDRANT_URL"),
#         api_key=os.getenv("QDRANT_API_KEY")
#     )
    
#     # Check if collection exists
#     if not collection_exists(client):
#         return []

#     points, _ = client.scroll(
#         collection_name=COLLECTION_NAME,
#         with_payload=True,
#         limit=limit
#     )
#     seen = {}
#     for p in points:
#         try:
#             validated = ChunkMetadata(**(p.payload or {}))
#             if validated.file_id not in seen:
#                 seen[validated.file_id] = validated.file_name
#         except Exception as e:
#             print(f"⚠️ Skipping invalid payload: {e}")

#     return [{"file_id": fid, "file_name": name} for fid, name in seen.items()]


# # DELETE BY FILE NAME
# def delete_file_chunks(file_name: str) -> None:
#     """
#     Delete all chunks belonging to a given file_name.
#     """
#     client = QdrantClient(
#         url=os.getenv("QDRANT_URL"),
#         api_key=os.getenv("QDRANT_API_KEY")
#     )
    
#     # Check if collection exists
#     if not collection_exists(client):
#         return
        
#     client.delete(
#         collection_name=COLLECTION_NAME,
#         points_selector=FilterSelector(
#             filter=Filter(
#                 must=[FieldCondition(key="file_name", match=MatchValue(value=file_name))]
#             )
#         ),
#         wait=True
#     )
# def clear_entire_collection() -> None:
#     """
#     Delete all chunks from the entire collection.
#     """
#     client = QdrantClient(
#         url=os.getenv("QDRANT_URL"),
#         api_key=os.getenv("QDRANT_API_KEY")
#     )
    
#     # Check if collection exists
#     if not collection_exists(client):
#         print("ℹ️ Collection doesn't exist, nothing to clear")
#         return
        
#     try:
#         client.delete(
#             collection_name=COLLECTION_NAME,
#             points_selector=FilterSelector(
#                 filter=Filter(must=[])  # Empty filter selects all points
#             ),
#             wait=True
#         )
#         print("✅ Entire collection cleared successfully")
#     except Exception as e:
#         print(f"❌ Error clearing collection: {e}")
#         raise
# def get_detailed_file_info(limit: int = 1000) -> Dict[str, Any]:
#     """
#     Return detailed information about files in the database.
#     """
#     client = QdrantClient(
#         url=os.getenv("QDRANT_URL"),
#         api_key=os.getenv("QDRANT_API_KEY")
#     )

#     # Check if collection exists
#     if not collection_exists(client):
#         return {"status": "empty", "message": "Collection does not exist"}

#     points, _ = client.scroll(
#         collection_name=COLLECTION_NAME,
#         with_payload=True,
#         limit=limit
#     )
    
#     file_info = {}
#     for p in points:
#         try:
#             payload = p.payload or {}
#             file_name = payload.get("file_name", "unknown")
            
#             if file_name not in file_info:
#                 file_info[file_name] = {
#                     "chunk_count": 0,
#                     "pages": set(),
#                     "file_id": payload.get("file_id"),
#                     "sample_text": payload.get("text", "")[:100] + "..." if payload.get("text") else ""
#                 }
            
#             file_info[file_name]["chunk_count"] += 1
#             file_info[file_name]["pages"].add(payload.get("page", 0))
            
#         except Exception as e:
#             print(f"⚠️ Skipping invalid payload: {e}")

#     # Convert sets to lists for JSON serialization
#     for file_name, info in file_info.items():
#         info["pages"] = list(info["pages"])
#         info["page_count"] = len(info["pages"])

#     return {
#         "total_points": len(points),
#         "files": file_info
#     }

# def get_chunks_for_file(file_name: str = None, limit: int = 10) -> List[Dict[str, Any]]:
#     """
#     Get chunks for a specific file or all files.
#     """
#     client = QdrantClient(
#         url=os.getenv("QDRANT_URL"),
#         api_key=os.getenv("QDRANT_API_KEY")
#     )

#     # Check if collection exists
#     if not collection_exists(client):
#         return []

#     # Build filter if file_name is specified
#     query_filter = None
#     if file_name:
#         query_filter = Filter(
#             must=[FieldCondition(key="file_name", match=MatchValue(value=file_name))]
#         )

#     points, _ = client.scroll(
#         collection_name=COLLECTION_NAME,
#         with_payload=True,
#         limit=limit,
#         scroll_filter=query_filter
#     )
    
#     chunks = []
#     for p in points:
#         try:
#             payload = p.payload or {}
#             chunk_info = {
#                 "file_name": payload.get("file_name"),
#                 "page": payload.get("page"),
#                 "text_preview": (payload.get("text", "")[:100] + "...") if payload.get("text") else "EMPTY",
#                 "text_length": len(payload.get("text", "")),
#                 "file_id": payload.get("file_id")
#             }
#             chunks.append(chunk_info)
#         except Exception as e:
#             print(f"⚠️ Skipping invalid payload: {e}")

#     return chunks


from typing import List, Dict, Any, Tuple
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer
import os
from core.models import ChunkMetadata
from qdrant_client.models import Filter, FilterSelector
import logging
from pathlib import Path
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Ensure .env in backend/ is loaded for Qdrant creds in all execution contexts
_backend_env = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_backend_env, override=False)

COLLECTION_NAME = "legal_chunks"
EMBEDDER_MODEL = "all-MiniLM-L6-v2"

def collection_exists(client: QdrantClient) -> bool:
    """Check if the collection exists."""
    try:
        print(f"🔍 Checking if collection '{COLLECTION_NAME}' exists...")
        collections = client.get_collections()
        collection_names = [col.name for col in collections.collections]
        exists = COLLECTION_NAME in collection_names
        print(f"📊 Collection existence: {exists}")
        return exists
    except Exception as e:
        print(f"❌ Error checking collection existence: {e}")
        return False

def get_qdrant_client() -> QdrantClient:
    """Get a Qdrant client instance."""
    try:
        client = QdrantClient(
            url=os.getenv("QDRANT_URL"),
            api_key=os.getenv("QDRANT_API_KEY")
        )
        # Test connection
        client.get_collections()
        print("✅ Qdrant client connected successfully")
        return client
    except Exception as e:
        print(f"❌ Failed to connect to Qdrant: {e}")
        raise

def search_similar_chunks(
    query: str,
    top_k: int = 10,
    preferred_file: str = None
) -> Tuple[List[Dict[str, Any]], float]:
    """
    Vector search across ALL documents with preference for specific files.
    Returns (matched_chunks, best_score)
    """
    client = get_qdrant_client()
    
    # Check if collection exists
    if not collection_exists(client):
        return [], 0.0
        
    model = SentenceTransformer(EMBEDDER_MODEL)
    query_vec = model.encode([query]).tolist()[0]

    try:
        # First, try to search only in the preferred file
        if preferred_file:
            print(f"🔍 Searching in preferred file: {preferred_file}")
            preferred_results = client.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_vec,
                query_filter=Filter(
                    must=[FieldCondition(key="file_name", match=MatchValue(value=preferred_file))]
                ),
                limit=top_k,
                with_payload=True,
                score_threshold=0.1  # Minimum similarity score
            )
            
            # If we found good results in the preferred file, return them
            if preferred_results and any(r.score > 0.15 for r in preferred_results):
                chunks, scores = [], []
                for r in preferred_results:
                    try:
                        if r.score > 0.15:  # Only include decent matches
                            validated = ChunkMetadata(**(r.payload or {}))
                            chunks.append(validated.dict())
                            scores.append(r.score)
                    except Exception as e:
                        print(f"⚠️ Skipping invalid payload: {e}")
                
                if chunks:  # Only return if we found valid chunks
                    print(f"✅ Found {len(chunks)} matches in preferred file with scores {[round(s, 3) for s in scores]}")
                    return chunks, (max(scores) if scores else 0.0)
        
        # If no preferred file or no good results in preferred file, search all files
        print("🔍 Searching across all files...")
        results = client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vec,
            limit=top_k,
            with_payload=True,
            score_threshold=0.1  # Minimum similarity score
        )
    except Exception as e:
        print(f"❌ Qdrant search error: {e}")
        return [], 0.0

    chunks, scores = [], []
    for r in results:
        try:
            if r.score > 0.15:  # Only include decent matches
                validated = ChunkMetadata(**(r.payload or {}))
                chunks.append(validated.dict())
                scores.append(r.score)
        except Exception as e:
            print(f"⚠️ Skipping invalid payload: {e}")

    if chunks:
        print(f"✅ Found {len(chunks)} matches across all files with scores {[round(s, 3) for s in scores]}")
    else:
        print("❌ No relevant matches found")

    return chunks, (max(scores) if scores else 0.0)


# LIST FILES FOR FRONTEND DROPDOWN
def list_files(limit: int = 5000) -> List[Dict[str, str]]:
    """
    Return unique {file_id, file_name} pairs present in Qdrant.
    """
    client = get_qdrant_client()

    # Check if collection exists
    if not collection_exists(client):
        return []

    points, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        with_payload=True,
        limit=limit
    )
    seen = {}
    for p in points:
        try:
            validated = ChunkMetadata(**(p.payload or {}))
            if validated.file_id not in seen:
                seen[validated.file_id] = validated.file_name
        except Exception as e:
            print(f"⚠️ Skipping invalid payload: {e}")

    files = [{"file_id": fid, "file_name": name} for fid, name in seen.items()]
    print(f"📂 Found {len(files)} files in database: {[f['file_name'] for f in files]}")
    return files


# DELETE BY FILE NAME
def delete_file_chunks(file_name: str) -> None:
    """
    Delete all chunks belonging to a given file_name.
    """
    client = get_qdrant_client()
    
    # Check if collection exists
    if not collection_exists(client):
        print(f"ℹ️ Collection doesn't exist, nothing to delete for {file_name}")
        return
        
    try:
        print(f"🗑️ Deleting chunks for file: {file_name}")
        result = client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="file_name", match=MatchValue(value=file_name))]
                )
            ),
            wait=True
        )
        print(f"✅ Deleted {result.operation_id} chunks for {file_name}")
    except Exception as e:
        print(f"❌ Error deleting file chunks: {e}")
        # It's okay if the file doesn't exist
        if "Not found" not in str(e):
            raise


def clear_entire_collection() -> None:
    """
    Delete all chunks from the entire collection.
    """
    client = get_qdrant_client()
    
    # Check if collection exists
    if not collection_exists(client):
        print("ℹ️ Collection doesn't exist, nothing to clear")
        return
        
    try:
        print("🗑️ Clearing entire collection...")
        result = client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=FilterSelector(
                filter=Filter(must=[])  # Empty filter selects all points
            ),
            wait=True
        )
        print(f"✅ Entire collection cleared successfully. Operation ID: {result.operation_id}")
    except Exception as e:
        print(f"❌ Error clearing collection: {e}")
        raise


def get_chunks_for_file(file_name: str = None, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Get chunks for a specific file or all files.
    """
    client = get_qdrant_client()

    # Check if collection exists
    if not collection_exists(client):
        return []

    # Build filter if file_name is specified
    query_filter = None
    if file_name:
        query_filter = Filter(
            must=[FieldCondition(key="file_name", match=MatchValue(value=file_name))]
        )

    points, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        with_payload=True,
        limit=limit,
        scroll_filter=query_filter
    )
    
    chunks = []
    for p in points:
        try:
            payload = p.payload or {}
            chunk_info = {
                "file_name": payload.get("file_name"),
                "page": payload.get("page"),
                "text_preview": (payload.get("text", "")[:100] + "...") if payload.get("text") else "EMPTY",
                "text_length": len(payload.get("text", "")),
                "file_id": payload.get("file_id"),
                "source": payload.get("source")
            }
            chunks.append(chunk_info)
        except Exception as e:
            print(f"⚠️ Skipping invalid payload: {e}")

    return chunks


def get_detailed_file_info(limit: int = 1000) -> Dict[str, Any]:
    """
    Return detailed information about files in the database.
    """
    client = get_qdrant_client()

    # Check if collection exists
    if not collection_exists(client):
        return {"status": "empty", "message": "Collection does not exist"}

    points, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        with_payload=True,
        limit=limit
    )
    
    file_info = {}
    for p in points:
        try:
            payload = p.payload or {}
            file_name = payload.get("file_name", "unknown")
            
            if file_name not in file_info:
                file_info[file_name] = {
                    "chunk_count": 0,
                    "pages": set(),
                    "file_id": payload.get("file_id"),
                    "sample_text": payload.get("text", "")[:100] + "..." if payload.get("text") else ""
                }
            
            file_info[file_name]["chunk_count"] += 1
            file_info[file_name]["pages"].add(payload.get("page", 0))
            
        except Exception as e:
            print(f"⚠️ Skipping invalid payload: {e}")

    # Convert sets to lists for JSON serialization
    for file_name, info in file_info.items():
        info["pages"] = list(info["pages"])
        info["page_count"] = len(info["pages"])

    return {
        "total_points": len(points),
        "files": file_info
    }


def get_collection_stats() -> Dict[str, Any]:
    """
    Get statistics about the Qdrant collection.
    """
    client = get_qdrant_client()
    
    # Check if collection exists
    if not collection_exists(client):
        return {"status": "empty", "message": "Collection does not exist"}
    
    try:
        # Get collection info
        collection_info = client.get_collection(COLLECTION_NAME)
        
        # Get count of points
        count_result = client.count(COLLECTION_NAME)
        
        return {
            "status": "exists",
            "collection_name": COLLECTION_NAME,
            "vectors_count": count_result.count,
            "vectors_config": str(collection_info.config.params.vectors),
            "indexed_vectors_count": collection_info.vectors_count,
            "points_count": collection_info.points_count
        }
    except Exception as e:
        return {"status": "error", "message": f"Failed to get collection stats: {e}"}


def health_check() -> Dict[str, Any]:
    """
    Perform a health check of the Qdrant connection and collection.
    """
    try:
        client = get_qdrant_client()
        collections = client.get_collections()
        collection_exists = COLLECTION_NAME in [col.name for col in collections.collections]
        
        return {
            "status": "healthy",
            "qdrant_connection": True,
            "collection_exists": collection_exists,
            "collection_name": COLLECTION_NAME
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "qdrant_connection": False,
            "error": str(e)
        }


# Add to __all__ for import
__all__ = [
    'search_similar_chunks',
    'list_files',
    'delete_file_chunks',
    'clear_entire_collection',
    'get_chunks_for_file',
    'get_detailed_file_info',
    'get_collection_stats',
    'health_check',
    'collection_exists'
]