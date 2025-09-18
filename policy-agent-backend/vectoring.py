import os
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import pickle

client = MongoClient("mongodb://localhost:27017/")
db = client['policy_db']
collection = db['documents']

model = SentenceTransformer('all-mpnet-base-v2')

embedding_dimension = 768
chunk_size = 500
chunk_overlap = 50

def chunk_text(text, chunk_size=chunk_size, overlap=chunk_overlap):
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks

print("Fetching documents...")
docs = list(collection.find({}))

all_chunks = []
metadata = []

print("Chunking documents...")
for doc in docs:
    content = doc.get('content', '')
    chunks = chunk_text(content)
    for chunk in chunks:
        all_chunks.append(chunk)
        metadata.append({
            'doc_id': doc['_id'],
            'title': doc['title'],
            'url': doc['url'],
            'department': doc['department']
        })

print(f"Total chunks: {len(all_chunks)}")

print("Generating embeddings...")
batch_size = 64
embeddings = []
for i in range(0, len(all_chunks), batch_size):
    batch = all_chunks[i:i+batch_size]
    emb = model.encode(batch)
    embeddings.append(emb)

embeddings = np.vstack(embeddings).astype('float32')

print("Building FAISS index...")
index = faiss.IndexFlatL2(embedding_dimension)
index.add(embeddings)

print("Saving index, metadata, and chunk texts...")
faiss.write_index(index, 'policy_faiss.index')
with open('policy_metadata.pkl', 'wb') as f:
    pickle.dump(metadata, f)
with open('policy_chunks.pkl', 'wb') as f:
    pickle.dump(all_chunks, f)

print("Indexing complete and saved.")
