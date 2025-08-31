# test_embeddings.py
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

# Load and chunk the legal document
with open("sample_legal.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Chunk into 200-word segments with 20-word overlap
def chunk_text(text, chunk_size=200, overlap=20):
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = words[i:i + chunk_size]
        chunks.append(" ".join(chunk))
    return chunks

chunks = chunk_text(text)

# Load model and encode text chunks
model = SentenceTransformer("all-MiniLM-L6-v2")
vectors = model.encode(chunks)

# Build FAISS index
dim = vectors.shape[1]
index = faiss.IndexFlatL2(dim)
index.add(np.array(vectors))

# Save the index
faiss.write_index(index, "legal_index.faiss")
print("✅ FAISS index saved as 'legal_index.faiss'")