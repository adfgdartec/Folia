from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_name: str = "Folia API"
    app_version: str = "1.0.0"
    debug: bool = False
    frontend_url: str = "http://localhost:3000" # Change to actual vercel url when finished
    openai_api_key: str
    groq_api_key: str
    gemini_api_key: str
    supabase_url: str
    supabase_service_role_key: str
    finnhub_api_key: str = ""
    fired_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    rag_match_count: int = 6
    rag_chunk_size: int = 512
    rag_chunk_overlap: int = 50
    advisor_model: str = "gpt-4o"
    narration_model: str = "llama-3.3-70b-versatile"
    document_model: str = "gemini-2.0-flash-exp"
    advisor_temperature: float = 0.2
    narration_temperature: float = 0.4
    max_tokens_advisor: int = 1200
    max_tokens_narration: int = 300
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()