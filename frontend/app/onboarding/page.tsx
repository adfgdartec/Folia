"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFoliaStore } from "@/store";
import { usersApi } from "@/lib/api/client";
import {
  getLifeStageFromAge,
  LIFE_STAGE_LABELS,
  LITERACY_LABELS,
} from "@/lib/utils";
import type {
  FinancialMetadata,
  IncomeType,
  FilingStatus,
  LiteracyLevel,
} from "@/types";

const STEPS = [
  "Welcome",
  "About you",
  "Income",
  "Expenses",
  "Savings",
  "Goals",
  "Knowledge",
  "Ready",
];

const GOAL_PRESETS = [
  "Build emergency fund",
  "Pay off credit card debt",
  "Save for home down payment",
  "Start investing",
  "Pay off student loans",
  "Save for retirement",
  "Build a business",
  "Save for vacation",
  "Improve credit score",
  "Save for children's education",
];

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { setMetadata, setProfile, userId } = useFoliaStore((s) => ({
    setMetadata: s.setMetadata,
    setProfile: s.setProfile,
    userId: s.userId,
  }));
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    age: 28,
    income_type: "w2" as IncomeType,
    annual_income: 60000,
    filing_status: "single" as FilingStatus,
    state: "",
    monthly_expenses: 3000,
    emergency_fund_months: 0,
    literacy_level: "beginner" as LiteracyLevel,
    goal_names: [] as string[],
    custom_goal: "",
  });
  const set = (k: keyof typeof form, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }));
  const toggleGoal = (g: string) =>
    set(
      "goal_names",
      form.goal_names.includes(g)
        ? form.goal_names.filter((x) => x !== g)
        : [...form.goal_names, g],
    );
  const life_stage = getLifeStageFromAge(form.age);

  const finish = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const allGoals = [
        ...form.goal_names,
        ...(form.custom_goal ? [form.custom_goal] : []),
      ];
      const metadata: FinancialMetadata = {
        user_id: userId,
        age: form.age,
        life_stage,
        annual_income: form.annual_income,
        income_type: form.income_type,
        filing_status: form.filing_status,
        state: form.state || undefined,
        monthly_expenses: form.monthly_expenses,
        emergency_fund_months: form.emergency_fund_months,
        literacy_level: form.literacy_level,
        goals: allGoals.map((name, i) => ({
          id: `g-${i}`,
          name,
          target_amount: 10000,
          current_amount: 0,
          target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2)
            .toISOString()
            .split("T")[0],
          category: "general",
          priority: 3,
          is_achieved: false,
        })),
      };
      await usersApi.upsertMetadata(userId, metadata);
      await usersApi.updateProfile(userId, { onboarding_done: true });
      setMetadata(metadata);
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish());
  const back = () => step > 0 && setStep(step - 1);

  const savingsRate =
    form.annual_income > 0
      ? Math.max(
          0,
          ((form.annual_income - form.monthly_expenses * 12) /
            form.annual_income) *
            100,
        )
      : 0;
  const efMonths = form.monthly_expenses > 0 ? form.emergency_fund_months : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background:
                  "linear-gradient(135deg, var(--green) 0%, var(--green2) 100%)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 13C3 10 5 8 8 8C11 8 13 6 13 3"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="8" r="1.5" fill="white" />
              </svg>
            </div>
            <span
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "var(--t1)",
                letterSpacing: "-0.03em",
              }}
            >
              Folia
            </span>
          </div>
          <div style={{ fontSize: "0.775rem", color: "var(--t3)" }}>
            Financial Life OS
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 3, marginBottom: "2rem" }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background:
                  i < step
                    ? "var(--green)"
                    : i === step
                      ? "rgba(34,212,126,0.4)"
                      : "var(--bg-5)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div className="card-elevated" style={{ padding: "2rem" }}>
          <div
            style={{
              fontSize: "0.65rem",
              color: "var(--t4)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            Step {step + 1} of {STEPS.length}
          </div>

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>👋</div>
              <h2
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  marginBottom: "0.875rem",
                  color: "var(--t1)",
                }}
              >
                Welcome to Folia
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--t3)",
                  lineHeight: 1.75,
                  marginBottom: "1.25rem",
                }}
              >
                We'll build your Financial metadata in 7 quick steps — a personalized
                profile that makes every recommendation specific to your life,
                age, and goals.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {[
                  "2 minutes to complete",
                  "Your data stays private",
                  "Update anytime",
                ].map((t) => (
                  <span
                    key={t}
                    style={{
                      background: "var(--green-bg)",
                      border: "1px solid var(--green-border)",
                      borderRadius: "100px",
                      padding: "0.25rem 0.75rem",
                      fontSize: "0.72rem",
                      color: "var(--green)",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — About you */}
          {step === 1 && (
            <div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  marginBottom: "1.5rem",
                  color: "var(--t1)",
                  letterSpacing: "-0.02em",
                }}
              >
                About you
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <label className="label">Your age</label>
                  <input
                    type="number"
                    className="input"
                    value={form.age}
                    min={13}
                    max={100}
                    onChange={(e) => set("age", +e.target.value)}
                  />
                  {form.age >= 13 && (
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--green)",
                        marginTop: 5,
                      }}
                    >
                      Life stage: {LIFE_STAGE_LABELS[life_stage]}
                    </div>
                  )}
                </div>
                <div>
                  <label className="label">Filing status</label>
                  <select
                    className="select"
                    value={form.filing_status}
                    onChange={(e) =>
                      set("filing_status", e.target.value as FilingStatus)
                    }
                  >
                    <option value="single">Single</option>
                    <option value="married_filing_jointly">
                      Married filing jointly
                    </option>
                    <option value="married_filing_separately">
                      Married filing separately
                    </option>
                    <option value="head_of_household">Head of household</option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    State (optional — improves tax accuracy)
                  </label>
                  <select
                    className="select"
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                  >
                    <option value="">
                      No state income tax / prefer not to say
                    </option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Income */}
          {step === 2 && (
            <div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  marginBottom: "1.5rem",
                  color: "var(--t1)",
                  letterSpacing: "-0.02em",
                }}
              >
                Your income
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <label className="label">Income type</label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.5rem",
                    }}
                  >
                    {(
                      [
                        ["w2", "W-2 Employee"],
                        ["freelance", "Freelance / 1099"],
                        ["mixed", "Both W-2 + freelance"],
                        ["retired", "Retired"],
                        ["unemployed", "Currently unemployed"],
                      ] as const
                    ).map(([v, l]) => (
                      <button
                        key={v}
                        onClick={() => set("income_type", v)}
                        style={{
                          padding: "0.625rem 0.75rem",
                          background:
                            form.income_type === v
                              ? "var(--green-bg)"
                              : "var(--bg-4)",
                          border: `1px solid ${form.income_type === v ? "var(--green-border)" : "var(--b1)"}`,
                          borderRadius: "var(--r)",
                          fontSize: "0.8rem",
                          color:
                            form.income_type === v
                              ? "var(--green)"
                              : "var(--t2)",
                          cursor: "pointer",
                          fontWeight: form.income_type === v ? 600 : 400,
                          textAlign: "left",
                          transition: "all 0.12s",
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">
                    Annual income (gross, before taxes)
                  </label>
                  <div className="input-group">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      className="input"
                      value={form.annual_income}
                      min={0}
                      step={1000}
                      onChange={(e) => set("annual_income", +e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Expenses */}
          {step === 3 && (
            <div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  marginBottom: "1.5rem",
                  color: "var(--t1)",
                  letterSpacing: "-0.02em",
                }}
              >
                Monthly expenses
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <label className="label">
                    Estimated monthly expenses (rent, food, transport, bills)
                  </label>
                  <div className="input-group">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      className="input"
                      value={form.monthly_expenses}
                      min={0}
                      step={100}
                      onChange={(e) => set("monthly_expenses", +e.target.value)}
                    />
                  </div>
                </div>
                {form.annual_income > 0 && (
                  <div
                    style={{
                      background: "var(--bg-4)",
                      borderRadius: "var(--r)",
                      padding: "0.875rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--t3)",
                        marginBottom: 3,
                      }}
                    >
                      Estimated savings rate
                    </div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        fontFamily: "var(--mono)",
                        color:
                          savingsRate >= 20
                            ? "var(--green)"
                            : savingsRate >= 10
                              ? "var(--amber)"
                              : "var(--red)",
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {savingsRate.toFixed(1)}%
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--t4)",
                        marginTop: 2,
                      }}
                    >
                      {savingsRate >= 20
                        ? "Excellent — above the recommended 20%"
                        : savingsRate >= 10
                          ? "Good — aim for 20%+"
                          : "Below 10% — there's room to improve"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4 — Emergency fund */}
          {step === 4 && (
            <div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  color: "var(--t1)",
                  letterSpacing: "-0.02em",
                }}
              >
                Emergency fund
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--t3)",
                  lineHeight: 1.65,
                  marginBottom: "1.5rem",
                }}
              >
                An emergency fund covers 3–6 months of essential expenses. It's
                your financial immune system. How many months do you currently
                have saved?
              </p>
              <input
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={form.emergency_fund_months}
                onChange={(e) => set("emergency_fund_months", +e.target.value)}
                style={{
                  width: "100%",
                  accentColor: "var(--green)",
                  marginBottom: "1rem",
                }}
              />
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    fontFamily: "var(--mono)",
                    letterSpacing: "-0.04em",
                    color:
                      form.emergency_fund_months >= 6
                        ? "var(--green)"
                        : form.emergency_fund_months >= 3
                          ? "var(--amber)"
                          : "var(--red)",
                  }}
                >
                  {form.emergency_fund_months === 0
                    ? "None yet"
                    : `${form.emergency_fund_months} mo`}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--t3)",
                    marginTop: 4,
                  }}
                >
                  {form.emergency_fund_months >= 6
                    ? "✓ Fully funded — excellent!"
                    : form.emergency_fund_months >= 3
                      ? "✓ At the minimum — good start"
                      : form.emergency_fund_months >= 1
                        ? "Getting there — aim for 3+ months"
                        : "Priority #1 — even $500 helps"}
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Goals */}
          {step === 5 && (
            <div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  color: "var(--t1)",
                  letterSpacing: "-0.02em",
                }}
              >
                What are you working toward?
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--t3)",
                  marginBottom: "1.25rem",
                }}
              >
                Select all that apply. These shape your personalized
                recommendations.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                {GOAL_PRESETS.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleGoal(g)}
                    style={{
                      padding: "0.6rem 0.75rem",
                      background: form.goal_names.includes(g)
                        ? "var(--green-bg)"
                        : "var(--bg-4)",
                      border: `1px solid ${form.goal_names.includes(g) ? "var(--green-border)" : "var(--b1)"}`,
                      borderRadius: "var(--r)",
                      fontSize: "0.775rem",
                      color: form.goal_names.includes(g)
                        ? "var(--green)"
                        : "var(--t2)",
                      cursor: "pointer",
                      fontWeight: form.goal_names.includes(g) ? 600 : 400,
                      textAlign: "left",
                      transition: "all 0.12s",
                    }}
                  >
                    {form.goal_names.includes(g) ? "✓ " : ""}
                    {g}
                  </button>
                ))}
              </div>
              <div>
                <label className="label">Add a custom goal (optional)</label>
                <input
                  className="input"
                  placeholder="e.g. Record a music album"
                  value={form.custom_goal}
                  onChange={(e) => set("custom_goal", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 6 — Knowledge */}
          {step === 6 && (
            <div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  color: "var(--t1)",
                  letterSpacing: "-0.02em",
                }}
              >
                Financial knowledge level
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--t3)",
                  marginBottom: "1.25rem",
                  lineHeight: 1.65,
                }}
              >
                This calibrates how Folia explains things. No wrong answer — you
                can change it anytime.
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {(
                  ["beginner", "intermediate", "advanced"] as LiteracyLevel[]
                ).map((level) => (
                  <button
                    key={level}
                    onClick={() => set("literacy_level", level)}
                    style={{
                      padding: "0.875rem 1rem",
                      background:
                        form.literacy_level === level
                          ? "var(--green-bg)"
                          : "var(--bg-4)",
                      border: `1px solid ${form.literacy_level === level ? "var(--green-border)" : "var(--b1)"}`,
                      borderRadius: "var(--r)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.12s",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.825rem",
                        fontWeight: 600,
                        color:
                          form.literacy_level === level
                            ? "var(--green)"
                            : "var(--t1)",
                        marginBottom: 2,
                      }}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--t3)" }}>
                      {LITERACY_LABELS[level]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 7 — Complete */}
          {step === 7 && (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎉</div>
              <h2
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "var(--t1)",
                  letterSpacing: "-0.02em",
                }}
              >
                Your Financial metadata is ready
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                  marginBottom: "1.5rem",
                  textAlign: "left",
                  background: "var(--bg-3)",
                  borderRadius: "var(--r)",
                  padding: "0.875rem 1rem",
                }}
              >
                {[
                  { l: "Life stage", v: LIFE_STAGE_LABELS[life_stage] },
                  {
                    l: "Annual income",
                    v: `$${form.annual_income.toLocaleString()}`,
                  },
                  { l: "Income type", v: form.income_type.replace("_", " ") },
                  {
                    l: "Monthly expenses",
                    v: `$${form.monthly_expenses.toLocaleString()}`,
                  },
                  {
                    l: "Emergency fund",
                    v: `${form.emergency_fund_months} months`,
                  },
                  {
                    l: "Goals",
                    v: `${form.goal_names.length + (form.custom_goal ? 1 : 0)} selected`,
                  },
                  { l: "Knowledge level", v: form.literacy_level },
                ].map(({ l, v }) => (
                  <div key={l} className="data-row">
                    <span className="data-row-label">{l}</span>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "0.8rem",
                        color: "var(--t1)",
                        fontWeight: 500,
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "2rem",
              gap: "0.75rem",
            }}
          >
            {step > 0 ? (
              <button className="btn btn-secondary" onClick={back}>
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              className="btn btn-primary"
              style={{ minWidth: 130 }}
              onClick={next}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : step === STEPS.length - 1
                  ? "Enter Folia →"
                  : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
