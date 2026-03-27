from models.schemas import TaxRequest, TaxResult, FilingStatus, IncomeType
# ─── 2024 IRS Tax Brackets ─────────────────────────────────────────────────────
BRACKETS_2024 = {
    FilingStatus.single: [
        (11600, 0.10),
        (47150, 0.12),
        (100525, 0.22),
        (191950, 0.24),
        (243725, 0.32),
        (609350, 0.35),
        (float("inf"), 0.37),
    ],
    FilingStatus.married_filing_jointly: [
        (23200, 0.10),
        (94300, 0.12),
        (201050, 0.22),
        (383900, 0.24),
        (487450, 0.32),
        (731200, 0.35),
        (float("inf"), 0.37),
    ],
    FilingStatus.married_filing_separately: [
        (11600,        0.10),
        (47150,        0.12),
        (100525,       0.22),
        (191950,       0.24),
        (243725,       0.32),
        (365600,       0.35),
        (float("inf"), 0.37),
    ],
    FilingStatus.head_of_household: [
        (16550, 0.10),
        (63100, 0.12),
        (100500, 0.22),
        (191950, 0.24),
        (243700, 0.32),
        (609350, 0.35),
        (float("inf"), 0.37),
    ],
}

STANDARD_DEDUCTIONS_2024 = {
    FilingStatus.single: 14600,
    FilingStatus.married_filing_jointly: 29200,
    FilingStatus.married_filing_separately: 14600,
    FilingStatus.head_of_household: 1900,
}

STATE_TAX_RATES = {
    "CA": 0.093,  "TX": 0.0,   "FL": 0.0,   "NY": 0.0685,
    "PA": 0.0307, "IL": 0.0495, "OH": 0.04,  "GA": 0.055,
    "NC": 0.0525, "MI": 0.0425, "NJ": 0.0637, "VA": 0.0575,
    "WA": 0.0,   "AZ": 0.025,  "MA": 0.05,  "CO": 0.044,
    "IN": 0.0305, "MO": 0.0495, "MD": 0.0575, "TN": 0.0,
}

SS_RATE = 0.062
SS_WAGE_BASE = 168600
MEDICARE_RATE = 0.0145
ADD_MEDICARE_RATE = 0.009
ADD_MEDICARE_SINGLE = 200000
ADD_MEDICARE_MFJ = 250000
SE_RATE = 0.153

QUARTERLY_DUE_DATES = [
    {"quarter": "Q1", "due": "April 15, 2025",   "months": [1, 2, 3]},
    {"quarter": "Q2", "due": "June 16, 2025",    "months": [4, 5, 6]},
    {"quarter": "Q3", "due": "September 15, 2025","months": [7, 8, 9]},
    {"quarter": "Q4", "due": "January 15, 2026", "months": [10, 11, 12]},
]


def _calculate_federal_tax(
    taxable_income: float,
    filing_status: FilingStatus
) -> tuple[float, float, list[dict]]:
    brackets = BRACKETS_2024.get(filing_status, BRACKETS_2024[FilingStatus.single])
    total_tax  = 0.0
    prev_limit = 0.0
    marginal   = 0.10
    breakdown  = []

    for limit, rate in brackets:
        if taxable_income <= prev_limit:
            break
        in_bracket  = min(taxable_income, limit) - prev_limit
        tax_here    = in_bracket * rate
        total_tax  += tax_here
        marginal    = rate
        breakdown.append({
            "rate":           rate,
            "bracket_floor":  round(prev_limit, 2),
            "bracket_ceil":   round(min(taxable_income, limit), 2),
            "taxable_amount": round(in_bracket, 2),
            "tax":            round(tax_here, 2),
        })
        prev_limit = limit

    return round(total_tax, 2), marginal, breakdown


def _calculate_fica(gross: float, filing_status: FilingStatus) -> float:
    ss = min(gross, SS_WAGE_BASE) * SS_RATE
    med = gross * MEDICARE_RATE
    thresh = ADD_MEDICARE_MFJ if filing_status == FilingStatus.married_filing_jointly else ADD_MEDICARE_SINGLE
    if gross > thresh:
        med += (gross - thresh) * ADD_MEDICARE_RATE
    return round(ss + med, 2)


def _calculate_se_tax(net_se: float) -> tuple[float, float]:
    subject = net_se * 0.9235
    se_tax = subject * SE_RATE
    deductible = se_tax * 0.5
    return round(se_tax, 2), round(deductible, 2)


def compute_taxes(req: TaxRequest) -> TaxResult:
    metadata = req.metadata
    gross = req.ytd_income if req.ytd_income is not None else metadata.annual_income
    is_freelance = metadata.income_type in (IncomeType.freelance, IncomeType.mixed)

    
    se_tax = se_ded = 0.0
    if is_freelance:
        net_se = max(0, gross - req.business_expenses)
        se_tax, se_ded = _calculate_se_tax(net_se)

    
    pre_agi = (
        req.retirement_contributions
        + req.hsa_contributions
        + se_ded
        + (req.business_expenses if is_freelance else 0.0)
    )
    agi = max(0.0, gross - pre_agi)

    # Standard vs itemized
    std_ded = STANDARD_DEDUCTIONS_2024.get(metadata.filing_status, 14600)
    deduction = max(std_ded, req.other_deductions)

    taxable = max(0.0, agi - deduction)

    federal_tax, marginal, breakdown = _calculate_federal_tax(taxable, metadata.filing_status)

    fica = _calculate_fica(gross, metadata.filing_status) if metadata.income_type == IncomeType.w2 else 0.0

    state_rate = STATE_TAX_RATES.get((metadata.state or "").upper(), 0.0)
    state_tax = round(agi * state_rate, 2)

    total_tax = federal_tax + state_tax + fica + se_tax
    eff_rate = (total_tax / gross * 100) if gross > 0 else 0.0
    refund_owed = (req.ytd_withholding - federal_tax - state_tax) if req.ytd_withholding is not None else 0.0

    quarterly = None
    if is_freelance:
        qpay = (federal_tax + state_tax + se_tax) / 4
        quarterly = [{**q, "amount": round(qpay, 2)} for q in QUARTERLY_DUE_DATES]

    return TaxResult(
        gross_income = round(gross, 2),
        agi = round(agi, 2),
        taxable_income = round(taxable, 2),
        federal_tax = round(federal_tax, 2),
        state_tax = round(state_tax, 2),
        fica_tax = round(fica, 2),
        se_tax = round(se_tax, 2),
        total_tax = round(total_tax, 2),
        effective_rate = round(eff_rate, 2),
        marginal_rate = round(marginal * 100, 1),
        estimated_refund_or_owed = round(refund_owed, 2),
        quarterly_payments = quarterly,
        bracket_breakdown = breakdown,
    )
