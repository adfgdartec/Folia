"use client";
import { useState } from "react";
import { useFoliaStore } from "@/store";
import { simulateApi, communityApi } from "@/lib/api/client";
import { TimelineChart, MonteCarloBand } from "@/components/charts";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import type { SimulationResult, ScenarioParams } from "@/types";

type Mode =
  | "fork"
  | "monte_carlo"
  | "life_event"
  | "debt_payoff"
  | "retirement"
  | "home_buying";

const LIFE_EVENTS = [
  {
    label: "Job loss (3 months)",
    income_change_pct: -100,
    months: 3,
    amount: 0,
  },
  {
    label: "Medical emergency",
    income_change_pct: 0,
    months: 0,
    amount: -15000,
  },
  { label: "Car breakdown", income_change_pct: 0, months: 0, amount: -4000 },
  {
    label: "Having a child",
    income_change_pct: -15,
    months: 12,
    amount: -10000,
  },
  { label: "Divorce", income_change_pct: -20, months: 0, amount: -25000 },
  {
    label: "Receive inheritance +$50k",
    income_change_pct: 0,
    months: 0,
    amount: 50000,
  },
  { label: "Pay raise +20%", income_change_pct: 20, months: 0, amount: 0 },
  {
    label: "Start a business (-$20k)",
    income_change_pct: -30,
    months: 12,
    amount: -20000,
  },
  {
    label: "Relocate to lower-cost city",
    income_change_pct: 0,
    months: 0,
    amount: -5000,
  },
  {
    label: "Sell home (+$100k equity)",
    income_change_pct: 0,
    months: 0,
    amount: 100000,
  },
];

export default function SimulatePage() {
  const dna = useFoliaStore((s) => s.dna);
  const { success } = useToast();
  const [mode, setMode] = useState<Mode>("fork");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [horizon, setHorizon] = useState(10);
  const [event, setEvent] = useState(0);
  const [extraDebt, setExtraDebt] = useState(200);
  const [scenA, setScenA] = useState<ScenarioParams>({
    label: "Current path",
    monthly_savings_delta: 0,
    investment_return_pct: 7,
  });
  const [scenB, setScenB] = useState<ScenarioParams>({
    label: "Alternative",
    monthly_savings_delta: 300,
    investment_return_pct: 7,
  });

  const MODES: { id: Mode; label: string; desc: string }[] = [
    {
      id: "fork",
      label: "Decision Fork",
      desc: "Compare two paths side-by-side",
    },
    {
      id: "monte_carlo",
      label: "Monte Carlo",
      desc: "10,000-path probability bands",
    },
    {
      id: "life_event",
      label: "Life Event Shock",
      desc: "Test resilience against surprises",
    },
    {
      id: "debt_payoff",
      label: "Debt Payoff Race",
      desc: "Extra payment impact over time",
    },
    {
      id: "retirement",
      label: "Retirement",
      desc: "Trajectory to retirement number",
    },
    {
      id: "home_buying",
      label: "Home Buying",
      desc: "Down payment savings curve",
    },
  ];

  const run = async () => {
    if (!dna) return;
    setLoading(true);
    setResult(null);
    try {
      const ev = LIFE_EVENTS[event];
      let scenAFinal = { ...scenA };
      let scenBFinal: ScenarioParams | undefined = undefined;

      if (mode === "life_event") {
        scenAFinal = { label: "Without event", ...scenA };
        scenBFinal = {
          label: ev.label,
          monthly_savings_delta: scenA.monthly_savings_delta ?? 0,
          investment_return_pct: scenA.investment_return_pct,
          income_change_pct: ev.income_change_pct,
          one_time_event_amount: ev.amount,
          event_year: 1,
        };
      } else if (mode === "debt_payoff") {
        scenAFinal = {
          label: "Minimum payments",
          monthly_savings_delta: 0,
          investment_return_pct: 7,
          extra_debt_payment: 0,
        };
        scenBFinal = {
          label: `+$${extraDebt}/mo extra`,
          monthly_savings_delta: 0,
          investment_return_pct: 7,
          extra_debt_payment: extraDebt,
        };
      } else if (mode === "retirement") {
        scenAFinal = { label: "Current savings rate", ...scenA };
        scenBFinal = {
          label: "Max contributions",
          monthly_savings_delta: (scenA.monthly_savings_delta ?? 0) + 500,
          investment_return_pct: 8,
        };
      } else if (mode === "home_buying") {
        scenAFinal = {
          label: "Save for down payment",
          monthly_savings_delta: 500,
          investment_return_pct: 4,
        };
        scenBFinal = {
          label: "Invest instead",
          monthly_savings_delta: 500,
          investment_return_pct: 9,
        };
      } else if (mode === "fork") {
        scenBFinal = scenB;
      }

      const res = await simulateApi.run({
        dna,
        horizon_years: horizon,
        scenario_a: scenAFinal,
        scenario_b: scenBFinal,
        use_monte_carlo: mode === "monte_carlo",
        simulations: 1000,
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const contribute = async () => {
    if (!dna || !result) return;
    try {
      await communityApi.contribute({
        life_stage: dna.life_stage,
        age_bucket: getAgeBucket(dna.age),
        income_bucket: getIncomeBucket(dna.annual_income),
        simulation_type: mode,
        scenario_data: {
          horizon_years: horizon,
          scenario_a_label: scenA.label,
          mode,
        },
        outcome_data:
          result.scenario_a.length > 0
            ? {
                final_net_worth:
                  result.scenario_a[result.scenario_a.length - 1].net_worth,
              }
            : {},
      });
      success("Scenario contributed to community!");
    } catch {}
  };

  if (!dna) {
    return (
      <div className="empty" style={{ paddingTop: "6rem" }}>
        <div className="empty-icon">⟁</div>
        <div className="empty-text">
          Complete onboarding to use the simulator
        </div>
      </div>
    );
  }

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
          Life Simulator
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--t3)", marginTop: 4 }}>
          See exactly how financial decisions compound over the years
        </p>
      </div>

      {/* Mode selector */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "0.5rem",
        }}
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMode(m.id);
              setResult(null);
            }}
            style={{
              background: mode === m.id ? "var(--bg-5)" : "var(--bg-3)",
              border: `1px solid ${mode === m.id ? "var(--b2)" : "var(--b1)"}`,
              borderRadius: "var(--r)",
              padding: "0.75rem",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: mode === m.id ? "var(--green)" : "var(--t1)",
                marginBottom: 2,
              }}
            >
              {m.label}
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--t3)",
                lineHeight: 1.4,
              }}
            >
              {m.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Config */}
      <div className="card">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1.25rem",
            alignItems: "flex-end",
          }}
        >
          {/* Horizon */}
          <div>
            <label className="label">Horizon</label>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              {[5, 10, 20, 30].map((y) => (
                <button
                  key={y}
                  className={`btn btn-sm ${horizon === y ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setHorizon(y)}
                >
                  {y}yr
                </button>
              ))}
            </div>
          </div>

          {/* Scenario controls per mode */}
          {(mode === "fork" || mode === "monte_carlo") && (
            <div style={{ display: "flex", gap: "1rem", flex: 1 }}>
              <ScenarioInput
                label="Scenario A"
                value={scenA}
                onChange={setScenA}
                color="var(--green)"
              />
              {mode === "fork" && (
                <ScenarioInput
                  label="Scenario B"
                  value={scenB}
                  onChange={setScenB}
                  color="var(--blue)"
                />
              )}
            </div>
          )}
          {mode === "life_event" && (
            <div style={{ flex: 1 }}>
              <label className="label">Life event</label>
              <select
                className="select"
                value={event}
                onChange={(e) => setEvent(+e.target.value)}
              >
                {LIFE_EVENTS.map((ev, i) => (
                  <option key={i} value={i}>
                    {ev.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {mode === "debt_payoff" && (
            <div>
              <label className="label">Extra monthly payment</label>
              <div className="input-group" style={{ width: 130 }}>
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  className="input"
                  value={extraDebt}
                  min={0}
                  step={50}
                  onChange={(e) => setExtraDebt(+e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ minWidth: 130 }}
            onClick={run}
            disabled={loading}
          >
            {loading ? (
              <div
                style={{
                  display: "flex",
                  gap: "0.375rem",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    border: "2px solid rgba(4,26,12,0.3)",
                    borderTop: "2px solid #041a0c",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
                Running...
              </div>
            ) : (
              "Run simulation →"
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {loading && <div className="skeleton" style={{ height: 340 }} />}

      {result && !loading && (
        <div
          className="stagger"
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {/* AI Narration */}
          {result.narration && (
            <div className="insight">
              <div className="insight-label">AI analysis</div>
              {result.narration}
            </div>
          )}

          {/* Key metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))",
              gap: "0.75rem",
            }}
          >
            {result.scenario_a.length > 0 && (
              <StatTile
                label={scenA.label + ` yr ${horizon}`}
                value={formatCurrency(
                  result.scenario_a[result.scenario_a.length - 1].net_worth,
                  true,
                )}
                color="var(--green)"
              />
            )}
            {result.scenario_b && result.scenario_b.length > 0 && (
              <StatTile
                label={
                  (mode === "debt_payoff" ? `+$${extraDebt}/mo` : scenB.label) +
                  ` yr ${horizon}`
                }
                value={formatCurrency(
                  result.scenario_b[result.scenario_b.length - 1].net_worth,
                  true,
                )}
                color="var(--blue)"
              />
            )}
            {result.divergence_at_horizon != null &&
              result.divergence_at_horizon !== 0 && (
                <StatTile
                  label="Difference"
                  value={formatCurrency(result.divergence_at_horizon, true)}
                  color="var(--amber)"
                />
              )}
            {result.debt_free_year_a && result.debt_free_year_a > 0 && (
              <StatTile
                label="Debt-free (A)"
                value={`Year ${result.debt_free_year_a}`}
                color="var(--green)"
              />
            )}
            {result.debt_free_year_b &&
              result.debt_free_year_b > 0 &&
              result.debt_free_year_b !== result.debt_free_year_a && (
                <StatTile
                  label="Debt-free (B)"
                  value={`Year ${result.debt_free_year_b}`}
                  color="var(--blue)"
                />
              )}
            {result.total_interest_a > 0 && (
              <StatTile
                label="Interest paid (A)"
                value={formatCurrency(result.total_interest_a, true)}
                color="var(--red)"
              />
            )}
          </div>

          {/* Chart */}
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div className="section-title">Net worth projection</div>
              {result && (
                <button className="btn btn-ghost btn-xs" onClick={contribute}>
                  Share to community
                </button>
              )}
            </div>
            {mode === "monte_carlo" ? (
              <MonteCarloBand data={result.scenario_a} height={300} />
            ) : (
              <TimelineChart
                dataA={result.scenario_a}
                dataB={result.scenario_b ?? undefined}
                labelA={scenA.label}
                labelB={
                  mode === "debt_payoff"
                    ? `+$${extraDebt}/mo extra`
                    : scenB.label
                }
                height={300}
              />
            )}
            {mode === "monte_carlo" && (
              <div
                style={{
                  display: "flex",
                  gap: "1.5rem",
                  marginTop: "0.75rem",
                  fontSize: "0.72rem",
                  color: "var(--t3)",
                }}
              >
                <span style={{ color: "var(--green)" }}>── Median</span>
                <span>── Best 10%</span>
                <span style={{ color: "var(--red)" }}>── Worst 10%</span>
              </div>
            )}
          </div>

          {/* Year-by-year table */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: "1rem" }}>
              Year-by-year breakdown
            </div>
            <div className="scroll-x">
              <table className="table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th style={{ textAlign: "right", color: "var(--green)" }}>
                      {mode === "monte_carlo" ? "Median" : scenA.label}
                    </th>
                    {result.scenario_b && (
                      <th style={{ textAlign: "right", color: "var(--blue)" }}>
                        {mode === "debt_payoff"
                          ? `+$${extraDebt}/mo`
                          : scenB.label}
                      </th>
                    )}
                    {result.scenario_b && (
                      <th style={{ textAlign: "right", color: "var(--amber)" }}>
                        Difference
                      </th>
                    )}
                    {mode === "monte_carlo" && (
                      <th style={{ textAlign: "right", color: "var(--t3)" }}>
                        P10 / P90
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.scenario_a.map((row, i) => {
                    const bRow = result.scenario_b?.[i];
                    const diff = bRow ? bRow.net_worth - row.net_worth : null;
                    return (
                      <tr key={row.year}>
                        <td
                          style={{
                            fontFamily: "var(--mono)",
                            color: "var(--t3)",
                          }}
                        >
                          Yr {row.year}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "var(--mono)",
                            fontWeight: 600,
                            color:
                              row.net_worth >= 0
                                ? "var(--green)"
                                : "var(--red)",
                          }}
                        >
                          {formatCurrency(row.net_worth)}
                        </td>
                        {bRow && (
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "var(--mono)",
                              fontWeight: 600,
                              color:
                                bRow.net_worth >= 0
                                  ? "var(--blue)"
                                  : "var(--red)",
                            }}
                          >
                            {formatCurrency(bRow.net_worth)}
                          </td>
                        )}
                        {diff !== null && (
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "var(--mono)",
                              color: diff >= 0 ? "var(--green)" : "var(--red)",
                            }}
                          >
                            {diff >= 0 ? "+" : ""}
                            {formatCurrency(diff)}
                          </td>
                        )}
                        {mode === "monte_carlo" &&
                          row.p10 != null &&
                          row.p90 != null && (
                            <td
                              style={{
                                textAlign: "right",
                                fontFamily: "var(--mono)",
                                fontSize: "0.75rem",
                                color: "var(--t3)",
                              }}
                            >
                              {formatCurrency(row.p10, true)} /{" "}
                              {formatCurrency(row.p90, true)}
                            </td>
                          )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioInput({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: ScenarioParams;
  onChange: (v: ScenarioParams) => void;
  color: string;
}) {
  const set = (k: keyof ScenarioParams, v: unknown) =>
    onChange({ ...value, [k]: v });
  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <div
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <div style={{ flex: 2 }}>
          <label className="label" style={{ fontSize: "0.68rem" }}>
            Label
          </label>
          <input
            className="input"
            value={value.label}
            onChange={(e) => set("label", e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label" style={{ fontSize: "0.68rem" }}>
            +Savings/mo
          </label>
          <div className="input-group">
            <span className="input-prefix">$</span>
            <input
              type="number"
              className="input"
              value={value.monthly_savings_delta ?? 0}
              step={50}
              onChange={(e) => set("monthly_savings_delta", +e.target.value)}
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label className="label" style={{ fontSize: "0.68rem" }}>
            Return %
          </label>
          <input
            type="number"
            className="input"
            value={value.investment_return_pct ?? 7}
            step={0.5}
            min={0}
            max={20}
            onChange={(e) => set("investment_return_pct", +e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color, fontSize: "1.1rem" }}>
        {value}
      </div>
    </div>
  );
}

function getAgeBucket(age: number) {
  if (age <= 17) return "13-17";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 49) return "35-49";
  if (age <= 64) return "50-64";
  return "65+";
}
function getIncomeBucket(i: number) {
  if (i < 30000) return "<30k";
  if (i < 60000) return "30-60k";
  if (i < 100000) return "60-100k";
  if (i < 200000) return "100-200k";
  return "200k+";
}
