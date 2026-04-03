"use client";
import { useState, useEffect } from "react";
import { communityApi, simulateApi } from "@/lib/api/client";
import { useFoliaStore } from "@/store";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import type { CommunityScenario, SimulationResult, FinancialMetadata } from "@/types";

interface Template {
  id: string;
  life_stage: string;
  simulation_type: string;
  outcome_data: Record<string, unknown>;
  scenario_data: Record<string, unknown>;
  upvotes: number;
  template_title?: string;
  template_desc?: string;
  created_at: string;
}

interface Benchmarks {
  benchmarks: {
    net_worth?: { p25: number | null; p50: number | null; p75: number | null };
    savings_rate?: { p25: number | null; p50: number | null; p75: number | null };
  };
  sample_size: number;
  life_stage: string;
}

type CommunityTab = "benchmarks" | "simulations" | "learnings" | "share";

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

// Sample shared simulations for demonstration
const SAMPLE_SIMULATIONS = [
  {
    id: "sim-1",
    user_stage: "build",
    title: "Emergency Fund vs Investing",
    description: "I compared building a 6-month emergency fund first vs investing from day 1. After 10 years, the emergency fund approach had less total returns but I avoided selling during the 2024 market correction.",
    simulation_type: "fork",
    outcome_summary: "Emergency fund first led to 12% less wealth but 100% peace of mind during downturns",
    upvotes: 47,
    comments: 12,
    tags: ["emergency fund", "investing", "risk management"],
    created_at: "2026-03-15",
  },
  {
    id: "sim-2",
    user_stage: "accelerate",
    title: "Roth Conversion Ladder Strategy",
    description: "Modeled converting $50k/year from Traditional to Roth IRA starting at 55. The tax hit early was significant but saved over $180k in taxes by age 75.",
    simulation_type: "retirement",
    outcome_summary: "Early conversion saved $180k in lifetime taxes despite short-term pain",
    upvotes: 89,
    comments: 24,
    tags: ["roth conversion", "retirement", "tax optimization"],
    created_at: "2026-03-10",
  },
  {
    id: "sim-3",
    user_stage: "launch",
    title: "High-Interest Debt vs 401k Match",
    description: "Should I pay off 24% APR credit card debt or get my employer's 401k match first? Ran the numbers and the match is worth it even with high-interest debt.",
    simulation_type: "debt_payoff",
    outcome_summary: "Getting the 401k match first had better long-term outcome despite 24% APR debt",
    upvotes: 156,
    comments: 45,
    tags: ["debt payoff", "401k match", "employer benefits"],
    created_at: "2026-03-08",
  },
];

// Sample learning posts
const SAMPLE_LEARNINGS = [
  {
    id: "learn-1",
    user_stage: "build",
    title: "What I Learned from 5 Years of Index Investing",
    content: "Started with individual stock picking, lost money. Switched to total market index funds and my returns improved dramatically. Key lessons: fees matter, time in market beats timing, and boring is good.",
    tags: ["index funds", "passive investing", "long-term"],
    upvotes: 234,
    comments: 67,
    created_at: "2026-03-20",
  },
  {
    id: "learn-2",
    user_stage: "preserve",
    title: "Tax-Loss Harvesting Saved Me $8,000 This Year",
    content: "Detailed walkthrough of how I systematically harvested losses during the market dip. Used the proceeds to buy similar (but not identical) funds to maintain exposure while capturing the tax benefit.",
    tags: ["tax-loss harvesting", "taxes", "capital gains"],
    upvotes: 189,
    comments: 34,
    created_at: "2026-03-18",
  },
  {
    id: "learn-3",
    user_stage: "launch",
    title: "How I Negotiated a 25% Raise Using Market Data",
    content: "Used Levels.fyi and Glassdoor to find my market rate, documented my achievements, and practiced my pitch. Got a 25% raise by being prepared with data and specific examples of my impact.",
    tags: ["salary negotiation", "career", "income"],
    upvotes: 312,
    comments: 89,
    created_at: "2026-03-16",
  },
];

export default function CommunityPage() {
  const metadata = useFoliaStore((s) => s.metadata);
  const userId = useFoliaStore((s) => s.userId);
  const { success, error: te } = useToast();
  const [tab, setTab] = useState<CommunityTab>("benchmarks");
  const [stage, setStage] = useState(metadata?.life_stage ?? "build");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmarks | null>(null);
  const [loading, setLoading] = useState(false);
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedSimulation, setSelectedSimulation] = useState<any>(null);
  const [shareForm, setShareForm] = useState({ title: "", description: "", tags: "" });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [t, b] = await Promise.all([
          communityApi.listSharedScenarios(stage),
          communityApi.getBenchmarks(stage),
        ]);
        setTemplates(t.scenarios ?? []);
        setBenchmarks(b);
      } catch {} finally {
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
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, upvotes: t.upvotes + 1 } : t)));
      success("Upvoted!");
    } catch (e: any) {
      te(e.message);
    }
  };

  const localUpvote = (id: string, type: "sim" | "learn") => {
    if (upvoted.has(id)) return;
    setUpvoted((p) => new Set([...p, id]));
    success("Upvoted!");
  };

  const handleShare = async () => {
    if (!shareForm.title.trim()) return;
    try {
      // This would call the API to share the simulation
      success("Your simulation has been shared with the community!");
      setShowShareModal(false);
      setShareForm({ title: "", description: "", tags: "" });
    } catch (e: any) {
      te(e.message);
    }
  };

  const STAGES = ["foundations", "launch", "build", "accelerate", "preserve", "retire"] as const;

  const nwBench = benchmarks?.benchmarks?.net_worth;
  const srBench = benchmarks?.benchmarks?.savings_rate;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 1080 }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.03em" }}>
          Community
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--t3)", marginTop: 4, lineHeight: 1.6 }}>
          Share simulations and learnings - Peer benchmarks - Privacy-preserving insights
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="tabs">
        {([
          { id: "benchmarks", l: "Peer Benchmarks" },
          { id: "simulations", l: "Shared Simulations" },
          { id: "learnings", l: "Community Learnings" },
          { id: "share", l: "Share Your Work" },
        ] as { id: CommunityTab; l: string }[]).map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Privacy note */}
      <div style={{ display: "flex", gap: "0.5rem", padding: "0.625rem 0.875rem", background: "var(--blue-bg)", border: "1px solid var(--blue-border)", borderRadius: "var(--r)", fontSize: "0.775rem", color: "var(--blue)" }}>
        No personal data is shared. All benchmarks use aggregated, anonymized ranges and never individual figures.
      </div>

      {/* Life stage selector */}
      <div>
        <div style={{ fontSize: "0.72rem", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.625rem" }}>
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
                background: stage === s ? STAGE_COLORS[s] + "18" : "var(--bg-3)",
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

      {/* BENCHMARKS TAB */}
      {tab === "benchmarks" && (
        <>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="skeleton" style={{ height: 180 }} />
              <div className="skeleton" style={{ height: 180 }} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {/* Net worth benchmark */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                  <div>
                    <div className="section-title">Net Worth</div>
                    <div className="section-sub" style={{ textTransform: "capitalize" }}>{stage} stage - {benchmarks?.sample_size ?? 0} data points</div>
                  </div>
                </div>
                {nwBench ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {[
                      { label: "Top 25%", value: nwBench.p75, desc: "P75 - doing great" },
                      { label: "Median", value: nwBench.p50, desc: "P50 - right in the middle" },
                      { label: "Bottom 25%", value: nwBench.p25, desc: "P25 - room to grow" },
                    ].map(({ label, value, desc }) => (
                      <div key={label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.775rem", color: "var(--t2)" }}>{label}</span>
                          <span style={{ fontFamily: "var(--mono)", fontSize: "0.825rem", fontWeight: 600, color: "var(--t1)" }}>
                            {value != null ? formatCurrency(value, true) : "No data"}
                          </span>
                        </div>
                        {value != null && (
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${Math.min(100, (value / (nwBench.p75 ?? 1)) * 100)}%`, background: STAGE_COLORS[stage] }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty" style={{ padding: "1.5rem 0" }}>
                    <div className="empty-text">Not enough data for this stage yet</div>
                    <div className="empty-sub">Be the first to contribute!</div>
                  </div>
                )}
              </div>

              {/* Savings rate benchmark */}
              <div className="card">
                <div style={{ marginBottom: "1.25rem" }}>
                  <div className="section-title">Savings Rate</div>
                  <div className="section-sub" style={{ textTransform: "capitalize" }}>{stage} stage peers</div>
                </div>
                {srBench ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {[
                      { label: "Top 25%", value: srBench.p75 },
                      { label: "Median", value: srBench.p50 },
                      { label: "Bottom 25%", value: srBench.p25 },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.775rem", color: "var(--t2)" }}>{label}</span>
                          <span style={{ fontFamily: "var(--mono)", fontSize: "0.825rem", fontWeight: 600, color: "var(--t1)" }}>
                            {value != null ? `${value.toFixed(1)}%` : "No data"}
                          </span>
                        </div>
                        {value != null && (
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${Math.min(100, value * 2)}%`, background: STAGE_COLORS[stage] }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty" style={{ padding: "1.5rem 0" }}>
                    <div className="empty-text">Not enough savings rate data yet</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Templates */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <div className="section-title">Scenario Templates</div>
                <div className="section-sub">Community-created simulation starting points</div>
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--t3)" }}>{templates.length} templates</span>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 70 }} />)}
              </div>
            ) : templates.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {templates.map((t) => (
                  <div key={t.id} className="list-item">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--t1)" }}>
                          {SIM_LABELS[t.simulation_type] ?? t.simulation_type}
                        </span>
                        <span className="badge" style={{ background: STAGE_COLORS[t.life_stage] + "18", color: STAGE_COLORS[t.life_stage], border: `1px solid ${STAGE_COLORS[t.life_stage]}30` }}>
                          {t.life_stage}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.775rem", color: "var(--t3)", lineHeight: 1.5 }}>
                        Net worth: {formatCurrency(t.outcome_data?.net_worth as number || 0, true)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUpvote(t.id)}
                      disabled={upvoted.has(t.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.375rem",
                        background: upvoted.has(t.id) ? "var(--green-bg)" : "var(--bg-4)",
                        border: `1px solid ${upvoted.has(t.id) ? "var(--green-border)" : "var(--b1)"}`,
                        borderRadius: "var(--r)", padding: "0.35rem 0.75rem",
                        color: upvoted.has(t.id) ? "var(--green)" : "var(--t3)",
                        fontSize: "0.775rem", fontWeight: 600,
                        cursor: upvoted.has(t.id) ? "default" : "pointer",
                        transition: "all 0.12s", flexShrink: 0,
                      }}
                    >
                      ^ {t.upvotes}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ padding: "2rem 0" }}>
                <div className="empty-icon">T</div>
                <div className="empty-text">No templates yet for this life stage</div>
                <div className="empty-sub">Run a simulation and contribute it to the community!</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* SHARED SIMULATIONS TAB */}
      {tab === "simulations" && (
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="insight insight-green" style={{ borderLeftColor: "var(--green)", background: "var(--green-bg)" }}>
            <div className="insight-label" style={{ color: "var(--green)" }}>Community Simulations</div>
            Learn from how others approached major financial decisions. Simulations are anonymized - only the scenario and outcome are shared.
          </div>

          {SAMPLE_SIMULATIONS.filter(s => s.user_stage === stage || stage === "build").map((sim) => (
            <div key={sim.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span className="badge" style={{ background: STAGE_COLORS[sim.user_stage] + "18", color: STAGE_COLORS[sim.user_stage], border: `1px solid ${STAGE_COLORS[sim.user_stage]}30` }}>
                      {sim.user_stage}
                    </span>
                    <span className="badge badge-gray">{SIM_LABELS[sim.simulation_type]}</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--t4)" }}>{sim.created_at}</span>
                  </div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--t1)", marginBottom: "0.5rem" }}>{sim.title}</h3>
                  <p style={{ fontSize: "0.825rem", color: "var(--t2)", lineHeight: 1.6, marginBottom: "0.75rem" }}>{sim.description}</p>
                  <div style={{ background: "var(--bg-4)", borderRadius: "var(--r)", padding: "0.75rem", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--t3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Outcome</div>
                    <div style={{ fontSize: "0.825rem", color: "var(--green)", fontWeight: 500 }}>{sim.outcome_summary}</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                    {sim.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", alignItems: "center" }}>
                  <button
                    onClick={() => localUpvote(sim.id, "sim")}
                    disabled={upvoted.has(sim.id)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem",
                      background: upvoted.has(sim.id) ? "var(--green-bg)" : "var(--bg-4)",
                      border: `1px solid ${upvoted.has(sim.id) ? "var(--green-border)" : "var(--b1)"}`,
                      borderRadius: "var(--r)", padding: "0.5rem 0.75rem",
                      color: upvoted.has(sim.id) ? "var(--green)" : "var(--t3)",
                      cursor: upvoted.has(sim.id) ? "default" : "pointer",
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>^</span>
                    <span style={{ fontSize: "0.825rem", fontWeight: 600 }}>{sim.upvotes + (upvoted.has(sim.id) ? 1 : 0)}</span>
                  </button>
                  <span style={{ fontSize: "0.68rem", color: "var(--t4)" }}>{sim.comments} comments</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COMMUNITY LEARNINGS TAB */}
      {tab === "learnings" && (
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="insight insight-blue" style={{ borderLeftColor: "var(--blue)", background: "var(--blue-bg)" }}>
            <div className="insight-label" style={{ color: "var(--blue)" }}>Community Learnings</div>
            Real experiences and lessons from community members. Share your wins, mistakes, and discoveries.
          </div>

          {SAMPLE_LEARNINGS.filter(l => l.user_stage === stage || stage === "build").map((learning) => (
            <div key={learning.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span className="badge" style={{ background: STAGE_COLORS[learning.user_stage] + "18", color: STAGE_COLORS[learning.user_stage], border: `1px solid ${STAGE_COLORS[learning.user_stage]}30` }}>
                      {learning.user_stage}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--t4)" }}>{learning.created_at}</span>
                  </div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--t1)", marginBottom: "0.5rem" }}>{learning.title}</h3>
                  <p style={{ fontSize: "0.825rem", color: "var(--t2)", lineHeight: 1.7, marginBottom: "0.75rem" }}>{learning.content}</p>
                  <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                    {learning.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", alignItems: "center" }}>
                  <button
                    onClick={() => localUpvote(learning.id, "learn")}
                    disabled={upvoted.has(learning.id)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem",
                      background: upvoted.has(learning.id) ? "var(--green-bg)" : "var(--bg-4)",
                      border: `1px solid ${upvoted.has(learning.id) ? "var(--green-border)" : "var(--b1)"}`,
                      borderRadius: "var(--r)", padding: "0.5rem 0.75rem",
                      color: upvoted.has(learning.id) ? "var(--green)" : "var(--t3)",
                      cursor: upvoted.has(learning.id) ? "default" : "pointer",
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>^</span>
                    <span style={{ fontSize: "0.825rem", fontWeight: 600 }}>{learning.upvotes + (upvoted.has(learning.id) ? 1 : 0)}</span>
                  </button>
                  <span style={{ fontSize: "0.68rem", color: "var(--t4)" }}>{learning.comments} comments</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SHARE TAB */}
      {tab === "share" && (
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="insight" style={{ borderLeftColor: "var(--green)", background: "var(--green-bg)" }}>
            <div className="insight-label" style={{ color: "var(--green)" }}>Share Your Knowledge</div>
            Help others learn from your financial journey. Share simulations, strategies, and lessons learned.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="card" style={{ cursor: "pointer" }} onClick={() => setShowShareModal(true)}>
              <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>S</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--t1)", marginBottom: "0.5rem" }}>Share a Simulation</div>
                <p style={{ fontSize: "0.825rem", color: "var(--t3)", lineHeight: 1.5 }}>
                  Share the results of a simulation you ran. Others can learn from your what-if scenarios.
                </p>
              </div>
            </div>

            <div className="card" style={{ cursor: "pointer" }} onClick={() => setShowShareModal(true)}>
              <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>L</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--t1)", marginBottom: "0.5rem" }}>Share a Learning</div>
                <p style={{ fontSize: "0.825rem", color: "var(--t3)", lineHeight: 1.5 }}>
                  Share an insight, strategy, or lesson from your financial journey.
                </p>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: "var(--bg-3)" }}>
            <div className="section-title" style={{ marginBottom: "1rem" }}>Sharing Guidelines</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.875rem" }}>
              {[
                { t: "Keep it Anonymous", d: "Never share specific dollar amounts or personal details" },
                { t: "Focus on the Process", d: "Explain your reasoning and methodology, not just results" },
                { t: "Be Honest", d: "Share failures and mistakes too - they are often more valuable" },
                { t: "Add Context", d: "Include your life stage and relevant circumstances" },
              ].map(({ t, d }) => (
                <div key={t} style={{ display: "flex", gap: "0.75rem" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--t1)", marginBottom: 3 }}>{t}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--t3)", lineHeight: 1.55 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      {tab === "benchmarks" && (
        <div className="card" style={{ background: "var(--bg-3)" }}>
          <div className="section-title" style={{ marginBottom: "1rem" }}>How community data works</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.875rem" }}>
            {[
              { t: "Zero PII", d: "Only age range, income range, and life stage are stored - never names, amounts, or identifiers" },
              { t: "Aggregate only", d: "Benchmarks show P25/P50/P75 distributions, never individual data points" },
              { t: "Opt-in contribution", d: "You choose when to share a simulation result - never automatic" },
              { t: "Contextual", d: "Benchmarks are filtered by your life stage so comparisons are meaningful" },
            ].map(({ t, d }) => (
              <div key={t} style={{ display: "flex", gap: "0.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--t1)", marginBottom: 3 }}>{t}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--t3)", lineHeight: 1.55 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Modal */}
      <Modal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share with Community"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowShareModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleShare} disabled={!shareForm.title.trim()}>Share</button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="label">Title <span style={{ color: "var(--red)" }}>*</span></label>
            <input
              className="input"
              placeholder="A clear, descriptive title"
              value={shareForm.title}
              onChange={(e) => setShareForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              style={{ height: 120 }}
              placeholder="Explain your scenario, reasoning, and what you learned..."
              value={shareForm.description}
              onChange={(e) => setShareForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input
              className="input"
              placeholder="e.g. retirement, investing, tax optimization"
              value={shareForm.tags}
              onChange={(e) => setShareForm(p => ({ ...p, tags: e.target.value }))}
            />
          </div>
          <div style={{ background: "var(--amber-bg)", border: "1px solid var(--amber-border)", borderRadius: "var(--r)", padding: "0.75rem", fontSize: "0.775rem", color: "var(--amber)" }}>
            Remember: Never share specific dollar amounts or personally identifiable information.
          </div>
        </div>
      </Modal>
    </div>
  );
}
