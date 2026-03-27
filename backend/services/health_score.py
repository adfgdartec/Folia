from models.schemas import FinancialMetadata, HealthScoreResult


def compute_health_score(metadata: FinancialMetadata) -> HealthScoreResult:
    improvements = []
    months = metadata.emergency_fund_months
    if months >= 6:
        ef_score = 25.0
    elif months >= 3:
        ef_score = 15.0 + (months - 3) / 3 * 10
    elif months >= 1:
        ef_score = 5.0 + (months - 1) / 2 * 10
    else:
        ef_score = 0.0

    if months < 3:
        monthly_gap = (3 - months) * (metadata.monthly_expenses or 1)
        improvements.append(
            f"Build your emergency fund to 3 months (${monthly_gap:,.0f} needed). "
            "Open a high-yield savings account and automate $50–$200/month."
        )

    monthly_income = metadata.annual_income / 12 if metadata.annual_income > 0 else 1
    total_min_payments = sum(d.minimum_payment for d in metadata.debts)
    dti = total_min_payments / monthly_income if monthly_income > 0 else 1.0

    if dti <= 0.10:
        dti_score = 25.0
    elif dti <= 0.20:
        dti_score = 20.0
    elif dti <= 0.36:
        dti_score = 10.0 + (0.36 - dti) / 0.16 * 10
    else:
        dti_score = 0.0

    if dti > 0.20:
        improvements.append(
            f"Your debt payments are {dti*100:.0f}% of monthly income. "
            "Target under 20%. Focus extra payments on your highest-interest debt first."
        )

    monthly_expenses = metadata.monthly_expenses or (metadata.annual_income / 12 * 0.7)
    net_monthly      = monthly_income - monthly_expenses - total_min_payments
    savings_rate     = max(0, net_monthly / monthly_income) if monthly_income > 0 else 0

    if savings_rate >= 0.20:
        sr_score = 25.0
    elif savings_rate >= 0.10:
        sr_score = 15.0 + (savings_rate - 0.10) / 0.10 * 10
    elif savings_rate >= 0.05:
        sr_score = 5.0 + (savings_rate - 0.05) / 0.05 * 10
    else:
        sr_score = max(0, savings_rate / 0.05 * 5)

    if savings_rate < 0.10:
        improvements.append(
            f"You're saving approximately {savings_rate*100:.0f}% of income. "
            "Aim for 10–15%. Start by automating 1% more per month."
        )
        
    net_worth = sum(a.value for a in metadata.assets) - sum(d.balance for d in metadata.debts)
    age_target = metadata.age * metadata.annual_income * 0.1  # simplified benchmark

    if age_target <= 0:
        traj_score = 12.5
    else:
        ratio = net_worth / age_target
        traj_score = min(25.0, ratio * 25.0)

    if net_worth < 0:
        improvements.append(
            "Your net worth is negative. Focus on eliminating high-interest debt "
            "before investing — that's your best guaranteed return."
        )
    elif traj_score < 15:
        improvements.append(
            "Your savings trajectory needs acceleration. "
            "If your employer offers a 401k match, contribute enough to get the full match — "
            "that's an immediate 50–100% return."
        )

    total = round(ef_score + dti_score + sr_score + traj_score, 1)
    total = min(100.0, max(0.0, total))

    grade = (
        "Excellent" if total >= 85 else
        "Good" if total >= 70 else
        "Fair" if total >= 50 else
        "Needs work"
    )

    summary = (
        f"Financial Health Score: {total}/100 ({grade}). "
        f"Emergency fund: {months:.1f} months | "
        f"DTI: {dti*100:.0f}% | "
        f"Savings rate: {savings_rate*100:.0f}% | "
        f"Net worth: ${net_worth:,.0f}."
    )

    return HealthScoreResult(
        total_score = total,
        emergency_fund_score = round(ef_score, 1),
        debt_to_income_score = round(dti_score, 1),
        savings_rate_score = round(sr_score, 1),
        trajectory_score = round(traj_score, 1),
        improvements = improvements[:3],
        summary = summary,
    )
