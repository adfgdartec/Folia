export type LifeStage = 'foundations' | 'launch' | 'build' | 'accelerate' | 'preserve' | 'retire'
export type IncomeType = 'w2' | 'freelance' | 'mixed' | 'retired' | 'unemployed'
export type LiteracyLevel = 'beginner' | 'intermediate' | 'advanced'
export type FilingStatus = 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household'
export type DebtType = 'student' | 'credit_card' | 'mortgage' | 'auto' | 'medical' | 'personal' | 'business' | 'other'
export type AssetType = 'checking' | 'savings' | 'retirement_401k' | 'retirement_ira' | 'brokerage' | 'real_estate' | 'crypto' | 'hsa' | 'pension' | 'other'
export type DocType = 'w2' | 'pay_stub' | 'bank_statement' | 'credit_card_statement' | 'brokerage_statement' | 'financial_aid_letter' | 'tax_return' | 'insurance_policy' | 'other'
export type AlertType = 'bill_due' | 'quarterly_tax' | 'rmd_window' | 'medicare_enrollment' | 'catchup_eligible' | 'emergency_fund_low' | 'goal_behind' | 'goal_achieved' | 'debt_paid' | 'health_score_change' | 'market_alert' | 'rate_change' | 'custom'
export type AlertPriority = 'low' | 'medium' | 'high' | 'urgent'
export type SimulationType = 'fork' | 'life_event' | 'monte_carlo' | 'retirement' | 'debt_payoff' | 'tax_year' | 'home_buying' | 'fafsa'
export type GoalCategory = 'emergency_fund' | 'home_purchase' | 'retirement' | 'education' | 'vacation' | 'car' | 'wedding' | 'debt_payoff' | 'investment' | 'business' | 'giving' | 'other' | 'general'
export type EducationTrack = 'personal_finance' | 'credit_debt' | 'investing' | 'taxes' | 'career_income' | 'advanced_finance'
export type EducationStatus = 'not_started' | 'in_progress' | 'completed' | 'mastered'
export type TransactionType = 'income' | 'expense'
export type OrderSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit' | 'stop_loss'

// All Interfaces / Schemas
export interface Debt {
  id: string
  user_id?: string
  name: string
  balance: number
  interest_rate: number
  minimum_payment: number
  type: DebtType
  lender?: string
  due_day?: number
  is_paid_off?: boolean
  paid_off_at?: string
  months_to_payoff?: number
  total_interest?: number
  created_at?: string
  updated_at?: string
}

export interface Asset {
  id: string
  user_id?: string
  name: string
  value: number
  type: AssetType
  institution?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface Goal {
  id: string
  user_id?: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string
  category: GoalCategory
  priority: number
  is_achieved: boolean
  achieved_at?: string
  notes?: string
  progress_pct?: number
  months_remaining?: number
  required_monthly?: number
  on_track?: boolean
  created_at?: string
  updated_at?: string
}

export interface Transaction {
  id: string
  user_id: string
  date: string
  description: string
  amount: number
  category: string
  subcategory?: string
  type: TransactionType
  is_recurring: boolean
  recurrence?: string
  source?: string
  notes?: string
  created_at?: string
}

export interface RecurringBill {
  id: string
  user_id: string
  name: string
  amount: number
  category: string
  due_day: number
  frequency: string
  is_active: boolean
  autopay: boolean
  next_due_date?: string
  monthly_equivalent?: number
}

export interface FinancialMetadata {
  user_id: string
  age: number
  life_stage: LifeStage
  annual_income: number
  income_type: IncomeType
  filing_status: FilingStatus
  state?: string
  monthly_expenses: number
  emergency_fund_months: number
  literacy_level: LiteracyLevel
  goals: Goal[]
  debts?: Debt[]
  assets?: Asset[]
}


export interface NetWorthSnapshot {
  snapshot_date: string
  total_assets: number
  total_debts: number
  net_worth: number
  breakdown?: Record<string, number>
}

export interface DashboardData {
  net_worth: NetWorthSnapshot | null
  alerts: Alert[]
  goals: Goal[]
  health_score: { total_score: number; scored_at: string } | null
  debts: Debt[]
}

export interface HealthScoreResult {
  total_score: number
  emergency_fund_score: number
  debt_to_income_score: number
  savings_rate_score: number
  trajectory_score: number
  improvements: string[]
  summary: string
}

export interface Alert {
  id: string
  user_id: string
  type: AlertType
  title: string
  message: string
  action_url?: string
  priority: AlertPriority
  is_read: boolean
  is_dismissed: boolean
  expires_at?: string
  created_at: string
}

export interface TimelinePoint {
  year: number
  net_worth: number
  p10?: number
  p50?: number
  p90?: number
}

export interface ScenarioParams {
  label: string
  monthly_savings_delta?: number
  extra_debt_payment?: number
  investment_return_pct?: number
  income_change_pct?: number
  one_time_event_amount?: number
  event_year?: number
}

export interface SimulationRequest {
  metadata: FinancialMetadata
  horizon_years: number
  scenario_a: ScenarioParams
  scenario_b?: ScenarioParams
  use_monte_carlo?: boolean
  simulations?: number
}

export interface SimulationResult {
  scenario_a: TimelinePoint[]
  scenario_b?: TimelinePoint[]
  divergence_at_horizon?: number
  narration: string
  debt_free_year_a?: number
  debt_free_year_b?: number
  total_interest_a: number
  total_interest_b: number
}

export interface TaxResult {
  gross_income: number
  agi: number
  taxable_income: number
  federal_tax: number
  state_tax: number
  fica_tax: number
  se_tax: number
  total_tax: number
  effective_rate: number
  marginal_rate: number
  estimated_refund_or_owed: number
  quarterly_payments?: { quarter: string; due: string; amount: number }[]
  bracket_breakdown: { rate: number; bracket_floor: number; bracket_ceil: number; taxable_amount: number; tax: number }[]
  narration?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  citations?: Citation[]
  timestamp?: string
}

export interface Citation {
  source: string
  excerpt: string
  similarity?: number
}

export interface AdvisorSession {
  id: string
  user_id: string
  title?: string
  message_count: number
  created_at: string
  updated_at: string
}


export interface StockData {
  ticker: string
  company_name: string
  current_price: number
  change_pct: number
  market_cap?: number
  pe_ratio?: number
  eps?: number
  revenue?: number
  debt_to_equity?: number
  dividend_yield?: number
  week_52_high?: number
  week_52_low?: number
  ai_summary: string
}

export interface PaperPortfolio {
  id: string
  user_id: string
  cash_balance: number
  total_value: number
  inception_date: string
  created_at: string
  updated_at: string
}

export interface PaperHolding {
  id: string
  portfolio_id: string
  ticker: string
  shares: number
  avg_cost: number
  current_price?: number
  market_value?: number
  unrealized_pnl?: number
  pnl_pct?: number
}

export interface PaperTrade {
  id: string
  portfolio_id: string
  ticker: string
  order_type: OrderType
  side: OrderSide
  shares: number
  price: number
  total_value: number
  status: string
  reasoning?: string
  created_at: string
}

export interface EducationProgress {
  id: string
  user_id: string
  track: EducationTrack
  concept_id: string
  concept_title: string
  status: EducationStatus
  quiz_score?: number
  attempts: number
  first_seen_at?: string
  last_seen_at?: string
  next_review_at?: string
}

export interface MacroIndicator {
  key: string
  label: string
  value: number | null
  date: string | null
  change: number | null
}

export interface TreasuryYields {
  '3_month': number | null
  '2_year': number | null
  '10_year': number | null
  '30_year': number | null
}

export interface DocumentResult {
  doc_type: DocType
  extracted_data: Record<string, unknown>
  insights: string[]
  action_items: string[]
  ai_summary: string
}

export interface JournalEntry {
  id: string
  user_id: string
  simulation_id?: string
  decision: string
  reasoning?: string
  predicted_outcome?: string
  actual_outcome?: string
  outcome_logged_at?: string
  decision_date: string
  created_at: string
  updated_at: string
}

export interface CommunityScenario {
  id: string
  life_stage: LifeStage
  age_bucket: string
  income_bucket: string
  simulation_type: SimulationType
  scenario_data: Record<string, unknown>
  outcome_data: Record<string, unknown>
  upvotes: number
  is_template: boolean
  template_title?: string
  template_desc?: string
  created_at: string
}

export interface BudgetAnalysis {
  total_income: number
  total_expenses: number
  surplus_deficit: number
  savings_rate: number
  top_expense_categories: { category: string; amount: number }[]
  spending_by_category: Record<string, number>
  month_over_month_change: number
  ai_insights: string[]
}

export interface BudgetPlan {
  id: string
  user_id: string
  month: string
  category: string
  budgeted: number
}

export interface GlossaryEntry {
  term: string
  definition: string
  example: string
  related_terms: string[]
  source: string
}

export interface DebtStrategy {
  months_to_payoff: number
  total_interest: number
  order: string[]
  description: string
}

export interface DebtStrategiesResult {
  avalanche: DebtStrategy
  snowball: DebtStrategy
  interest_savings_with_avalanche: number
  time_savings_months: number
  extra_payment_applied: number
}

export interface UserProfile {
  id: string
  email?: string
  display_name?: string
  avatar_url?: string
  onboarding_done: boolean
  created_at: string
  updated_at: string
}