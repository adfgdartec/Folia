from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from models.schemas import DocumentResult, DocType, FinancialDNA
from core.clients import gemini_model
from core.database import insert_rows
from rag.embedder import embed_batch, chunk_text
import json
import base64
import uuid

router = APIRouter()

DOC_PROMPTS = {
    DocType.w2: """Extract all data from this W-2 tax form. Return ONLY valid JSON:
{
  "employer_name": "",
  "employer_ein": "",
  "employee_name": "",
  "employee_ssn_last4": "",
  "box1_wages": 0,
  "box2_federal_withheld": 0,
  "box3_ss_wages": 0,
  "box4_ss_withheld": 0,
  "box5_medicare_wages": 0,
  "box6_medicare_withheld": 0,
  "box12_codes": [],
  "box16_state_wages": 0,
  "box17_state_tax": 0,
  "state": ""
}""",

    DocType.pay_stub: """Extract all data from this pay stub. Return ONLY valid JSON:
{
  "pay_period_start": "",
  "pay_period_end": "",
  "pay_date": "",
  "gross_pay": 0,
  "federal_tax_withheld": 0,
  "state_tax_withheld": 0,
  "social_security_withheld": 0,
  "medicare_withheld": 0,
  "health_insurance": 0,
  "retirement_401k": 0,
  "other_deductions": 0,
  "net_pay": 0,
  "ytd_gross": 0,
  "ytd_federal_tax": 0,
  "employer_name": ""
}""",

    DocType.bank_statement: """Extract all transactions from this bank statement. Return ONLY valid JSON:
{
  "account_holder": "",
  "account_last4": "",
  "statement_period_start": "",
  "statement_period_end": "",
  "opening_balance": 0,
  "closing_balance": 0,
  "total_credits": 0,
  "total_debits": 0,
  "transactions": [
    {"date": "", "description": "", "amount": 0, "type": "credit|debit", "balance": 0}
  ]
}""",

    DocType.credit_card_statement: """Extract all data from this credit card statement. Return ONLY valid JSON:
{
  "card_holder": "",
  "card_last4": "",
  "statement_date": "",
  "payment_due_date": "",
  "previous_balance": 0,
  "payments_credits": 0,
  "purchases": 0,
  "fees": 0,
  "interest_charged": 0,
  "new_balance": 0,
  "minimum_payment": 0,
  "credit_limit": 0,
  "apr": 0,
  "transactions": [
    {"date": "", "description": "", "amount": 0, "category": ""}
  ]
}""",

    DocType.financial_aid_letter: """Extract all data from this financial aid award letter. Return ONLY valid JSON:
{
  "school_name": "",
  "academic_year": "",
  "student_name": "",
  "cost_of_attendance": 0,
  "tuition_fees": 0,
  "room_board": 0,
  "books_supplies": 0,
  "other_costs": 0,
  "pell_grant": 0,
  "institutional_grant": 0,
  "scholarship": 0,
  "work_study": 0,
  "subsidized_loan": 0,
  "unsubsidized_loan": 0,
  "parent_plus_loan": 0,
  "total_aid": 0,
  "net_cost": 0
}""",

    DocType.brokerage_statement: """Extract all data from this brokerage statement. Return ONLY valid JSON:
{
  "account_holder": "",
  "account_last4": "",
  "statement_date": "",
  "total_value": 0,
  "cash_balance": 0,
  "holdings": [
    {"symbol": "", "shares": 0, "price": 0, "value": 0, "cost_basis": 0, "gain_loss": 0}
  ],
  "realized_gains_short_term": 0,
  "realized_gains_long_term": 0,
  "dividends_received": 0
}""",
}

DEFAULT_PROMPT = """Extract all financial data from this document. Return ONLY valid JSON with the key financial figures."""

def _generate_insights(doc_type: DocType, data: dict) -> tuple[list[str], list[str]]:
    insights = []
    actions = []
    
    if doc_type == DocType.w2:
        gross = data.get("box1_wages", 0)
        withheld = data.get("box2_federal_withheld", 0)
        if gross > 0:
            eff_rate = withheld / gross * 100
            insights.append(f"Effective withholding rate: {eff_rate:.1f}%")
            if eff_rate < 10 and gross > 20000:
                actions.append("Consider adjusting your W-4 — you may owe taxes in April.")
            elif eff_rate < 25:
                actions.append("You may be over-withholding. Adjust W-4 to keep more take-home pay.")
        ret = data.get("box12_codes", [])
        if not any("D" in str(c) for c in ret):
            actions.append("No 401k contributions found. Consider enrolling in your employer's plan.")
        
    elif doc_type == DocType.pay_stub:
        gross = data.get("gross_pay", 0)
        net = data.get("net_pay", 0)
        ret = data.get("retirement_401k", 0)
        if gross > 0:
            take_home_rate = net / gross * 100
            insights.append(f"Take-home pay is {take_home_rate:.0f}% of gross pay.")
        if ret == 0:
            actions.append("No 401k deduction detected. Check if your employer offers a match.")
    
    elif doc_type == DocType.credit_card_statement:
        balance = data.get("new_balance", 0)
        apr = data.get("apr", 0)
        if balance > 0 and apr > 0:
            monthly_interest = balance * (apr / 100 / 12)
            insights.append(f"At {apr:.1f}% APR, you're paying ~${monthly_interest:.0f}/month in interest.")
            actions.append(f"Paying off this ${balance:,.0f} balance saves ${monthly_interest * 12:,.0f}/year in interest.")
    
    elif doc_type == DocType.financial_aid_letter:
        net_cost = data.get("net_cost", 0)
        loans = (data.get("subsidized_loan", 0) + data.get("unsubsidized_loan", 0))
        if loans > 0:
            ten_year_cost = loans * 1.35
            insights.append(f"${loans:,.0f} in loans will cost approximately ${ten_year_cost:,.0f} over 10 years.")
            actions.append("Review income-driven repayment options before accepting loans.")
    
    elif doc_type == DocType.brokerage_statement:
        st_gains = data.get("realized_gains_short_term", 0)
        lt_gains = data.get("realized_gains_long_term", 0)
        if st_gains > 0:
            insights.append(f"${st_gains:,.0f} in short-term gains will be taxed as ordinary income.")
        if lt_gains > 0:
            insights.append(f"${lt_gains:,.0f} in long-term gains qualify for lower capital gains rates.")

    return insights, actions

@router.post("", response_model=DocumentResult)
async def analyze_document(file: UploadFile = File(...), doc_type: str = Form(default="other"),user_id: str = Form(default=""),):
    if not file.content_type or not (file.content_type.startswith("image/") or file.content_type == "application/pdf"):
        raise HTTPException(status_code=400, detail="File must be an image (PNG, JPEG) or PDF.")
    
    try:
        dtype = DocType(doc_type)
    except ValueError:
        dtype = DocType.other
    
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    b64_data = base64.b64encode(contents).decode("utf-8")
    mime_type = file.content_type

    prompt = DOC_PROMPTS.get(dtype, DEFAULT_PROMPT)
    
    try:
        response = gemini_model.generate_content([
            {"mime_type": mime_type, "data": b64_data},
            prompt,
        ])
        raw_text = response.text.strip()
        raw_text = raw_text.replace("```json", "").replace("```", "").strip()
        extracted_data = json.loads(raw_text)
    except json.JSONDecodeError:
        extracted_data = {"raw_text": response.text[:2000]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document parsing failed: {str(e)}")
    
    insights, actions = _generate_insights(dtype, extracted_data)
    
    if user_id:
        try:
            doc_text = json.dumps(extracted_data)
            chunks = chunk_text(doc_text, chunk_size=256)
            embeddings = await embed_batch(chunks)
            rows = [{
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "content": chunk,
                "metadata": {"doc_type": dtype.value, "filename": file.filename or ""},
                "doc_type": dtype.value,
                "embedding": emb,
            } for chunk, emb in zip(chunks, embeddings)]
            await insert_rows("user_documents", rows)
        except Exception:
            pass
    
    try:
        summary_prompt = (
            f"In 2 sentences, summarize the key financial takeaway from this {dtype.value} document: "
            f"{json.dumps(extracted_data)[:1000]}"
        )
        summary_resp = gemini_model.generate_content(summary_prompt)
        ai_summary = summary_resp.text.strip()
    except Exception:
        ai_summary = f"Document processed successfully. {len(insights)} insight(s) found."

    return DocumentResult(
        doc_type=dtype,
        extracted_data=extracted_data,
        insights=insights,
        action_items=actions,
        ai_summary=ai_summary,
    )
    