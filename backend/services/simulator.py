import random
import math
from models.schemas import (
    SimulationRequest, SimulationResult,
    TimelinePoint, ScenarioParams, FinancialMetadata
)

MARKET_MEAN = 0.102
MARKET_STD = 0.173
INFLATION = 0.030


def _net_worth(metadata: FinancialMetadata) -> float:
    assets = sum(a.value for a in metadata.assets)
    debts  = sum(d.balance for d in metadata.debts)
    return assets - debts


def _total_monthly_debt_payment(metadata: FinancialMetadata) -> float:
    return sum(d.minimum_payment for d in metadata.debts)


def _simulate_single(metadata: FinancialMetadata, params: ScenarioParams, horizon_years: int, annual_return: float = MARKET_MEAN,) -> tuple[list[TimelinePoint], float, int | None]:
    monthly_return = annual_return / 12
    current_nw = _net_worth(metadata)
    monthly_income = (metadata.annual_income / 12) * (1 + params.income_change_pct / 100)
    monthly_expenses = metadata.monthly_expenses
    min_debt_payment = _total_monthly_debt_payment(metadata)
    extra_debt = params.extra_debt_payment
    extra_savings = params.monthly_savings_delta

    # Mutable debt balances
    debts = [{"balance": d.balance, "rate": d.interest_rate / 100 / 12, "min": d.minimum_payment}
             for d in metadata.debts]
    investment_balance = sum(
        a.value for a in metadata.assets
        if a.type.value in ("brokerage", "retirement_401k", "retirement_ira")
    )
    cash_balance = sum(
        a.value for a in metadata.assets
        if a.type.value in ("checking", "savings")
    )

    total_interest = 0.0
    debt_free_year = None
    timeline       = []

    for month in range(1, horizon_years * 12 + 1):
        year = month // 12 or 1

        if year == params.event_year and month == params.event_year * 12:
            cash_balance += params.one_time_event_amount

        debt_payment_this_month = 0.0
        still_has_debt = False
        for debt in debts:
            if debt["balance"] <= 0:
                continue
            still_has_debt = True
            interest          = debt["balance"] * debt["rate"]
            total_interest   += interest
            payment           = min(debt["balance"] + interest, debt["min"] + extra_debt)
            debt["balance"]   = max(0, debt["balance"] + interest - payment)
            debt_payment_this_month += payment

        if not still_has_debt and debt_free_year is None:
            debt_free_year = year

        investment_balance *= (1 + monthly_return)


        net_flow = monthly_income - monthly_expenses - debt_payment_this_month + extra_savings
        cash_balance += net_flow

        if cash_balance > monthly_expenses * 6:
            surplus              = cash_balance - monthly_expenses * 6
            investment_balance  += surplus
            cash_balance        -= surplus

        if month % 12 == 0:
            total_debt = sum(max(0, d["balance"]) for d in debts)
            nw = cash_balance + investment_balance - total_debt
            timeline.append(TimelinePoint(year=year, net_worth=round(nw, 2)))

    return timeline, round(total_interest, 2), debt_free_year


def _monte_carlo( metadata: FinancialMetadata, params: ScenarioParams, horizon_years: int, n_simulations: int,) -> list[TimelinePoint]:
    all_paths: list[list[float]] = []

    for _ in range(n_simulations):
        path_nw = []
        monthly_income = (metadata.annual_income / 12) * (1 + params.income_change_pct / 100)
        monthly_expenses = metadata.monthly_expenses
        extra_savings = params.monthly_savings_delta
        extra_debt = params.extra_debt_payment

        debts = [{"balance": d.balance, "rate": d.interest_rate / 100 / 12, "min": d.minimum_payment}
                 for d in metadata.debts]
        invest_bal = sum(
            a.value for a in metadata.assets
            if a.type.value in ("brokerage", "retirement_401k", "retirement_ira")
        )
        cash_bal = sum(
            a.value for a in metadata.assets
            if a.type.value in ("checking", "savings")
        )

        for month in range(1, horizon_years * 12 + 1):
            annual_r  = random.gauss(MARKET_MEAN, MARKET_STD)
            monthly_r = (1 + annual_r) ** (1 / 12) - 1
            invest_bal = max(0, invest_bal * (1 + monthly_r))

            for debt in debts:
                if debt["balance"] <= 0:
                    continue
                interest = debt["balance"] * debt["rate"]
                payment = min(debt["balance"] + interest, debt["min"] + extra_debt)
                debt["balance"] = max(0, debt["balance"] + interest - payment)

            net_flow = monthly_income - monthly_expenses + extra_savings
            cash_bal += net_flow
            if cash_bal > monthly_expenses * 6:
                surplus = cash_bal - monthly_expenses * 6
                invest_bal += surplus
                cash_bal -= surplus

            if month % 12 == 0:
                total_debt = sum(max(0, d["balance"]) for d in debts)
                nw = cash_bal + invest_bal - total_debt
                path_nw.append(nw)

        all_paths.append(path_nw)

    timeline = []
    for year_idx in range(horizon_years):
        values = sorted(p[year_idx] for p in all_paths if year_idx < len(p))
        if not values:
            continue
        n   = len(values)
        p10 = values[max(0, int(n * 0.10) - 1)]
        p50 = values[max(0, int(n * 0.50) - 1)]
        p90 = values[max(0, int(n * 0.90) - 1)]
        timeline.append(TimelinePoint(
            year = year_idx + 1,
            net_worth = round(p50, 2),
            p10 = round(p10, 2),
            p50 = round(p50, 2),
            p90 = round(p90, 2),
        ))

    return timeline


def run_simulation(req: SimulationRequest) -> SimulationResult:
    if req.use_monte_carlo:
        timeline_a = _monte_carlo(req.metadata, req.scenario_a, req.horizon_years, req.simulations)
        total_interest_a = 0.0
        debt_free_a      = None
        _, total_interest_a, debt_free_a = _simulate_single(req.metadata, req.scenario_a, req.horizon_years)

        timeline_b = None
        total_interest_b = 0.0
        debt_free_b      = None
        if req.scenario_b:
            timeline_b = _monte_carlo(req.metadata, req.scenario_b, req.horizon_years, req.simulations)
            _, total_interest_b, debt_free_b = _simulate_single(req.metadata, req.scenario_b, req.horizon_years)
    else:
        timeline_a, total_interest_a, debt_free_a = _simulate_single(req.metadata, req.scenario_a, req.horizon_years)
        timeline_b, total_interest_b, debt_free_b = None, 0.0, None
        if req.scenario_b:
            timeline_b, total_interest_b, debt_free_b = _simulate_single(req.metadata, req.scenario_b, req.horizon_years)

    divergence = None
    if timeline_b and timeline_a:
        nw_a = timeline_a[-1].net_worth
        nw_b = timeline_b[-1].net_worth
        divergence = round(abs(nw_a - nw_b), 2)

    return SimulationResult(
        scenario_a = timeline_a,
        scenario_b = timeline_b,
        divergence_at_horizon = divergence,
        debt_free_year_a = debt_free_a,
        debt_free_year_b = debt_free_b,
        total_interest_a = total_interest_a,
        total_interest_b = total_interest_b,
    )
