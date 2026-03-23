from openai import AsyncOpenAI
from groq import AsyncGroq
import google.generativeai as genai
from core.config import get_settings

settings = get_settings()

# All Clients
openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
groq_client = AsyncGroq(api_key=settings.groq_api_key)
genai.configure(api_key=settings.gemini_api_key)
gemini_model = genai.GenerativeModel(settings.document_model)
