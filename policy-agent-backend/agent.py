import sys
import re
import json
import pickle
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

import argparse

parser = argparse.ArgumentParser(description='Semantic search agent')
parser.add_argument('query', type=str, help='User query')
parser.add_argument('department', type=str, help='Department key')
args = parser.parse_args()

index = faiss.read_index('policy_faiss.index')
with open('policy_metadata.pkl', 'rb') as f:
    metadata = pickle.load(f)
with open('policy_chunks.pkl', 'rb') as f:
    all_chunks = pickle.load(f)

model = SentenceTransformer('all-mpnet-base-v2')

def highlight_query(text, query):
    pattern = re.compile(re.escape(query), re.IGNORECASE)
    # For JSON output no markdown, just return original text
    return text

def build_result(indices, query):
    results = []
    for idx in indices:
        meta = metadata[idx]
        chunk_text = all_chunks[idx]
        idx_pos = chunk_text.lower().find(query.lower())
        start = max(idx_pos - 50, 0) if idx_pos != -1 else 0
        end = min(idx_pos + 150, len(chunk_text)) if idx_pos != -1 else 200
        snippet = chunk_text[start:end].replace("\n", " ")
        snippet = highlight_query(snippet, query)
        results.append({
            'title': meta['title'],
            'url': meta['url'],
            'snippet': snippet
        })
    return results

query_embedding = model.encode([args.query]).astype('float32')
k = 10
D, I = index.search(query_embedding, k)

filtered_indices = [idx for idx in I[0] if metadata[idx]['department'] == args.department.lower()]

results = build_result(filtered_indices, args.query)

print(json.dumps(results, ensure_ascii=False))
