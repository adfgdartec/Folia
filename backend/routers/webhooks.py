

from fastapi import APIRouter, Request, HTTPException, Header
from core.auth import verify_clerk_webhook
from core.database import get_supabase
from services.email import send_welcome_email
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/clerk")
async def clerk_webhook(
    request: Request,
    svix_id:        str = Header(None, alias="svix-id"),
    svix_timestamp: str = Header(None, alias="svix-timestamp"),
    svix_signature: str = Header(None, alias="svix-signature"),
):
    if not svix_id or not svix_signature:
        raise HTTPException(status_code=400, detail="Missing svix headers")

    payload = await request.body()

    try:
        event = verify_clerk_webhook(payload, svix_id, svix_timestamp, svix_signature)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    event_type: str = event.get("type", "")
    data: dict     = event.get("data", {})

    logger.info("Clerk webhook: %s", event_type)

    sb = get_supabase()
    
    if event_type == "user.created":
        user_id    = data.get("id", "")
        email_objs = data.get("email_addresses", [])
        primary_id = data.get("primary_email_address_id")

        email = next(
            (e["email_address"] for e in email_objs if e["id"] == primary_id),
            email_objs[0]["email_address"] if email_objs else "",
        )
        first  = data.get("first_name", "") or ""
        last   = data.get("last_name",  "") or ""
        name   = f"{first} {last}".strip() or email.split("@")[0]
        avatar = data.get("image_url", "")

        # Upsert into profiles table
        sb.table("profiles").upsert({
            "id":           user_id,
            "email":        email,
            "display_name": name,
            "avatar_url":   avatar,
            "onboarding_done": False,
        }, on_conflict="id").execute()

        logger.info("Created profile for Clerk user %s (%s)", user_id, email)


        try:
            await send_welcome_email(
                to_email=email,
                user_name=name or "there",
                life_stage="launch",  # default until onboarding
            )
        except Exception as e:
            logger.warning("Welcome email failed: %s", e)

    elif event_type == "user.updated":
        user_id    = data.get("id", "")
        email_objs = data.get("email_addresses", [])
        primary_id = data.get("primary_email_address_id")

        email = next(
            (e["email_address"] for e in email_objs if e["id"] == primary_id),
            None,
        )
        first  = data.get("first_name", "") or ""
        last   = data.get("last_name",  "") or ""
        name   = f"{first} {last}".strip()
        avatar = data.get("image_url", "")

        updates = {}
        if email:   updates["email"]        = email
        if name:    updates["display_name"] = name
        if avatar:  updates["avatar_url"]   = avatar

        if updates:
            sb.table("profiles").update(updates).eq("id", user_id).execute()
            logger.info("Updated profile for Clerk user %s", user_id)

    elif event_type == "user.deleted":
        user_id = data.get("id", "")
        if user_id:
            sb.table("profiles").delete().eq("id", user_id).execute()
            logger.info("Deleted profile for Clerk user %s", user_id)
            
            try:
                from services.vector_store import delete_user_docs
                await delete_user_docs(user_id)
            except Exception as e:
                logger.warning("Pinecone user namespace cleanup failed: %s", e)

    return {"received": True, "event": event_type}
