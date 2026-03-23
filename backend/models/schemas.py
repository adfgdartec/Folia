from pydantic import BaseModel, Field
from typing import Optional, Literal, Any
from enum import Enum


class LifeStage(str, Enum):
    foundations = "foundations"
    launch = "launch"
    build = "build"
    accelerate = "accelerate"
    preserve = "preserve"
    retire = "retire"


class IncomeType(str, Enum):
    w2 = "w2"
    freelance = "freelance"
    mixed = "mixed"
    retired = "retired"
    unemployed = "unemployed"


class LiteracyLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class DebtType(str, Enum):
    student = "student"
    credit_card = "credit_card"
    mortgage = "mortgage"
    auto = "auto"
    medical = "medical"
    personal = "personal"
    other = "other"


class AssetType(str, Enum):
    checking = "checking"
    savings = "savings"
    retirement_401k = "retirement_401k"
    retirement_ira = "retirement_ira"
    brokerage = "brokerage"
    real_estate = "real_estate"
    crypto = "crypto"
    other = "other"


class FilingStatus(str, Enum):
    single = "single"
    married_filing_jointly = "married_filing_jointly"
    married_filing_separately = "married_filing_separately"
    head_of_household = "head_of_household"


class DocType(str, Enum):
    w2 = "w2"
    pay_stub = "pay_stub"
    bank_statement = "bank_statement"
    credit_card_statement = "credit_card_statement"
    brokerage_statement = "brokerage_statement"
    financial_aid_letter = "financial_aid_letter"
    tax_return = "tax_return"
    insurance_policy = "insurance_policy"
    other = "other"


class Debt(BaseModel):
    id: str
    name: str
    balance: float = Field(ge=0)
    interest_rate: float = Field(ge=0, le=100)
    minimum_payment: float = Field(ge=0)
    type: DebtType


class Asset(BaseModel):
    id: str
    name: str
    value: float = Field(ge=0)
    type: AssetType


class Goal(BaseModel):
    id: str
    name: str
    target_amount: float = Field(ge=0)
    target_date: str
    current_amount: float = Field(ge=0, default=0)
    priority: int = Field(ge=1, le=5, default=3)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class Citation(BaseModel):
    source: str
    excerpt: str
    similarity: Optional[float] = None


class FinancialMetadata(BaseModel):
    user_id: str
    age: int = Field(ge=13, le=120)
    life_stage: LifeStage
    annual_income: float = Field(ge=0)
    income_type: IncomeType
    filing_status: FilingStatus = FilingStatus.single
    state: Optional[str] = None
    debts: list[Debt] = []
    assets: list[Asset] = []
    goals: list[Goal] = []
    literacy_level: LiteracyLevel = LiteracyLevel.beginner
    has_emergency_fund: bool = False
    emergency_fund_months: float = 0.0
    monthly_expenses: float = 0.0


class AdvisorRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    metadata: FinancialMetadata
    history: list[ChatMessage] = []
    session_id: Optional[str] = None


class AdvisorResponse(BaseModel):
    content: str
    citations: list[Citation] = []
    session_id: Optional[str] = None


class TimelinePoint(BaseModel):
    year: int
    net_worth: float
    p10: Optional[float] = None
    p50: Optional[float] = None
    p90: Optional[float] = None


class ScenarioParams(BaseModel):
    label: str
    monthly_savings_delta: float = 0.0
    extra_debt_payment: float = 0.0
    investment_return_pct: float = 7.0
    income_change_pct: float = 0.0
    one_time_event_amount: float = 0.0
    event_year: int = 1


class SimulationRequest(BaseModel):
    metadata: FinancialMetadata
    horizon_years: int = Field(ge=1, le=40, default=10)
    scenario_a: ScenarioParams
    scenario_b: Optional[ScenarioParams] = None
    use_monte_carlo: bool = False
    simulations: int = Field(ge=100, le=10000, default=1000)


class SimulationResult(BaseModel):
    scenario_a: list[TimelinePoint]
    scenario_b: Optional[list[TimelinePoint]] = None
    divergence_at_horizon: Optional[float] = None
    narration: str = ""
    debt_free_year_a: Optional[int] = None
    debt_free_year_b: Optional[int] = None
    total_interest_a: float = 0.0
    total_interest_b: float = 0.0


class TaxRequest(BaseModel):
    metadata: FinancialMetadata
    ytd_income: Optional[float] = None
    ytd_withholding: Optional[float] = None
    retirement_contributions: float = 0.0
    hsa_contributions: float = 0.0
    business_expenses: float = 0.0
    other_deductions: float = 0.0
    tax_year: int = 2024


class TaxResult(BaseModel):
    gross_income: float
    agi: float
    taxable_income: float
    federal_tax: float
    state_tax: float
    fica_tax: float
    se_tax: float
    total_tax: float
    effective_rate: float
    marginal_rate: float
    estimated_refund_or_owed: float
    quarterly_payments: Optional[list[dict]] = None
    bracket_breakdown: list[dict] = []


class DocumentResult(BaseModel):
    doc_type: DocType
    extracted_data: dict[str, Any]
    insights: list[str] = []
    action_items: list[str] = []
    ai_summary: str = ""


class StockRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=10)
    include_ai_summary: bool = True
    metadata: Optional[FinancialMetadata] = None


class StockData(BaseModel):
    ticker: str
    company_name: str
    current_price: float
    change_pct: float
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    revenue: Optional[float] = None
    debt_to_equity: Optional[float] = None
    dividend_yield: Optional[float] = None
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    ai_summary: str = ""


class HealthScoreResult(BaseModel):
    total_score: float
    emergency_fund_score: float
    debt_to_income_score: float
    savings_rate_score: float
    trajectory_score: float
    improvements: list[str] = []
    summary: str = ""


class NarrationRequest(BaseModel):
    context: str
    metadata: FinancialMetadata
    narration_type: Literal[
        "simulation", "tax", "health_score",
        "goal_progress", "debt_payoff", "document"
    ] = "simulation"


class NarrationResponse(BaseModel):
    narration: str


class GlossaryRequest(BaseModel):
    term: str = Field(min_length=1, max_length=100)
    literacy_level: LiteracyLevel = LiteracyLevel.beginner
    context: Optional[str] = None


class GlossaryResponse(BaseModel):
    term: str
    definition: str
    example: str
    related_terms: list[str] = []
    source: str = ""


class Transaction(BaseModel):
    id: str
    user_id: str
    date: str
    description: str
    amount: float
    category: str
    type: Literal["income", "expense"]
    is_recurring: bool = False


class BudgetAnalysis(BaseModel):
    total_income: float
    total_expenses: float
    surplus_deficit: float
    savings_rate: float
    top_expense_categories: list[dict]
    spending_by_category: dict[str, float]
    month_over_month_change: float = 0.0
    ai_insights: list[str] = []