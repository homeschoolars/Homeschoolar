import os
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
load_dotenv(dotenv_path)

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

supabase: Client = None

if url and key and create_client:
    supabase = create_client(url, key)
else:
    print("Warning: Supabase URL or Key not found in environment variables.")
