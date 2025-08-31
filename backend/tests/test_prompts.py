import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from chunk import chunk_text
from gemini_setup import get_gemini_response

# Step 1: Load the document and chunk it
with open("sample_document.txt", "r", encoding="utf-8") as f:
    text = f.read()
chunks = chunk_text(text)

# Step 2: Load the embedding model and FAISS index
model = SentenceTransformer("all-MiniLM-L6-v2")
index = faiss.read_index("document_index.faiss")

# Step 3: Get user query and embed it
query = input("Ask your question about the document: ")
query_vector = model.encode([query])

# Step 4: Search FAISS for most similar chunks
k = 2  # number of top similar chunks to fetch
D, I = index.search(np.array(query_vector), k)
retrieved_chunks = [chunks[i] for i in I[0]]

# Step 5: Build prompt
context = "\n\n".join(retrieved_chunks)
prompt = f"""You are a document expert. Use the following context to answer the question:

Context:
{context}

Question: {query}
Answer:"""

# Step 6: Send to Gemini
response = get_gemini_response(prompt)
print("\n🔍 AI Answer:")
print(response)