# test_search.py
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import app_state

def search_similar_chunks(query: str, top_k: int = 3):
    if app_state.current_index is None or not app_state.current_chunks:
        raise ValueError("Index or chunks not loaded in memory.")

    model = SentenceTransformer("all-MiniLM-L6-v2")
    query_vector = model.encode([query])
    distances, indices= app_state.current_index.search(np.array(query_vector), top_k)

    matched_chunks = []
    for idx in indices[0]:
        if idx < len(app_state.current_chunks):
            matched_chunks.append(app_state.current_chunks[idx])

    top_chunk_texts = [chunk["text"] for chunk in matched_chunks]
    return matched_chunks, max(distances[0]) if len(distances[0]) > 0 else 0.0