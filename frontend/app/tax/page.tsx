"use client";
import { useState } from "react";
import { useFoliaStore } from "@/store";
import { taxApi } from "@/lib/api/client";
import { BracketChart } from "@/components/charts";
import { formatCurrency } from "@/lib/utils";
import type { TaxResult } from "@/types";
import {
  IRS_LIMITS,
  ROTH_PHASEOUT_2024,
  STANDARD_DEDUCTIONS_2024,
} from "@/lib/constants";

type TaxTab = "calculator" | "brackets" | "strategies" | "reference";

export default function TaxPage() {
  const metadata = useFoliaStore((s) => s.metadata);
  const [tab, setTab] = useState<TaxTab>("calculator");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        maxWidth: 1080,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--t1)",
            letterSpacing: "-0.03em",
          }}
        >
          Tax
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--t3)", marginTop: 4 }}>
          2024 IRS brackets · Federal + state + FICA · Quarterly estimates ·
          Contribution limits
        </p>
      </div>
      <div className="tabs">
        {(
          ["calculator", "brackets", "strategies", "reference"] as TaxTab[]
        ).map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === "calculator" && <TaxCalculatorTab metadata={metadata} />}
      {tab === "brackets" && <BracketsTab metadata={metadata} />}
      {tab === "strategies" && <StrategiesTab metadata={metadata} />}
      {tab === "reference" && <ReferenceTab />}
    </div>
  );
}

// ─── CALCULATOR ───────────────────────────────────────────────────────────────

function TaxCalculatorTab({ metadata }: { metadata: any }) {
  const [result, setResult] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    ytd_income: "",
    ytd_withholding: "",
    retirement_contributions: 0,
    hsa_contributions: 0,
    business_expenses: 0,
    other_deductions: 0,
    tax_year: 2024,
  });
  const setF = (k: keyof typeof form, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }));

  const calc = async () => {
    if (!metadata) return;
    setLoading(true);
    try {
      const res = await taxApi.calculate({
        metadata,
        ytd_income: form.ytd_income ? +form.ytd_income : undefined,
        ytd_withholding: form.ytd_withholding
          ? +form.ytd_withholding
          : undefined,
        retirement_contributions: form.retirement_contributions,
        hsa_contributions: form.hsa_contributions,
        business_expenses: form.business_expenses,
        other_deductions: form.other_deductions,
        tax_year: form.tax_year,
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const isFreelance =
    metadata?.income_type === "freelance" || metadata?.income_type === "mixed";

  if (!metadata)
    return (
      <div className="empty">
        <div className="empty-icon">◧</div>
        <div className="empty-text">
          Complete onboarding to use the tax calculator
        </div>
      </div>
    );

  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1.25rem" }}>
          Tax inputs — {form.tax_year}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <label className="label">
              {isFreelance ? "Net business income" : "Gross W-2 income"}
            </label>
            <div className="input-group">
              <span className="input-prefix">$</span>
              <input
                type="number"
                className="input"
                value={form.ytd_income}
                onChange={(e) => setF("ytd_income", e.target.value)}
                placeholder={`${metadata?.annual_income}`}
              />
            </div>
          </div>
          {!isFreelance && (
            <div>
              <label className="label">Federal tax withheld (W-2 box 2)</label>
              <div className="input-group">
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  className="input"
                  value={form.ytd_withholding}
                  onChange={(e) => setF("ytd_withholding", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          )}
          <div>
            <label className="label">401k / IRA contributions</label>
            <div className="input-group">
              <span className="input-prefix">$</span>
              <input
                type="number"
                className="input"
                value={form.retirement_contributions}
                onChange={(e) =>
                  setF("retirement_contributions", +e.target.value)
                }
              />
            </div>
          </div>
          <div>
            <label className="label">HSA contributions</label>
            <div className="input-group">
              <span className="input-prefix">$</span>
              <input
                type="number"
                className="input"
                value={form.hsa_contributions}
                onChange={(e) => setF("hsa_contributions", +e.target.value)}
              />
            </div>
          </div>
          {isFreelance && (
            <div>
              <label className="label">Business expenses</label>
              <div className="input-group">
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  className="input"
                  value={form.business_expenses}
                  onChange={(e) => setF("business_expenses", +e.target.value)}
                />
              </div>
            </div>
          )}
          <div>
            <label className="label">Other deductions</label>
            <div className="input-group">
              <span className="input-prefix">$</span>
              <input
                type="number"
                className="input"
                value={form.other_deductions}
                onChange={(e) => setF("other_deductions", +e.target.value)}
              />
            </div>
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: "1.25rem" }}
          onClick={calc}
          disabled={loading}
        >
          {loading ? "Calculating..." : "Calculate taxes →"}
        </button>
      </div>

      {result && (
        <div
          className="stagger"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {/* Refund / owed banner */}
          {result.estimated_refund_or_owed !== 0 && (
            <div
              className={`alert ${result.estimated_refund_or_owed > 0 ? "alert-green" : "alert-red"}`}
              style={{
                justifyContent: "space-between",
                padding: "1rem 1.375rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    marginBottom: 2,
                  }}
                >
                  {result.estimated_refund_or_owed > 0
                    ? "Estimated refund"
                    : "Estimated amount owed"}
                </div>
                <div style={{ fontSize: "0.775rem", opacity: 0.8 }}>
                  Based on{" "}
                  {result.estimated_refund_or_owed > 0
                    ? "excess withholding"
                    : "insufficient withholding"}
                </div>
              </div>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  fontFamily: "var(--mono)",
                  letterSpacing: "-0.03em",
                }}
              >
                {formatCurrency(Math.abs(result.estimated_refund_or_owed))}
              </div>
            </div>
          )}

          {/* Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))",
              gap: "0.75rem",
            }}
          >
            {[
              {
                l: "Gross income",
                v: formatCurrency(result.gross_income),
                c: "var(--t1)",
              },
              { l: "AGI", v: formatCurrency(result.agi), c: "var(--t1)" },
              {
                l: "Taxable income",
                v: formatCurrency(result.taxable_income),
                c: "var(--t1)",
              },
              {
                l: "Total tax",
                v: formatCurrency(result.total_tax),
                c: "var(--red)",
              },
              {
                l: "Effective rate",
                v: `${result.effective_rate}%`,
                c: "var(--amber)",
              },
              {
                l: "Marginal rate",
                v: `${result.marginal_rate}%`,
                c: "var(--amber)",
              },
            ].map(({ l, v, c }) => (
              <div key={l} className="metric">
                <div className="metric-label">{l}</div>
                <div
                  className="metric-value"
                  style={{ color: c, fontSize: "1.1rem" }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown + bracket chart */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div className="card">
              <div className="section-title" style={{ marginBottom: "1rem" }}>
                Tax breakdown
              </div>
              <div>
                {[
                  { l: "Federal income tax", v: result.federal_tax },
                  { l: "State income tax", v: result.state_tax },
                  { l: "Social Security", v: result.fica_tax * 0.71 },
                  { l: "Medicare", v: result.fica_tax * 0.29 },
                  { l: "Self-employment tax", v: result.se_tax },
                ]
                  .filter((x) => x.v > 0)
                  .map(({ l, v }) => (
                    <div key={l} className="data-row">
                      <span className="data-row-label">{l}</span>
                      <span
                        className="data-row-value"
                        style={{ color: "var(--red)" }}
                      >
                        {formatCurrency(v)}
                      </span>
                    </div>
                  ))}
                <div
                  className="data-row"
                  style={{
                    borderTop: "1px solid var(--b2)",
                    marginTop: 4,
                    paddingTop: 8,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--t1)",
                      fontSize: "0.825rem",
                    }}
                  >
                    Total
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontWeight: 700,
                      color: "var(--red)",
                      fontSize: "0.875rem",
                    }}
                  >
                    {formatCurrency(result.total_tax)}
                  </span>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="section-title" style={{ marginBottom: "1rem" }}>
                Bracket waterfall
              </div>
              <BracketChart brackets={result.bracket_breakdown} height={180} />
            </div>
          </div>

          {/* Quarterly payments */}
          {result.quarterly_payments?.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ marginBottom: "1rem" }}>
                Quarterly estimated payments
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,1fr)",
                  gap: "0.75rem",
                }}
              >
                {result.quarterly_payments.map((q) => {
                  const isPast = new Date(q.due) < new Date();
                  return (
                    <div
                      key={q.quarter}
                      style={{
                        background: "var(--bg-4)",
                        borderRadius: "var(--r)",
                        padding: "0.875rem",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--green)",
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          marginBottom: 4,
                        }}
                      >
                        {q.quarter}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        {formatCurrency(q.amount)}
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: isPast ? "var(--red)" : "var(--t3)",
                        }}
                      >
                        Due {q.due}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI narration */}
          {(result as any).narration && (
            <div className="insight amber">
              <div className="insight-label">AI tax insight</div>
              {(result as any).narration}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── BRACKETS ─────────────────────────────────────────────────────────────────

function BracketsTab({ metadata }: { metadata: any }) {
  const BRACKETS_SINGLE_2024 = [
    { rate: 10, min: 0, max: 11600 },
    { rate: 12, min: 11600, max: 47150 },
    { rate: 22, min: 47150, max: 100525 },
    { rate: 24, min: 100525, max: 191950 },
    { rate: 32, min: 191950, max: 243725 },
    { rate: 35, min: 243725, max: 609350 },
    { rate: 37, min: 609350, max: Infinity },
  ];

  const income = metadata?.annual_income ?? 0;
  const std_ded =
    STANDARD_DEDUCTIONS_2024[
      (metadata?.filing_status as keyof typeof STANDARD_DEDUCTIONS_2024) ?? "single"
    ];
  const taxable = Math.max(0, income - std_ded);

  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>
          2024 Federal Tax Brackets (Single)
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Rate</th>
              <th>Taxable income range</th>
              <th>Tax on bracket</th>
              <th>Your bracket</th>
            </tr>
          </thead>
          <tbody>
            {BRACKETS_SINGLE_2024.map((b) => {
              const inBracket = taxable > b.min;
              const bracketIncome = inBracket
                ? Math.min(taxable, b.max === Infinity ? taxable : b.max) -
                  b.min
                : 0;
              const bracketTax =
                bracketIncome > 0 ? (bracketIncome * b.rate) / 100 : 0;
              return (
                <tr
                  key={b.rate}
                  style={{
                    background:
                      inBracket &&
                      taxable <= (b.max === Infinity ? taxable : b.max)
                        ? "var(--green-bg)"
                        : undefined,
                  }}
                >
                  <td
                    style={{
                      fontFamily: "var(--mono)",
                      fontWeight: 700,
                      color: "var(--amber)",
                    }}
                  >
                    {b.rate}%
                  </td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: "0.8rem" }}>
                    {formatCurrency(b.min)} —{" "}
                    {b.max === Infinity ? "∞" : formatCurrency(b.max)}
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--mono)",
                      color: bracketTax > 0 ? "var(--red)" : "var(--t4)",
                    }}
                  >
                    {bracketTax > 0 ? formatCurrency(bracketTax) : "—"}
                  </td>
                  <td>
                    {inBracket &&
                      taxable <= (b.max === Infinity ? taxable : b.max) && (
                        <span className="badge badge-green">Your bracket</span>
                      )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="insight" style={{ marginTop: "1rem" }}>
          <div className="insight-label">
            Key insight: marginal vs effective
          </div>
          Being in the 24% bracket doesn't mean you pay 24% on everything — only
          on income above $100,525. Your first $11,600 is taxed at 10%, the next
          $35,550 at 12%, and so on.
        </div>
      </div>
    </div>
  );
}

// ─── STRATEGIES ───────────────────────────────────────────────────────────────

function StrategiesTab({ metadata }: { metadata: any }) {
  const income = metadata?.annual_income ?? 0;
  const age = metadata?.age ?? 30;
  const catchup = age >= 50;
  const superCatchup = age >= 60 && age <= 63;

  const strategies = [
    {
      title: "401k contributions",
      desc: "Reduce taxable income dollar-for-dollar with pre-tax contributions",
      limit: superCatchup
        ? IRS_LIMITS["401k_super_catchup_60_63"]
        : catchup
          ? IRS_LIMITS["401k_catchup_50_plus_2024"]
          : IRS_LIMITS["401k_employee_2024"],
      label: superCatchup
        ? "Super catch-up limit (age 60–63)"
        : catchup
          ? "Catch-up limit (age 50+)"
          : "2024 limit",
      savings:
        income > 0
          ? (
              Math.min(
                catchup
                  ? IRS_LIMITS["401k_catchup_50_plus_2024"]
                  : IRS_LIMITS["401k_employee_2024"],
                income,
              ) * 0.22
            ).toFixed(0)
          : null,
    },
    {
      title: "Traditional IRA",
      desc: "Additional pre-tax savings if income below phase-out range",
      limit: catchup
        ? IRS_LIMITS["ira_catchup_50_plus"]
        : IRS_LIMITS["ira_2024"],
      label: catchup ? "Catch-up limit" : "2024 limit",
      savings: null,
    },
    {
      title: "HSA (if eligible)",
      desc: "Triple tax advantage: pre-tax, grows tax-free, tax-free withdrawals for medical",
      limit: IRS_LIMITS["hsa_individual_2024"],
      label: "Individual HDHP",
      savings: null,
    },
    {
      title: "Standard deduction",
      desc: "Auto-applied — no itemizing required for most filers",
      limit:
        STANDARD_DEDUCTIONS_2024[
          (metadata?.filing_status as keyof typeof STANDARD_DEDUCTIONS_2024) ??
            "single"
        ],
      label: metadata?.filing_status?.replace(/_/g, " ") ?? "single",
      savings: null,
    },
  ];

  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))",
          gap: "0.75rem",
        }}
      >
        {strategies.map((s) => (
          <div key={s.title} className="card">
            <div
              style={{ fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}
            >
              {s.title}
            </div>
            <div
              style={{
                fontSize: "0.775rem",
                color: "var(--t3)",
                lineHeight: 1.5,
                marginBottom: "0.875rem",
              }}
            >
              {s.desc}
            </div>
            <div className="data-row">
              <span className="data-row-label">{s.label}</span>
              <span
                className="data-row-value"
                style={{ color: "var(--green)" }}
              >
                {formatCurrency(s.limit)}
              </span>
            </div>
            {s.savings && (
              <div className="data-row">
                <span className="data-row-label">Est. tax savings</span>
                <span
                  className="data-row-value"
                  style={{ color: "var(--green)" }}
                >
                  {formatCurrency(+s.savings)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      {income > 0 && (
        <div className="insight">
          <div className="insight-label">
            Your estimated tax savings opportunity
          </div>
          Maxing your 401k ({formatCurrency(IRS_LIMITS["401k_employee_2024"])})
          + HSA ({formatCurrency(IRS_LIMITS["hsa_individual_2024"])}) saves
          approximately{" "}
          {formatCurrency(
            (IRS_LIMITS["401k_employee_2024"] +
              IRS_LIMITS["hsa_individual_2024"]) *
              0.22,
          )}{" "}
          in federal taxes at the 22% marginal rate.
        </div>
      )}
    </div>
  );
}

// ─── REFERENCE ────────────────────────────────────────────────────────────────

function ReferenceTab() {
  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>
          2024 Key limits
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th style={{ textAlign: "right" }}>Limit</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["401k employee contribution", IRS_LIMITS["401k_employee_2024"]],
              [
                "401k catch-up (age 50+)",
                IRS_LIMITS["401k_catchup_50_plus_2024"],
              ],
              [
                "401k super catch-up (age 60–63)",
                IRS_LIMITS["401k_super_catchup_60_63"],
              ],
              ["IRA (Traditional or Roth)", IRS_LIMITS["ira_2024"]],
              ["IRA catch-up (age 50+)", IRS_LIMITS["ira_catchup_50_plus"]],
              ["HSA individual", IRS_LIMITS["hsa_individual_2024"]],
              ["HSA family", IRS_LIMITS["hsa_family_2024"]],
              ["HSA catch-up (age 55+)", IRS_LIMITS["hsa_catchup_55_plus"]],
              ["FSA (healthcare)", IRS_LIMITS["fsa_2024"]],
              [
                "Annual gift exclusion",
                IRS_LIMITS["annual_gift_exclusion_2024"],
              ],
              ["QCD from IRA (age 70½+)", IRS_LIMITS["qcd_limit"]],
              ["SS wage base", IRS_LIMITS["ss_wage_base_2024"]],
            ].map(([l, v]) => (
              <tr key={l as string}>
                <td style={{ color: "var(--t1)" }}>{l as string}</td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    fontWeight: 600,
                    color: "var(--green)",
                  }}
                >
                  {formatCurrency(v as number)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>
          2024 Standard deductions
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Filing status</th>
              <th style={{ textAlign: "right" }}>Deduction</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(STANDARD_DEDUCTIONS_2024).map(([status, amt]) => (
              <tr key={status}>
                <td style={{ color: "var(--t1)" }}>
                  {status.replace(/_/g, " ")}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    fontWeight: 600,
                    color: "var(--green)",
                  }}
                >
                  {formatCurrency(amt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
