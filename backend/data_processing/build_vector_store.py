from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer
from data_processing.chunk import chunk_text
import os
import uuid
import logging
from pathlib import Path
from dotenv import load_dotenv
import time

logger = logging.getLogger(__name__)

# Load environment from backend/.env explicitly to ensure availability in all execution contexts
_backend_env = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_backend_env, override=False)

COLLECTION_NAME = "legal_chunks"
EMBEDDER_MODEL = "all-MiniLM-L6-v2"

def file_exists(client: QdrantClient, file_name: str) -> bool:
    """
    Check if a file_name already exists in Qdrant.
    """
    try:
        print(f"🔍 Checking if file '{file_name}' already exists in Qdrant...")
        results, _ = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=Filter(
                must=[FieldCondition(key="file_name", match=MatchValue(value=file_name))]
            ),
            limit=1,
            with_payload=False
        )
        exists = len(results) > 0
        print(f"📊 File existence check: {exists}")
        return exists
    except Exception as e:
        # Collection might not exist yet
        print(f"⚠️ Error checking if file exists (collection may not exist): {e}")
        return False

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

def create_collection_if_not_exists(client: QdrantClient, vector_size: int = 384):
    """Create collection if it doesn't exist."""
    try:
        if not collection_exists(client):
            print(f"🏗️ Creating new collection '{COLLECTION_NAME}' with vector size {vector_size}...")
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
            )
            print(f"✅ Successfully created collection: {COLLECTION_NAME}")
        else:
            print(f"ℹ️ Collection '{COLLECTION_NAME}' already exists")
    except Exception as e:
        print(f"❌ Error creating collection: {e}")
        raise

def build_and_save_index(pages: list):
    """
    Builds Qdrant index (collection) and uploads chunks + metadata to Qdrant Cloud.
    Returns status dict: {"file_name": str, "status": "uploaded"|"skipped"}
    """
    if not pages:
        print("❌ No pages provided to build_and_save_index")
        return {"file_name": None, "status": "skipped", "reason": "No pages provided"}

    file_name = pages[0][2]  # from (text, page, source)
    print(f"🏗️ Building index for: {file_name}")

    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_key = os.getenv("QDRANT_API_KEY")
    if not qdrant_url or not qdrant_key:
        print("❌ Qdrant credentials missing. Ensure QDRANT_URL and QDRANT_API_KEY are set in backend/.env")
        return {"file_name": file_name, "status": "error", "reason": "Missing Qdrant credentials"}

    print(f"🔗 Qdrant URL: {qdrant_url}")
    client = QdrantClient(
        url=qdrant_url,
        api_key=qdrant_key,
        prefer_grpc=False,  # use REST to avoid DNS/gRPC resolution issues on 6334
        timeout=60.0        # explicit request timeout
    )
    
    # Check if Qdrant is accessible
    try:
        client.get_collections()
        print("✅ Successfully connected to Qdrant")
    except Exception as e:
        print(f"❌ Failed to connect to Qdrant: {e}")
        return {"file_name": file_name, "status": "error", "reason": f"Qdrant connection failed: {e}"}

    # check if file already exists
    if file_exists(client, file_name):
        print(f"⚠️ Skipping upload: {file_name} already exists in Qdrant")
        return {"file_name": file_name, "status": "skipped", "reason": "File already exists"}

    # Convert tuples into dicts
    pages_as_dicts = [{"text": t, "page": p, "source": s} for (t, p, s) in pages]
    print(f"📄 Converted {len(pages)} tuples to {len(pages_as_dicts)} dicts")

    # Chunk the uploaded document(s)
    print("🔪 Starting chunking process...")
    chunks = chunk_text(pages_as_dicts)
    print(f"🔪 Generated {len(chunks)} chunks from document")

    if not chunks:
        print("❌ No chunks generated from document")
        return {"file_name": file_name, "status": "skipped", "reason": "No chunks generated"}

    # Check if chunks have meaningful content
    empty_chunks = sum(1 for chunk in chunks if not chunk["text"].strip() or len(chunk["text"].strip()) < 10)
    print(f"📊 Chunk analysis: {len(chunks) - empty_chunks} meaningful chunks, {empty_chunks} empty/low-content chunks")

    # Encode using sentence-transformers
    print("🔤 Encoding chunks with sentence transformer...")
    try:
        model = SentenceTransformer(EMBEDDER_MODEL)
        print(f"✅ Loaded embedding model: {EMBEDDER_MODEL}")
        
        chunk_texts = [c["text"] for c in chunks]
        embeddings = model.encode(chunk_texts).tolist()
        print(f"📊 Generated {len(embeddings)} embeddings with dimension {len(embeddings[0]) if embeddings else 'N/A'}")
    except Exception as e:
        print(f"❌ Error during embedding: {e}")
        return {"file_name": file_name, "status": "error", "reason": f"Embedding failed: {e}"}

    # Create collection if not exists with proper configuration
    vector_size = len(embeddings[0]) if embeddings else 384
    try:
        create_collection_if_not_exists(client, vector_size)
    except Exception as e:
        print(f"❌ Error with collection setup: {e}")
        return {"file_name": file_name, "status": "error", "reason": f"Collection setup failed: {e}"}

    # Generate a unique file_id for this upload
    file_id = str(uuid.uuid4())
    print(f"📋 Generated file ID: {file_id}")

    # Prepare points for upload
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={
                "text": chunk["text"],
                "page": chunk["page"],
                "source": chunk["source"],
                "file_id": file_id,
                "file_name": chunk["source"]
            }
        )
        for chunk, embedding in zip(chunks, embeddings)
    ]

    print(f"📤 Preparing to upload {len(points)} points to Qdrant...")

    # Upload in batches to avoid timeout
    batch_size = 20  # smaller batches to reduce concurrent socket pressure
    successful_batches = 0
    total_points_uploaded = 0

    for i in range(0, len(points), batch_size):
        batch = points[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(points) - 1) // batch_size + 1
        
        print(f"📦 Uploading batch {batch_num}/{total_batches} ({len(batch)} points)...")
        
        # Retry with exponential backoff to handle transient network errors
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                client.upsert(collection_name=COLLECTION_NAME, points=batch)
                successful_batches += 1
                total_points_uploaded += len(batch)
                print(f"✅ Successfully uploaded batch {batch_num}")
                break
            except Exception as e:
                print(f"❌ Error uploading batch {batch_num} (attempt {attempt}/{max_retries}): {e}")
                if attempt < max_retries:
                    sleep_s = 2 ** (attempt - 1)
                    print(f"⏳ Retrying in {sleep_s}s...")
                    time.sleep(sleep_s)
                else:
                    print(f"⚠️ Giving up on batch {batch_num} after {max_retries} attempts")
        
        # Small pause between batches to avoid socket exhaustion
        time.sleep(0.2)

    if successful_batches > 0:
        print(f"🎉 Successfully uploaded {total_points_uploaded} points in {successful_batches} batches")
        
        # Verify the upload
        try:
            count_result = client.count(collection_name=COLLECTION_NAME)
            print(f"📊 Total points in collection after upload: {count_result.count}")
        except Exception as e:
            print(f"⚠️ Could not verify upload count: {e}")
        
        return {"file_name": file_name, "status": "uploaded", "points_uploaded": total_points_uploaded}
    else:
        print("❌ Failed to upload any batches")
        return {"file_name": file_name, "status": "error", "reason": "All upload batches failed"}