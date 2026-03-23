import json
from models.schemas import FinancialMetadata, ChatMessage, LiteracyLevel

LITERACY_INSTRUCTIONS = {
    LiteracyLevel.beginner: (
        "Use simple everyday language. Avoid jargon. "
        "If you must use a financial term, define it immediately. "
        "Keep sentences short. Use analogies."
    ),
    LiteracyLevel.intermediate: (
        "Use standard financial terminology with brief explanations. "
        "Assume the user understands basic concepts like compound interest, "
        "tax brackets, and budgeting."
    ),
    LiteracyLevel.advanced: (
        "Use precise financial and technical language. "
        "The user understands concepts like WACC, DCF, tax-loss harvesting, "
        "Roth conversions, and portfolio theory. Be concise and detailed."
    ),
}

SYSTEM_BASE = """You are Folia's AI financial advisor — a knowledgeable, empathetic guide helping users at every life stage make better financial decisions.

CORE RULES:
1. Answer ONLY using the provided knowledge base context. Never fabricate facts.
2. Always cite your source inline like: [IRS Publication 17] or [CFPB Guide].
3. If the answer is not in the context, say: "I don't have a verified source for that — I recommend consulting a licensed financial advisor."
4. Personalize every answer to the user's specific financial situation.
5. Never give specific investment advice (e.g., "buy this stock"). Educate instead.
6. Always end with one clear, actionable next step.
7. Disclaimer: append "Educational purposes only — not personalized financial advice." at the end.

LANGUAGE CALIBRATION: {literacy_instruction}
"""

def build_advisor_prompt(
    query: str,
    chunks: list[dict],
    metadata: FinancialMetadata,
    history: list[ChatMessage]
) -> list[dict]:
    literacy_instruction = LITERACY_INSTRUCTIONS.get(
        metadata.literacy_level,
        LITERACY_INSTRUCTIONS[LiteracyLevel.beginner]
    )

    context_parts = []
    for c in chunks:
        source = c.get("source", "Unknown source")
        content = c.get("content", "")
        context_parts.append(f"[{source}]\n{content}")
    context = "\n\n---\n\n".join(context_parts)

    dna_summary = {
        "age": metadata.age,
        "life_stage": metadata.life_stage.value,
        "annual_income": f"${metadata.annual_income:,.0f}",
        "income_type": metadata.income_type.value,
        "filing_status": metadata.filing_status.value,
        "state": metadata.state,
        "total_debt": f"${sum(d.balance for d in metadata.debts):,.0f}",
        "total_assets": f"${sum(a.value for a in metadata.assets):,.0f}",
        "net_worth": f"${sum(a.value for a in metadata.assets) - sum(d.balance for d in metadata.debts):,.0f}",
        "monthly_expenses": f"${metadata.monthly_expenses:,.0f}",
        "emergency_fund_months": metadata.emergency_fund_months,
        "goals": [{"name": g.name, "target": f"${g.target_amount:,.0f}"} for g in metadata.goals],
        "literacy_level": metadata.literacy_level.value,
    }

    system_content = SYSTEM_BASE.format(
        literacy_instruction=literacy_instruction
    )

    system_content += f"\n\nUSER FINANCIAL PROFILE:\n{json.dumps(dna_summary, indent=2)}"
    system_content += f"\n\nKNOWLEDGE BASE:\n{context}"

    messages = [{"role": "system", "content": system_content}]

    for msg in history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": query})
    return messages


def build_narration_prompt(
    context: str,
    metadata: FinancialMetadata,
    narration_type: str
) -> list[dict]:
    type_instructions = {
        "simulation": "Explain the simulation result in 2-3 sentences. Focus on the most important number and what it means for this person's life.",
        "tax": "Summarize the tax situation in 2-3 sentences. Highlight the biggest opportunity to reduce taxes.",
        "health_score": "Describe the financial health score result. Be encouraging but honest. Identify the single biggest lever for improvement.",
        "goal_progress": "Comment on progress toward goals. Be motivating. Name one specific action to accelerate progress.",
        "debt_payoff": "Explain the debt payoff analysis. Highlight the total interest saved and the time difference between strategies.",
        "document": "Summarize the key findings from this financial document. Flag anything the user should act on immediately.",
    }

    instruction = type_instructions.get(narration_type, type_instructions["simulation"])

    literacy_instruction = LITERACY_INSTRUCTIONS.get(
        metadata.literacy_level,
        LITERACY_INSTRUCTIONS[LiteracyLevel.beginner]
    )

    return [
        {
            "role": "system",
            "content": (
                f"You are a concise financial narrator. {instruction} "
                f"Language level: {literacy_instruction} "
                f"User age: {metadata.age}, income: ${metadata.annual_income:,.0f}/yr, "
                f"stage: {metadata.life_stage.value}. "
                "Never give investment advice. Be specific with numbers."
            )
        },
        {
            "role": "user",
            "content": f"Narrate this financial data:\n\n{context}"
        }
    ]