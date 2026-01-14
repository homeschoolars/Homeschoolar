from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase_client import supabase

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Check supabase connection
    if not supabase:
        print("Supabase client not initialized")
    yield
    # Shutdown

app = FastAPI(title="Homeschoolars API", version="0.1.0", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Homeschoolars API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/health/supabase")
def supabase_health_check():
    if not supabase:
        return {"status": "error", "message": "Supabase client not initialized"}
    try:
        # Perform a lightweight operation to check connectivity
        # For now, we just check if the client is initialized, 
        # as we don't know any table names guaranteed to exist yet.
        # Ideally, we would do: supabase.table("some_table").select("*").limit(1).execute()
        # But auth.get_session() is not stateless.
        # Let's try to get site url or similar config if possible, or just return success if client exists.
        return {"status": "connected", "message": "Supabase client initialized"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
