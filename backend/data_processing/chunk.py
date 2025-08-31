import re

def chunk_text(pages, chunk_size=200, overlap=20):
    chunks = []
    print(f"🔪 Starting chunking process for {len(pages)} pages")
    
    for page_idx, page in enumerate(pages):
        text = page["text"]
        page_number = page["page"]
        source = page["source"]
        
        print(f"📄 Processing page {page_number} from {source}, text length: {len(text)}")
        
        if not text or len(text.strip()) == 0:
            print(f"⚠️ Page {page_number} has no text, skipping chunking for this page")
            # You might want to add a minimal chunk to indicate this page exists but has no text
            chunks.append({
                "text": f"[Page {page_number} contains no extractable text]",
                "page": page_number,
                "source": source
            })
            continue
            
        words = re.findall(r'\w+|\S', text)
        print(f"📊 Page {page_number} has {len(words)} words")
        
        if len(words) == 0:
            print(f"⚠️ Page {page_number} has no words after regex processing")
            chunks.append({
                "text": f"[Page {page_number} contains no extractable text]",
                "page": page_number,
                "source": source
            })
            continue
            
        start = 0
        chunk_count = 0
        
        while start < len(words):
            end = start + chunk_size
            chunk_words = words[start:end]
            chunk_text = " ".join(chunk_words)
            
            chunks.append({
                "text": chunk_text,
                "page": page_number,
                "source": source
            })
            
            chunk_count += 1
            start += chunk_size - overlap
        
        print(f"✂️ Page {page_number} split into {chunk_count} chunks")
    
    print(f"✅ Chunking complete. Generated {len(chunks)} total chunks.")
    return chunks