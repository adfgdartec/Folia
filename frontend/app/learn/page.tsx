"use client";
import { useState } from "react";
import { useEducationProgress } from "@/hooks";
import { glossaryApi, educationApi } from "@/lib/api/client";
import { useFoliaStore } from "@/store";
import type { EducationTrack } from "@/types";
import { useToast } from "@/components/ui/Toast";

type LearnTab = "curriculum" | "glossary" | "taxschool" | "ibschool";

const TRACKS: {
  id: EducationTrack;
  label: string;
  color: string;
  concepts: {
    id: string;
    title: string;
    desc: string;
    difficulty: "beginner" | "intermediate" | "advanced";
  }[];
}[] = [
  {
    id: "personal_finance",
    label: "Personal Finance",
    color: "var(--teal)",
    concepts: [
      {
        id: "budget-5030-20",
        title: "50/30/20 budget rule",
        desc: "Allocate needs, wants, and savings",
        difficulty: "beginner",
      },
      {
        id: "emergency-fund",
        title: "Emergency fund",
        desc: "3–6 months of essential expenses",
        difficulty: "beginner",
      },
      {
        id: "compound-interest",
        title: "Compound interest",
        desc: "Why starting early is the biggest advantage",
        difficulty: "beginner",
      },
      {
        id: "hysa",
        title: "High-yield savings account",
        desc: "Earn 4–5% APY instead of 0.01%",
        difficulty: "beginner",
      },
      {
        id: "net-worth-calc",
        title: "Net worth calculation",
        desc: "Assets minus liabilities — your true score",
        difficulty: "beginner",
      },
      {
        id: "insurance-basics",
        title: "Insurance basics",
        desc: "Health, life, auto, renters — what you need",
        difficulty: "intermediate",
      },
    ],
  },
  {
    id: "credit_debt",
    label: "Credit & Debt",
    color: "var(--coral)",
    concepts: [
      {
        id: "fico-factors",
        title: "FICO score factors",
        desc: "5 components that determine your credit score",
        difficulty: "beginner",
      },
      {
        id: "credit-util",
        title: "Credit utilization",
        desc: "Keep below 30% for best score impact",
        difficulty: "beginner",
      },
      {
        id: "avalanche-vs-snowball",
        title: "Avalanche vs Snowball",
        desc: "Two debt payoff strategies compared",
        difficulty: "intermediate",
      },
      {
        id: "apr-apy-diff",
        title: "APR vs APY",
        desc: "The difference that costs or earns you money",
        difficulty: "intermediate",
      },
      {
        id: "dti-ratio",
        title: "Debt-to-income ratio",
        desc: "Why lenders care and what 36% means",
        difficulty: "intermediate",
      },
    ],
  },
  {
    id: "investing",
    label: "Investing",
    color: "var(--green)",
    concepts: [
      {
        id: "index-funds-why",
        title: "Why index funds win",
        desc: "85% of active funds underperform over 10 years",
        difficulty: "beginner",
      },
      {
        id: "etf-vs-mutual",
        title: "ETF vs mutual fund",
        desc: "Cost, tax efficiency, and intraday trading",
        difficulty: "intermediate",
      },
      {
        id: "diversification",
        title: "Diversification",
        desc: "Risk reduction through uncorrelated assets",
        difficulty: "intermediate",
      },
      {
        id: "pe-ratio-explained",
        title: "P/E ratio",
        desc: "Valuing a stock relative to its earnings power",
        difficulty: "intermediate",
      },
      {
        id: "dca-strategy",
        title: "Dollar-cost averaging",
        desc: "Remove timing risk with consistent investing",
        difficulty: "beginner",
      },
      {
        id: "rebalancing",
        title: "Portfolio rebalancing",
        desc: "Maintaining target allocation as markets move",
        difficulty: "advanced",
      },
    ],
  },
  {
    id: "taxes",
    label: "Tax Literacy",
    color: "var(--amber)",
    concepts: [
      {
        id: "marginal-vs-effective",
        title: "Marginal vs effective rate",
        desc: "The most misunderstood concept in personal finance",
        difficulty: "beginner",
      },
      {
        id: "roth-vs-traditional",
        title: "Roth vs Traditional IRA",
        desc: "Tax now vs tax later — the math behind each",
        difficulty: "intermediate",
      },
      {
        id: "capital-gains-rates",
        title: "Capital gains rates",
        desc: "0%, 15%, 20% — the hold-time difference",
        difficulty: "intermediate",
      },
      {
        id: "tax-loss-harvest",
        title: "Tax-loss harvesting",
        desc: "Turn paper losses into real tax savings",
        difficulty: "advanced",
      },
      {
        id: "standard-vs-itemized",
        title: "Standard vs itemized deductions",
        desc: "When each makes sense — and the break-even point",
        difficulty: "intermediate",
      },
    ],
  },
  {
    id: "career_income",
    label: "Career & Income",
    color: "var(--blue)",
    concepts: [
      {
        id: "salary-negotiation",
        title: "Salary negotiation",
        desc: "Data-backed scripts and timing that work",
        difficulty: "intermediate",
      },
      {
        id: "401k-match-free",
        title: "401k employer match",
        desc: "Free money — the highest guaranteed return",
        difficulty: "beginner",
      },
      {
        id: "total-comp-value",
        title: "Total compensation",
        desc: "Calculating salary + benefits + equity + 401k",
        difficulty: "intermediate",
      },
      {
        id: "gig-economy-taxes",
        title: "Gig economy taxes",
        desc: "Self-employment tax, quarterly payments, deductions",
        difficulty: "intermediate",
      },
    ],
  },
  {
    id: "advanced_finance",
    label: "Advanced Finance",
    color: "var(--purple)",
    concepts: [
      {
        id: "dcf-valuation",
        title: "DCF valuation",
        desc: "Discount future cash flows to present value",
        difficulty: "advanced",
      },
      {
        id: "wacc-cost-capital",
        title: "WACC",
        desc: "Blended cost of capital for investment decisions",
        difficulty: "advanced",
      },
      {
        id: "lbo-structure",
        title: "LBO basics",
        desc: "How PE firms use debt to amplify returns",
        difficulty: "advanced",
      },
      {
        id: "options-greeks",
        title: "Options Greeks",
        desc: "Delta, Theta, Vega — what each tells you",
        difficulty: "advanced",
      },
      {
        id: "financial-statements",
        title: "Reading financial statements",
        desc: "Income statement, balance sheet, cash flow",
        difficulty: "advanced",
      },
    ],
  },
];

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  mastered: "Mastered",
};
const STATUS_COLORS: Record<string, string> = {
  not_started: "var(--t4)",
  in_progress: "var(--amber)",
  completed: "var(--blue)",
  mastered: "var(--green)",
};
const DIFF_BADGES: Record<string, string> = {
  beginner: "badge-green",
  intermediate: "badge-blue",
  advanced: "badge-amber",
};

export default function LearnPage() {
  const userId = useFoliaStore((s) => s.userId)!;
  const metadata = useFoliaStore((s) => s.metadata);
  const { data: progress, refetch } = useEducationProgress();
  const [tab, setTab] = useState<LearnTab>("curriculum");
  const [selected, setSelected] = useState<EducationTrack | null>(null);
  const [glossTerm, setGlossTerm] = useState("");
  const [glossResult, setGlossResult] = useState<any>(null);
  const [glossLoading, setGlossLoading] = useState(false);
  const { success } = useToast();

  const getStatus = (conceptId: string) =>
    progress?.progress?.find((p) => p.concept_id === conceptId)?.status ??
    "not_started";
  const getTrackPct = (trackId: EducationTrack) =>
    (progress?.by_track as any)?.[trackId]?.pct ?? 0;

  const markStatus = async (
    track: EducationTrack,
    conceptId: string,
    title: string,
    next: string,
  ) => {
    await educationApi.updateProgress({
      user_id: userId,
      track,
      concept_id: conceptId,
      concept_title: title,
      status: next,
    });
    refetch();
    success(`Marked as ${next.replace("_", " ")}`);
  };

  const lookupGloss = async () => {
    if (!glossTerm.trim()) return;
    setGlossLoading(true);
    try {
      const r = await glossaryApi.define(
        glossTerm.trim(),
        metadata?.literacy_level ?? "beginner",
      );
      setGlossResult(r);
    } finally {
      setGlossLoading(false);
    }
  };

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
          Learn
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--t3)", marginTop: 4 }}>
          6 curriculum tracks · Spaced repetition · RAG-powered glossary · Tax
          school · IB school
        </p>
      </div>
      <div className="tabs">
        {(
          [
            { id: "curriculum", l: "Curriculum" },
            { id: "glossary", l: "Glossary" },
            { id: "taxschool", l: "Tax School" },
            { id: "ibschool", l: "Finance School" },
          ] as { id: LearnTab; l: string }[]
        ).map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* ── CURRICULUM ── */}
      {tab === "curriculum" && (
        <div
          className="stagger"
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {progress && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.875rem 1rem",
                background: "var(--bg-3)",
                borderRadius: "var(--r)",
                border: "1px solid var(--b1)",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "var(--t3)" }}>
                Overall progress
              </div>
              <div className="progress-track" style={{ flex: 1 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${(progress.total_mastered / Math.max(1, progress.progress?.length || 1)) * 100}%`,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "var(--mono)",
                  color: "var(--green)",
                  fontWeight: 600,
                }}
              >
                {progress.total_mastered} mastered
              </div>
            </div>
          )}
          {progress?.due_review && progress.due_review.length > 0 && (
            <div className="insight amber">
              <div className="insight-label">
                Due for review ({progress.due_review.length})
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.375rem",
                  marginTop: "0.5rem",
                }}
              >
                {progress.due_review.map((r) => (
                  <span key={r.concept_id} className="tag">
                    {r.concept_title}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))",
              gap: "0.75rem",
            }}
          >
            {TRACKS.map((track) => {
              const pct = getTrackPct(track.id);
              return (
                <button
                  key={track.id}
                  onClick={() =>
                    setSelected(selected === track.id ? null : track.id)
                  }
                  style={{
                    background:
                      selected === track.id ? "var(--bg-5)" : "var(--bg-3)",
                    border: `1px solid ${selected === track.id ? track.color + "40" : "var(--b1)"}`,
                    borderRadius: "var(--r)",
                    padding: "0.875rem",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: track.color,
                      marginBottom: 3,
                    }}
                  >
                    {track.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--t4)",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {track.concepts.length} concepts
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%`, background: track.color }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--t4)",
                      marginTop: 3,
                    }}
                  >
                    {pct.toFixed(0)}% complete
                  </div>
                </button>
              );
            })}
          </div>
          {selected && (
            <div className="card fade-in">
              <div className="section-title" style={{ marginBottom: "1rem" }}>
                {TRACKS.find((t) => t.id === selected)?.label}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {TRACKS.find((t) => t.id === selected)?.concepts.map((c) => {
                  const status = getStatus(c.id);
                  const nextAction: Record<
                    string,
                    { label: string; next: string }
                  > = {
                    not_started: { label: "Start", next: "in_progress" },
                    in_progress: { label: "Complete", next: "completed" },
                    completed: { label: "Master", next: "mastered" },
                    mastered: { label: "✓", next: "mastered" },
                  };
                  return (
                    <div key={c.id} className="list-item">
                      <div>
                        <div
                          style={{
                            fontSize: "0.825rem",
                            fontWeight: 500,
                            color: "var(--t1)",
                            marginBottom: 2,
                          }}
                        >
                          {c.title}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.375rem",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{ fontSize: "0.68rem", color: "var(--t3)" }}
                          >
                            {c.desc}
                          </span>
                          <span
                            className={`badge ${DIFF_BADGES[c.difficulty]}`}
                          >
                            {c.difficulty}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: STATUS_COLORS[status],
                            fontWeight: 500,
                          }}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                        {status !== "mastered" && (
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() =>
                              markStatus(
                                selected,
                                c.id,
                                c.title,
                                nextAction[status].next,
                              )
                            }
                          >
                            {nextAction[status].label}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GLOSSARY ── */}
      {tab === "glossary" && (
        <div
          className="stagger"
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div className="card">
            <div
              style={{
                display: "flex",
                gap: "0.625rem",
                marginBottom: "0.875rem",
              }}
            >
              <input
                className="input"
                placeholder="Define any financial term (e.g. P/E ratio, EBITDA, WACC)..."
                value={glossTerm}
                onChange={(e) => setGlossTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupGloss()}
              />
              <button
                className="btn btn-primary"
                onClick={lookupGloss}
                disabled={glossLoading || !glossTerm.trim()}
              >
                {glossLoading ? "..." : "Define"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {[
                "compound interest",
                "P/E ratio",
                "EBITDA",
                "Roth IRA",
                "dollar-cost averaging",
                "WACC",
                "beta",
                "yield curve",
                "basis points",
                "amortization",
                "arbitrage",
                "CAGR",
              ].map((t) => (
                <button
                  key={t}
                  className="tag"
                  onClick={() => {
                    setGlossTerm(t);
                    setTimeout(lookupGloss, 50);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {glossResult && (
            <div className="card fade-in">
              <h2
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "var(--green)",
                  letterSpacing: "-0.02em",
                  marginBottom: "0.875rem",
                }}
              >
                {glossResult.term}
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  lineHeight: 1.75,
                  color: "var(--t1)",
                  marginBottom: "1rem",
                }}
              >
                {glossResult.definition}
              </p>
              {glossResult.example && (
                <div
                  style={{
                    background: "var(--bg-4)",
                    borderRadius: "var(--r)",
                    padding: "0.875rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--t3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: 4,
                    }}
                  >
                    Example
                  </div>
                  <p
                    style={{
                      fontSize: "0.825rem",
                      color: "var(--t2)",
                      lineHeight: 1.6,
                    }}
                  >
                    {glossResult.example}
                  </p>
                </div>
              )}
              {glossResult.related_terms?.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--t3)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Related terms
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.375rem",
                    }}
                  >
                    {glossResult.related_terms.map((t: string) => (
                      <button
                        key={t}
                        className="tag"
                        onClick={() => {
                          setGlossTerm(t);
                          setTimeout(lookupGloss, 50);
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--t4)",
                  marginTop: "1rem",
                }}
              >
                Source: {glossResult.source}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAX SCHOOL ── */}
      {tab === "taxschool" && (
        <div
          className="stagger"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div className="insight">
            <div className="insight-label">Tax school</div>20 lessons covering
            everything from how brackets work to advanced strategies like Roth
            conversions and tax-loss harvesting.
          </div>
          {[
            { n: 1, t: "How tax brackets actually work", done: true },
            { n: 2, t: "Standard vs itemized deductions", done: true },
            { n: 3, t: "W-4 and withholding — why it matters", done: false },
            { n: 4, t: "Capital gains: short vs long term", done: false },
            { n: 5, t: "Roth IRA vs Traditional IRA", done: false },
            { n: 6, t: "401k, 403b, and solo 401k basics", done: false },
            { n: 7, t: "HSA: the triple tax advantage", done: false },
            { n: 8, t: "Self-employment taxes and quarterly pay", done: false },
            { n: 9, t: "Business deductions for freelancers", done: false },
            { n: 10, t: "Tax-loss harvesting strategies", done: false },
            { n: 11, t: "Backdoor Roth IRA conversion", done: false },
            { n: 12, t: "RMDs and retirement distribution rules", done: false },
            { n: 13, t: "Estate taxes and gifting strategies", done: false },
            { n: 14, t: "Filing status — which to choose", done: false },
            { n: 15, t: "The FICA tax: SS + Medicare breakdown", done: false },
          ].map((lesson) => (
            <div key={lesson.n} className="list-item">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: lesson.done ? "var(--green)" : "var(--bg-5)",
                    border: `1px solid ${lesson.done ? "var(--green)" : "var(--b2)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontFamily: "var(--mono)",
                    color: lesson.done ? "#041a0c" : "var(--t3)",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {lesson.done ? "✓" : lesson.n}
                </div>
                <span
                  style={{
                    fontSize: "0.825rem",
                    color: lesson.done ? "var(--t2)" : "var(--t1)",
                    fontWeight: lesson.done ? 400 : 500,
                  }}
                >
                  {lesson.t}
                </span>
              </div>
              <span
                className={`badge ${lesson.done ? "badge-green" : "badge-gray"}`}
              >
                {lesson.done ? "Done" : "Coming"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── IB / FINANCE SCHOOL ── */}
      {tab === "ibschool" && (
        <div
          className="stagger"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div
            className="insight blue"
            style={{
              borderLeftColor: "var(--blue)",
              background: "var(--blue-bg)",
            }}
          >
            <div className="insight-label" style={{ color: "var(--blue)" }}>
              Investment Banking & Corporate Finance School
            </div>
            Wall Street skills for everyone. Learn DCF models, M&A analysis, LBO
            mechanics, and how to read company financials.
          </div>
          {[
            { n: 1, t: "Reading an income statement", cat: "Accounting" },
            { n: 2, t: "Balance sheet fundamentals", cat: "Accounting" },
            { n: 3, t: "Cash flow statement analysis", cat: "Accounting" },
            { n: 4, t: "Key financial ratios", cat: "Analysis" },
            { n: 5, t: "DCF valuation — step by step", cat: "Valuation" },
            {
              n: 6,
              t: "Comparable company analysis (comps)",
              cat: "Valuation",
            },
            { n: 7, t: "Precedent transaction analysis", cat: "M&A" },
            { n: 8, t: "M&A deal mechanics", cat: "M&A" },
            { n: 9, t: "LBO model basics", cat: "PE/VC" },
            { n: 10, t: "Venture capital term sheets", cat: "PE/VC" },
            {
              n: 11,
              t: "IPO process — from S-1 to listing",
              cat: "Capital Markets",
            },
            { n: 12, t: "Bond pricing and duration", cat: "Fixed Income" },
            {
              n: 13,
              t: "Options pricing and the Black-Scholes",
              cat: "Derivatives",
            },
            { n: 14, t: "WACC and cost of capital", cat: "Corporate Finance" },
            { n: 15, t: "Accretion/dilution analysis", cat: "M&A" },
          ].map((lesson) => {
            const CATS: Record<string, string> = {
              Accounting: "badge-blue",
              Analysis: "badge-gray",
              Valuation: "badge-green",
              "M&A": "badge-amber",
              "PE/VC": "badge-purple",
              "Capital Markets": "badge-blue",
              "Fixed Income": "badge-gray",
              Derivatives: "badge-amber",
              "Corporate Finance": "badge-green",
            };
            return (
              <div key={lesson.n} className="list-item">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--bg-5)",
                      border: "1px solid var(--b2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontFamily: "var(--mono)",
                      color: "var(--t3)",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {lesson.n}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.825rem",
                        color: "var(--t1)",
                        fontWeight: 500,
                      }}
                    >
                      {lesson.t}
                    </div>
                  </div>
                </div>
                <span className={`badge ${CATS[lesson.cat] || "badge-gray"}`}>
                  {lesson.cat}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
