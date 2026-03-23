"use client";
import { useState, useEffect } from "react";
import { communityApi } from "@/lib/api/client";
import { useFoliaStore } from "@/store";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

interface Template {
  id: string;
  template_title: string;
  template_desc: string;
  life_stage: string;
  simulation_type: string;
  upvotes: number;
  scenario_data: Record<string, unknown>;
}

interface Benchmarks {
  benchmarks: {
    net_worth?: { p25: number | null; p50: number | null; p75: number | null };
    savings_rate?: {
      p25: number | null;
      p50: number | null;
      p75: number | null;
    };
  };
  sample_size: number;
  life_stage: string;
}

const STAGE_COLORS: Record<string, string> = {
  foundations: "var(--purple)",
  launch: "var(--green)",
  build: "var(--blue)",
  accelerate: "var(--teal)",
  preserve: "var(--amber)",
  retire: "var(--coral)",
};

const SIM_LABELS: Record<string, string> = {
  fork: "Decision Fork",
  monte_carlo: "Monte Carlo",
  life_event: "Life Event",
  debt_payoff: "Debt Payoff",
  retirement: "Retirement",
  home_buying: "Home Buying",
};

export default function CommunityPage() {
  const dna = useFoliaStore((s) => s.dna);
  const { success, error: te } = useToast();
  const [stage, setStage] = useState(dna?.life_stage ?? "build");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmarks | null>(null);
  const [loading, setLoading] = useState(false);
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [t, b] = await Promise.all([
          communityApi.listTemplates(stage),
          communityApi.getBenchmarks(stage),
        ]);
        setTemplates(t.templates ?? []);
        setBenchmarks(b);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [stage]);

  const handleUpvote = async (id: string) => {
    if (upvoted.has(id)) return;
    try {
      await communityApi.upvote(id);
      setUpvoted((p) => new Set([...p, id]));
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, upvotes: t.upvotes + 1 } : t)),
      );
    } catch (e: any) {
      te(e.message);
    }
  };

  const STAGES = [
    "foundations",
    "launch",
    "build",
    "accelerate",
    "preserve",
    "retire",
  ];

  const nwBench = benchmarks?.benchmarks?.net_worth;
  const srBench = benchmarks?.benchmarks?.savings_rate;

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
          Community
        </h1>
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--t3)",
            marginTop: 4,
            lineHeight: 1.6,
          }}
        >
          Anonymized peer benchmarks by life stage · Scenario templates · All
          data is privacy-preserving
        </p>
      </div>

      {/* Privacy note */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          padding: "0.625rem 0.875rem",
          background: "var(--blue-bg)",
          border: "1px solid var(--blue-border)",
          borderRadius: "var(--r)",
          fontSize: "0.775rem",
          color: "var(--blue)",
        }}
      >
        <span>🔒</span>
        No personal data is shared. All benchmarks use aggregated, anonymized
        ranges — never individual figures.
      </div>

      {/* Life stage selector */}
      <div>
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--t3)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: "0.625rem",
          }}
        >
          Filter by life stage
        </div>
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              style={{
                padding: "0.35rem 0.875rem",
                borderRadius: "var(--r)",
                fontSize: "0.775rem",
                fontWeight: stage === s ? 700 : 400,
                cursor: "pointer",
                background:
                  stage === s ? STAGE_COLORS[s] + "18" : "var(--bg-3)",
                border: `1px solid ${stage === s ? STAGE_COLORS[s] + "40" : "var(--b1)"}`,
                color: stage === s ? STAGE_COLORS[s] : "var(--t3)",
                transition: "all 0.12s",
                textTransform: "capitalize",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Benchmarks */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <div className="skeleton" style={{ height: 180 }} />
          <div className="skeleton" style={{ height: 180 }} />
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          {/* Net worth benchmark */}
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <div className="section-title">Net worth</div>
                <div
                  className="section-sub"
                  style={{ textTransform: "capitalize" }}
                >
                  {stage} stage · {benchmarks?.sample_size ?? 0} data points
                </div>
              </div>
              {dna && (
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--t4)",
                      marginBottom: 2,
                    }}
                  >
                    Your net worth
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      color: "var(--green)",
                    }}
                  >
                    —
                  </div>
                </div>
              )}
            </div>
            {nwBench ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {[
                  {
                    label: "Top 25%",
                    value: nwBench.p75,
                    desc: "P75 — doing great",
                  },
                  {
                    label: "Median",
                    value: nwBench.p50,
                    desc: "P50 — right in the middle",
                  },
                  {
                    label: "Bottom 25%",
                    value: nwBench.p25,
                    desc: "P25 — room to grow",
                  },
                ].map(({ label, value, desc }) => (
                  <div key={label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{ fontSize: "0.775rem", color: "var(--t2)" }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "0.825rem",
                          fontWeight: 600,
                          color: "var(--t1)",
                        }}
                      >
                        {value != null
                          ? formatCurrency(value, true)
                          : "No data"}
                      </span>
                    </div>
                    {value != null && (
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(100, (value / (nwBench.p75 ?? 1)) * 100)}%`,
                            background: STAGE_COLORS[stage],
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ padding: "1.5rem 0" }}>
                <div className="empty-text">
                  Not enough data for this stage yet
                </div>
                <div className="empty-sub">Be the first to contribute!</div>
              </div>
            )}
          </div>

          {/* Savings rate benchmark */}
          <div className="card">
            <div style={{ marginBottom: "1.25rem" }}>
              <div className="section-title">Savings rate</div>
              <div
                className="section-sub"
                style={{ textTransform: "capitalize" }}
              >
                {stage} stage peers
              </div>
            </div>
            {srBench ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {[
                  { label: "Top 25%", value: srBench.p75 },
                  { label: "Median", value: srBench.p50 },
                  { label: "Bottom 25%", value: srBench.p25 },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{ fontSize: "0.775rem", color: "var(--t2)" }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "0.825rem",
                          fontWeight: 600,
                          color: "var(--t1)",
                        }}
                      >
                        {value != null ? `${value.toFixed(1)}%` : "No data"}
                      </span>
                    </div>
                    {value != null && (
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(100, value * 2)}%`,
                            background: STAGE_COLORS[stage],
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ padding: "1.5rem 0" }}>
                <div className="empty-text">
                  Not enough savings rate data yet
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <div className="section-title">Scenario templates</div>
            <div className="section-sub">
              Community-created simulation starting points
            </div>
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--t3)" }}>
            {templates.length} templates
          </span>
        </div>

        {loading ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 70 }} />
            ))}
          </div>
        ) : templates.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {templates.map((t) => (
              <div key={t.id} className="list-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.825rem",
                        fontWeight: 600,
                        color: "var(--t1)",
                      }}
                    >
                      {t.template_title}
                    </span>
                    <span className="badge badge-gray">
                      {SIM_LABELS[t.simulation_type] ?? t.simulation_type}
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: STAGE_COLORS[t.life_stage] + "18",
                        color: STAGE_COLORS[t.life_stage],
                        border: `1px solid ${STAGE_COLORS[t.life_stage]}30`,
                      }}
                    >
                      {t.life_stage}
                    </span>
                  </div>
                  {t.template_desc && (
                    <p
                      style={{
                        fontSize: "0.775rem",
                        color: "var(--t3)",
                        lineHeight: 1.5,
                      }}
                    >
                      {t.template_desc}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleUpvote(t.id)}
                  disabled={upvoted.has(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    background: upvoted.has(t.id)
                      ? "var(--green-bg)"
                      : "var(--bg-4)",
                    border: `1px solid ${upvoted.has(t.id) ? "var(--green-border)" : "var(--b1)"}`,
                    borderRadius: "var(--r)",
                    padding: "0.35rem 0.75rem",
                    color: upvoted.has(t.id) ? "var(--green)" : "var(--t3)",
                    fontSize: "0.775rem",
                    fontWeight: 600,
                    cursor: upvoted.has(t.id) ? "default" : "pointer",
                    transition: "all 0.12s",
                    flexShrink: 0,
                  }}
                >
                  ▲ {t.upvotes}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: "2rem 0" }}>
            <div className="empty-icon">◍</div>
            <div className="empty-text">
              No templates yet for this life stage
            </div>
            <div className="empty-sub">
              Run a simulation and contribute it to the community!
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card" style={{ background: "var(--bg-3)" }}>
        <div className="section-title" style={{ marginBottom: "1rem" }}>
          How community data works
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "0.875rem",
          }}
        >
          {[
            {
              icon: "🔒",
              t: "Zero PII",
              d: "Only age range, income range, and life stage are stored — never names, amounts, or identifiers",
            },
            {
              icon: "📊",
              t: "Aggregate only",
              d: "Benchmarks show P25/P50/P75 distributions, never individual data points",
            },
            {
              icon: "🤝",
              t: "Opt-in contribution",
              d: "You choose when to share a simulation result — never automatic",
            },
            {
              icon: "🎯",
              t: "Contextual",
              d: "Benchmarks are filtered by your life stage so comparisons are meaningful",
            },
          ].map(({ icon, t, d }) => (
            <div key={t} style={{ display: "flex", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: 2 }}>
                {icon}
              </span>
              <div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--t1)",
                    marginBottom: 3,
                  }}
                >
                  {t}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--t3)",
                    lineHeight: 1.55,
                  }}
                >
                  {d}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
