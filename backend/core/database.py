from supabase import create_client, Client
from core.config import get_settings
from functools import lru_cache

settings = get_settings()

@lru_cache
def get_supabase() -> Client:
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key
    )

async def execute_rpc(function_name: str, params: dict) -> list:
    supabase = get_supabase()
    result = supabase.rpc(function_name, params).execute()
    return result.data or []

async def insert_rows(table: str, rows: list[dict]) -> list:
    supabase = get_supabase()
    result = supabase.table(table).insert(rows).execute()
    return result.data or []

async def select_rows(table: str, filters: dict = None, limit: int = 100) -> list:
    supabase = get_supabase()
    query = supabase.table(table).select("*")
    if filters:
        for key, value in filters.items():
            query = query.eq(key, value)
    result = query.limit(limit).execute()
    return result.data or []

async def upsert_rows(table: str, rows: list[dict], on_conflict: str = "id") -> list:
    supabase = get_supabase()
    result = supabase.table(table).upsert(rows, on_conflict=on_conflict).execute()
    return result.data or []

async def delete_rows(table: str, filters: dict) -> list:
    supabase = get_supabase()
    query = supabase.table(table).delete()
    for key, value in filters.items():
        query = query.eq(key, value)
    result = query.execute()
    return result.data or []
        