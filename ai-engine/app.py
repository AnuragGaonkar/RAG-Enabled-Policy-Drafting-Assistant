import os
import multiprocessing
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pymongo import MongoClient

# --- AI & RAG IMPORTS ---
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import LlamaCpp

# --- PIPELINE IMPORTS ---
from pipeline import run_pipeline
from utils.kb_loader import load_legal_kb 

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
UPLOAD_FOLDER = 'uploads'
VECTOR_STORE_PATH = 'faiss_index'
KB_PATH = 'kb' 
MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017/policy_db") 

# --- MODEL PATHS ---
# 1. Chat Model (Gemma - Your existing one)
CHAT_MODEL_PATH = "models/gemma-2-2b-it-Q5_K_M.gguf"
# 2. Drafting Model (Phi-3.5 - The new strict one)
DRAFT_MODEL_PATH = "models/Phi-3.5-mini-instruct-Q5_K_M.gguf"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
CPU_CORES = max(1, multiprocessing.cpu_count() - 1)

# --- 1. INITIALIZE RESOURCES ---
print("Loading Embeddings...")
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

print("Loading Legal Knowledge Base...")
legal_kb_data = load_legal_kb(KB_PATH)
print(f"Loaded {len(legal_kb_data)} legal rules from KB.")

# --- 2. LOAD MODELS (THE TWIN BRAINS) ---

# A. Load Chat Brain (Gemma)
print(f"Loading Chat Model: {CHAT_MODEL_PATH}...")
try:
    llm_chat = LlamaCpp(
        model_path=CHAT_MODEL_PATH,
        n_ctx=2048,
        n_threads=CPU_CORES,
        n_batch=512,
        temperature=0.3,
        verbose=False
    )
except Exception as e:
    print(f"⚠️ Chat Model Failed: {e}")
    llm_chat = None

# B. Load Drafting Brain (Phi-3.5)
print(f"Loading Drafting Model: {DRAFT_MODEL_PATH}...")
try:
    llm_draft = LlamaCpp(
        model_path=DRAFT_MODEL_PATH,
        n_ctx=4096,           # Larger context for writing documents
        n_threads=CPU_CORES,
        n_batch=512,
        temperature=0.1,      # Lower temp for strict rule following
        max_tokens=2000,
        verbose=False
    )
except Exception as e:
    print(f"⚠️ Drafting Model Failed: {e}")
    llm_draft = None

print("AI Engines Ready 🚀")

# --- 3. HELPER: WRAPPER FOR DRAFTING ---
# Only needed for the pipeline, because it expects a function
def draft_wrapper(prompt_text):
    if not llm_draft: return "Error: Drafting Model not loaded."
    # Phi-3 Prompt Format
    formatted = f"<|user|>\n{prompt_text}<|end|>\n<|assistant|>\n"
    return llm_draft.invoke(formatted)

# --- 4. DATABASE SYNC LOGIC ---
def fetch_documents_from_mongo():
    try:
        client = MongoClient(MONGO_URI)
        db = client.get_database()
        collection = db['documents']
        docs = []
        cursor = collection.find({"content": {"$exists": True, "$ne": ""}})
        print(f"Found {collection.count_documents({})} documents in MongoDB.")
        for record in cursor:
            docs.append(record['content'])
        return docs
    except Exception as e:
        print(f"MongoDB Sync Error: {e}")
        return []

def rebuild_index():
    print("Rebuilding Memory from MongoDB...")
    texts = fetch_documents_from_mongo()
    if texts:
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        all_splits = text_splitter.create_documents(texts)
        global vector_store
        vector_store = FAISS.from_documents(all_splits, embeddings)
        vector_store.save_local(VECTOR_STORE_PATH)
        print(f"Successfully indexed {len(all_splits)} chunks from MongoDB.")
    else:
        print("No documents found in MongoDB to index.")
        vector_store = FAISS.from_texts(["System: No policies available."], embeddings)

# --- LOAD VECTOR STORE ---
print("Loading Vector Store...")
if os.path.exists(VECTOR_STORE_PATH):
    try:
        vector_store = FAISS.load_local(VECTOR_STORE_PATH, embeddings, allow_dangerous_deserialization=True)
        print("Vector Store loaded from disk.")
    except:
        rebuild_index()
else:
    rebuild_index()

# --- 5. API ROUTES ---

@app.route('/sync', methods=['POST'])
def manual_sync():
    try:
        rebuild_index()
        return jsonify({"message": "Memory synced with Database."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ingest', methods=['POST'])
def ingest():
    if 'file' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(save_path)
    try:
        loader = PyPDFLoader(save_path)
        docs = loader.load()
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_documents(docs)
        vector_store.add_documents(chunks)
        vector_store.save_local(VECTOR_STORE_PATH)
        return jsonify({"message": "Ingested", "chunks": len(chunks)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    # --- USES GEMMA (llm_chat) ---
    if not llm_chat: return jsonify({"response": "Chat AI not loaded."})
    
    data = request.json
    query = data.get('query', '')

    if query.lower().strip() in ['hi', 'hello', 'hey']:
        return jsonify({"response": "Hello! Ask me about your uploaded policies."})

    try:
        docs = vector_store.similarity_search(query, k=3)
        context = "\n".join([d.page_content for d in docs])
    except:
        context = "No documents found."

    # YOUR ORIGINAL PROMPT STRUCTURE (Preserved)
    prompt = f"""<start_of_turn>user
You are a Policy Assistant. Use the context below to answer.

FORMATTING RULES:
1. Use **bold** for key concepts.
2. Use bullet points for lists.
3. Keep paragraphs short.

Context:
{context}

Question: {query}<end_of_turn>
<start_of_turn>model
"""
    
    try:
        # Use llm_chat here specifically
        res = llm_chat.invoke(prompt)
        return jsonify({"response": res})
    except Exception as e:
        return jsonify({"response": "Error processing request."})

@app.route('/draft', methods=['POST'])
def draft():
    # --- USES PHI-3.5 (llm_draft) via PIPELINE ---
    if not llm_draft: return jsonify({"response": "Drafting AI not loaded."})
    
    data = request.json
    user_request = data.get('query')
    
    try:
        # Run the Pipeline using the Draft Wrapper (Phi-3)
        intent, feasibility, policy_parts, citations = run_pipeline(
            user_request, draft_wrapper, legal_kb_data
        )
        
        # Assemble Markdown
        final_doc = f"# Draft Policy: {intent.get('policy_type', 'Custom Policy')}\n\n"
        final_doc += f"**Jurisdiction:** {intent.get('jurisdiction')} | **Risk Level:** {intent.get('risk_level')}\n\n"
        
        if feasibility.get('warnings'):
            final_doc += "### ⚠️ Legal Feasibility Warnings\n"
            for warn in feasibility['warnings']:
                final_doc += f"- {warn}\n"
            final_doc += "\n"

        for section, content in policy_parts.items():
            final_doc += f"## {section}\n{content}\n\n"
            
        if citations:
            final_doc += "### 📜 Legal References\n"
            for cite in citations:
                final_doc += f"- {cite}\n"

        return jsonify({"response": final_doc})
        
    except Exception as e:
        print(f"Pipeline Error: {e}")
        return jsonify({"response": f"**Drafting Error:** {str(e)}\n\nPlease try again with a more specific request."})

@app.route('/check-conflict', methods=['POST'])
def check_conflict():
    # --- USES PHI-3.5 (llm_draft) ---
    if not llm_draft: return jsonify({"hasConflict": False, "analysis": "Drafting AI not loaded."})
    
    if 'file' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['file']
    temp_path = os.path.join(UPLOAD_FOLDER, "temp.pdf")
    file.save(temp_path)
    
    try:
        loader = PyPDFLoader(temp_path)
        pages = loader.load()
        new_text = "\n".join([p.page_content for p in pages])[:2500] 
        
        docs = vector_store.similarity_search(new_text[:500], k=3)
        existing = "\n".join([d.page_content for d in docs])
        
        # Use Phi-3 Wrapper for logical analysis
        prompt = f"""You are a Senior Policy Analyst. Compare the Draft against Existing Policies.
        
        Existing Policies:
        {existing}
        
        New Draft:
        {new_text}
        
        Task: Identify contradictions. If none, say "No conflicts found."
        Format: Markdown.
        """
        
        analysis = draft_wrapper(prompt)
        
        return jsonify({"hasConflict": "conflict" in analysis.lower(), "analysis": analysis})
    except Exception as e:
        return jsonify({"error": str(e), "hasConflict": False, "analysis": "Error during analysis."})
    finally:
        if os.path.exists(temp_path): os.remove(temp_path)

if __name__ == '__main__':
    app.run(port=5000, debug=True, threaded=True)