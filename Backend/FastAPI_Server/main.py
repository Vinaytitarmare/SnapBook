import os
import time
import json
import asyncio
import uuid
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any

from fastapi import FastAPI, Request, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client, ClientOptions
import google.generativeai as genai

# Load env variables
load_dotenv(override=True)

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

PORT = int(os.getenv("PORT", 3001))

if not all([SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY]):
    print("⚠️ Warning: Missing required environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY)")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
# We use gemini-1.5-flash for fast text analysis
model = genai.GenerativeModel('gemini-2.5-flash')

# --- IN-MEMORY QUEUE MANAGER ---
class JobManager:
    def __init__(self):
        # asyncio.PriorityQueue sorts by the first element of the tuple put into it.
        # We will put tuples of (priority_number, timestamp, job_id, req_data)
        # priority_number: lower is higher priority (e.g. 1 for Mobile, 2 for Web)
        self.queue = asyncio.PriorityQueue()
        self.jobs: Dict[str, Any] = {}

job_manager = JobManager()

async def process_memory_worker():
    """Background worker that continuously pulls from the Priority Queue and processes memories."""
    print("👷 Python FastAPI Worker Started. Waiting for jobs...")
    while True:
        try:
            # Get next job from queue
            priority, timestamp, job_id, req_data = await job_manager.queue.get()
            
            raw_text = req_data['rawText']
            source = req_data.get('source', 'E')
            
            job_manager.jobs[job_id]['state'] = 'processing'
            print(f"[Worker] Processing Job {job_id} (Source: {source}, Priority: {priority})...")
            
            try:
                # 1. Analyze with Gemini
                prompt = f"""
                Analyze the following text. Return ONLY valid JSON with exactly these keys: 
                "title" (string), "summary" (string), "keywords" (array of strings), "emotions" (array of strings), "source_url" (string or null).
                Do not include markdown formatting like ```json. Just the raw JSON object.
                
                Text:
                {raw_text}
                """
                
                # We run synchronous genai call in a threadpool to not block asyncio event loop
                response = await asyncio.to_thread(model.generate_content, prompt)
                
                response_text = response.text.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                    
                result = json.loads(response_text)
                result['timestamp'] = time.time()
                result['source'] = source
                
                # 2. Save to Supabase
                user_supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
                
                db_response = await asyncio.to_thread(
                    lambda: user_supabase.table('retain_auth_memory').insert([{"metadata": result}]).execute()
                )
                
                if not db_response.data:
                    raise Exception("Failed to insert into Supabase")
                    
                memory_id = db_response.data[0]['id']
                
                # Update Job State
                job_manager.jobs[job_id]['state'] = 'completed'
                job_manager.jobs[job_id]['result'] = {**result, 'id': memory_id}
                print(f"✅ [Worker] Job {job_id} Completed. Memory ID: {memory_id}")
                
            except Exception as e:
                print(f"❌ [Worker] Job {job_id} Failed: {e}")
                job_manager.jobs[job_id]['state'] = 'failed'
                job_manager.jobs[job_id]['reason'] = str(e)
                
            finally:
                job_manager.queue.task_done()
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"💥 [Worker] Critical error in worker loop: {e}")
            await asyncio.sleep(1)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create the background worker task
    worker_task = asyncio.create_task(process_memory_worker())
    yield
    # Shutdown: Cancel the task
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass

# Initialize FastAPI app
app = FastAPI(title="Nexus Python Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. ASYNC MEMORY SAVING (High Throughput) ---
@app.post("/receive_data")
async def receive_data(request: Request):
    body_bytes = await request.body()
    raw_text = body_bytes.decode('utf-8')
    
    if not raw_text or len(raw_text) < 2:
        raise HTTPException(status_code=400, detail="Insufficient text data")
        
    source = request.query_params.get("source", "E")
    # Priority 1 for Mobile (higher), Priority 2 for Web/Extension
    priority = 1 if source == 'M' else 2
    
    job_id = str(uuid.uuid4())
    req_data = {
        'rawText': raw_text,
        'source': source
    }
    
    job_manager.jobs[job_id] = {
        'id': job_id,
        'state': 'queued',
        'result': None,
        'reason': None,
        'timestamp': time.time()
    }
    
    # Put into the priority queue
    await job_manager.queue.put((priority, time.time(), job_id, req_data))
    
    print(f"[Queue] Job {job_id} added. Source: {source}, Priority: {priority}")
    
    return JSONResponse(status_code=202, content={
        "message": "Processing started",
        "jobId": job_id,
        "state": "queued"
    })

# --- 2. JOB STATUS POLLING ---
@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    if job_id not in job_manager.jobs:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job = job_manager.jobs[job_id]
    return {
        "jobId": job['id'],
        "state": job['state'],
        "result": job['result'],
        "reason": job['reason']
    }

# --- 3. SYNC CHAT (Gemini) ---
class AskRequest(BaseModel):
    query: str

@app.post("/ask_nexus")
async def ask_nexus(req: AskRequest):
    try:
        user_supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # Fetch recent context
        res = await asyncio.to_thread(
            lambda: user_supabase.table('retain_auth_memory').select('metadata').order('created_at', desc=True).limit(10).execute()
        )
        memories = res.data
        
        context = "No memories found."
        if memories:
            context = "\n".join([f"- {m['metadata'].get('title', 'Untitled')}: {m['metadata'].get('summary', '')}" for m in memories])
            
        prompt = f"""
        You are Nexus, a personal memory assistant. Answer based on the provided context.
        
        Context:
        {context}
        
        User Question: {req.query}
        """
        
        response = await asyncio.to_thread(model.generate_content, prompt)
        return {"answer": response.text}
        
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail="AI Brain offline")

# --- 4. NLP SEARCH (Gemini to SQL) ---
class SearchRequest(BaseModel):
    query: str

@app.post("/searchNLPSql")
async def search_nlp_sql(req: SearchRequest):
    system_prompt = """
    You are a SQL generator for PostgreSQL. 
    Table: retain_auth_memory (id, created_at, metadata jsonb).
    Metadata fields: title, summary, emotions (array), keywords (array).
    Return ONLY the raw SQL query to select IDs. No markdown.
    Example: SELECT id FROM retain_auth_memory WHERE metadata->>'title' ILIKE '%cat%'
    """
    
    try:
        response = await asyncio.to_thread(model.generate_content, system_prompt + "\n\n" + req.query)
        sql = response.text.replace('```sql', '').replace('```', '').strip()
        print(f"Generated SQL: {sql}")
        
        user_supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        res = await asyncio.to_thread(
            lambda: user_supabase.rpc('execute_sql', {'query_string': sql}).execute()
        )
        ids = [r['id'] for r in res.data] if res.data else []
        
        return {"ids": ids}
        
    except Exception as e:
        print(f"Search Error: {e}")
        raise HTTPException(status_code=500, detail="Search failed")

# --- 5. HEALTH CHECK ---
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "queue": {
            "pending_jobs": job_manager.queue.qsize(),
            "total_tracked_jobs": len(job_manager.jobs)
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
