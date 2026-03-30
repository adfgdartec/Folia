from supabase import create_client, Client
from core.config import get_settings
from functools import lru_cache

settings = get_settings()

@lru_cache
def get_supabase_admin() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise EnvironmentError(
            "Supabase config missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
        )
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key
    )

def get_supabase_for_user(clerk_jwt: str) -> Client:
    client = create_client(
        settings.supabase_url,
        settings.supabase_anon_key
    )
    client.postgrest.auth(clerk_jwt)
    return client

def get_supabase() -> Client:
    return get_supabase_admin()

async def select_rows(
    table: str,
    clerk_jwt: str,
    filters: dict = None,
    limit: int = 100
) -> list:
    supabase = get_supabase_for_user(clerk_jwt)

    query = supabase.table(table).select("*")

    if filters:
        for k, v in filters.items():
            query = query.eq(k, v)

    result = query.limit(limit).execute()
    return result.data or []


async def insert_rows(
    table: str,
    rows: list[dict],
    clerk_jwt: str
) -> list:
    supabase = get_supabase_for_user(clerk_jwt)
    result = supabase.table(table).insert(rows).execute()
    return result.data or []


async def upsert_rows(
    table: str,
    rows: list[dict],
    clerk_jwt: str,
    on_conflict: str = "id"
) -> list:
    supabase = get_supabase_for_user(clerk_jwt)
    result = supabase.table(table).upsert(rows, on_conflict=on_conflict).execute()
    return result.data or []


async def delete_rows(
    table: str,
    filters: dict,
    clerk_jwt: str
) -> list:
    supabase = get_supabase_for_user(clerk_jwt)

    query = supabase.table(table).delete()
    for k, v in filters.items():
        query = query.eq(k, v)

    result = query.execute()
    return result.data or []

async def admin_insert_rows(table: str, rows: list[dict]) -> list:
    supabase = get_supabase_admin()
    return supabase.table(table).insert(rows).execute().data or []