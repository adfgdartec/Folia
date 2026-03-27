from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Folia API"
    app_version: str = "1.0.0"
    debug: bool = False
    frontend_url: str = "http://localhost:3000"
    clerk_publishable_key: str = ""
    clerk_secret_key: str = ""
    clerk_webhook_secret: str = ""
    openai_api_key: str
    groq_api_key: str
    gemini_api_key: str
    supabase_url: str
    supabase_service_role_key: str
    pinecone_api_key: str = ""
    pinecone_index_name: str = "folia-knowledge"
    pinecone_environment: str = "us-east-1"
    pinecone_dimension: int = 1536
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "noreply@getfolia.app"
    sendgrid_from_name: str = "Folia"
    sendgrid_welcome_template_id: str = ""
    sendgrid_goal_achieved_template_id: str = ""
    sendgrid_debt_paid_template_id: str = ""
    sendgrid_weekly_summary_template_id: str = ""
    sendgrid_quarterly_tax_template_id: str = ""
    sendgrid_alert_template_id: str = ""
    finnhub_api_key: str = ""
    fred_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    rag_match_count: int = 6
    rag_chunk_size: int = 512
    rag_chunk_overlap: int = 50
    vector_backend: str = "pinecone"   # "pinecone" | "supabase"
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
