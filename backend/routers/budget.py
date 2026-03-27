from fastapi import APIRouter
from pydantic import BaseModel
from models.schemas import BudgetAnalysis, Transaction, FinancialMetadata
from core.clients import groq_client
from core.config import get_settings
from collections import defaultdict
import json

router = APIRouter()
settings = get_settings()


class BudgetRequest(BaseModel):
    transactions: list[Transaction]
    metadata: FinancialMetadata
    previous_month_expenses: float = 0.0


def _analyze_transactions(transactions: list[Transaction]) -> dict:
    income = sum(t.amount for t in transactions if t.type == "income")
    expenses = sum(t.amount for t in transactions if t.type == "expense")
    surplus = income - expenses
    savings_rate = (surplus / income * 100) if income > 0 else 0.0
    by_category: dict[str, float] = defaultdict(float)
    
    for t in transactions:
        if t.type == "expense":
            by_category[t.category] += t.amount
            
    top_categories = sorted([{"category": k, "amount": round(v, 2)} for k, v in by_category.items()], key=lambda x: x["amount"], reverse=True)
    
    return {
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "surplus": round(surplus, 2),
        "savings_rate": round(savings_rate, 1),
        "by_category": dict(by_category),
        "top_categories": top_categories, 
    }

@router.post("", response_model=BudgetAnalysis)
async def analyze_budget(req: BudgetRequest):
    analysis = _analyze_transactions(req.transactions)
    mom_change = 0.0
    
    if req.previous_month_expenses > 0:
        mom_change = ((analysis["expenses"] - req.previous_month_expenses) / req.previous_month_expenses * 100)
        
        # Gives AI Insights from Groq
        ai_insights = []
        try:
            top_str = ", ".join(f"{c['category']} (${c['amount']:,.0f})" for c in analysis["top_categories"])
            context = (
                f"Monthly income: ${analysis['income']:,.0f}. "
                f"Monthly expenses: ${analysis['expenses']:,.0f}. "
                f"Surplus: ${analysis['surplus']:,.0f}. "
                f"Savings rate: {analysis['savings_rate']:.1f}%. "
                f"Top spending: {top_str}. "
                f"Month-over-month expense change: {mom_change:+.1f}%." 
            )
            response = await groq_client.chat.completions.create(
                model=settings.narration_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a budget coach. Give exactly 3 brief, specific insights "
                            "about this budget. Each insight is one sentence with a number. "
                            f"User age: {req.metadata.age}, literacy: {req.metadata.literacy_level.value}. "
                            "Return as a JSON array of 3 strings."
                        ),
                    }, 
                    {"role": "user", "content": context},
                ],
                temperature=0.4,
                max_tokens=300,
                response_format={"type": "json_object"}
            )
            raw = json.loads(response.choices[0].message.content or "[]")
            if isinstance(raw, list):
                ai_insights = raw[:3]
            elif isinstance(raw, dict):
                ai_insights = list(raw.values())[:3]
        
        except Exception:
            ai_insights = [f"Your top spending category is {analysis['top_categories'][0]['category'] if analysis['top_categories'] else 'unknown'}.", f"Current savings rate: {analysis['savings_rate']:.1f}%.",]
        
        
        return BudgetAnalysis(
            total_income=analysis["income"],
            total_expenses=analysis["expenses"],
            surplus_deficit=analysis["surplus"],
            savings_rate=analysis["savings_rate"],
            top_expense_categories=analysis["top_categories"],
            spending_by_category={k: round(v, 2) for k, v in analysis["by_category"].items()},
            month_over_month_change=round(mom_change, 1),
            ai_insights=ai_insights,
        )