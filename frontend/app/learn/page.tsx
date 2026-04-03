"use client";
import { useState, useEffect } from "react";
import { useEducationProgress } from "@/hooks";
import { glossaryApi, educationApi } from "@/lib/api/client";
import { useFoliaStore } from "@/store";
import type { EducationTrack } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";

type LearnTab = "curriculum" | "glossary" | "taxschool" | "ibschool";

// Comprehensive quiz questions for each concept
const QUIZ_DATA: Record<string, { question: string; options: string[]; correct: number; explanation: string }[]> = {
  "budget-5030-20": [
    { question: "In the 50/30/20 rule, what percentage should go to needs?", options: ["30%", "50%", "20%", "40%"], correct: 1, explanation: "50% of after-tax income should cover needs like housing, food, and utilities." },
    { question: "Which of these is considered a 'want' in the 50/30/20 rule?", options: ["Rent payment", "Netflix subscription", "Minimum debt payment", "Groceries"], correct: 1, explanation: "Entertainment subscriptions like Netflix are wants, not needs." },
    { question: "The 20% savings portion should NOT include:", options: ["Emergency fund", "Retirement contributions", "Vacation fund", "All of these should be included"], correct: 2, explanation: "Vacation savings is discretionary (a want), not part of the 20% savings/debt repayment category." },
  ],
  "emergency-fund": [
    { question: "How many months of expenses should an emergency fund cover?", options: ["1-2 months", "3-6 months", "12+ months", "Only $1,000"], correct: 1, explanation: "Financial experts recommend 3-6 months of essential living expenses." },
    { question: "Where should you keep your emergency fund?", options: ["Under your mattress", "In stocks", "High-yield savings account", "Cryptocurrency"], correct: 2, explanation: "A high-yield savings account provides easy access while earning interest." },
    { question: "What qualifies as an 'emergency' for this fund?", options: ["New TV sale", "Job loss", "Concert tickets", "Birthday gift"], correct: 1, explanation: "Emergencies include job loss, medical bills, and unexpected essential repairs." },
  ],
  "compound-interest": [
    { question: "What is compound interest?", options: ["Interest on principal only", "Interest on principal and accumulated interest", "A fixed interest rate", "Government bond interest"], correct: 1, explanation: "Compound interest is 'interest on interest' - you earn returns on both principal and previous gains." },
    { question: "A $10,000 investment at 8% annual return will be worth approximately how much after 40 years?", options: ["$18,000", "$42,000", "$217,000", "$500,000"], correct: 2, explanation: "With compound interest at 8%, $10,000 grows to over $217,000 in 40 years." },
    { question: "Starting to invest at 25 vs 35 (same contribution) typically results in:", options: ["Same ending balance", "Slightly more", "About double the balance", "No difference"], correct: 2, explanation: "Starting 10 years earlier can roughly double your final balance due to compounding." },
  ],
  "fico-factors": [
    { question: "What is the MOST important factor in your FICO score?", options: ["Credit utilization", "Payment history", "Length of credit history", "Credit mix"], correct: 1, explanation: "Payment history accounts for 35% of your FICO score - the largest factor." },
    { question: "What percentage of your FICO score is based on amounts owed?", options: ["10%", "15%", "30%", "35%"], correct: 2, explanation: "Amounts owed (credit utilization) accounts for 30% of your score." },
    { question: "A FICO score of 720 is considered:", options: ["Poor", "Fair", "Good", "Excellent"], correct: 2, explanation: "A score of 720 falls in the 'good' range (670-739). Excellent is 800+." },
  ],
  "index-funds-why": [
    { question: "What percentage of actively managed funds underperform index funds over 10+ years?", options: ["25%", "50%", "75%", "85%"], correct: 3, explanation: "Studies show about 85% of actively managed funds underperform their benchmark indices over 10+ years." },
    { question: "Why do index funds typically outperform active funds?", options: ["Better stock picks", "Lower fees", "More trading", "Government backing"], correct: 1, explanation: "Lower expense ratios (0.03-0.10% vs 0.5-1%+) are the main reason for outperformance." },
    { question: "An index fund tracking the S&P 500 holds:", options: ["5 companies", "100 companies", "500 companies", "1000 companies"], correct: 2, explanation: "The S&P 500 index contains 500 large-cap U.S. companies." },
  ],
  "diversification": [
    { question: "What is the main purpose of diversification?", options: ["Maximize returns", "Reduce risk", "Beat the market", "Lower taxes"], correct: 1, explanation: "Diversification reduces portfolio risk by spreading investments across different assets." },
    { question: "A well-diversified portfolio should include:", options: ["Only tech stocks", "Only bonds", "Mix of asset classes", "Only index funds"], correct: 2, explanation: "Diversification means spreading investments across stocks, bonds, real estate, and other asset classes." },
    { question: "Diversification can eliminate which type of risk?", options: ["Market risk", "Systematic risk", "Unsystematic risk", "All risk"], correct: 2, explanation: "Diversification eliminates unsystematic (company-specific) risk, but not systematic (market) risk." },
  ],
  "marginal-vs-effective": [
    { question: "Your marginal tax rate is:", options: ["Your total tax divided by income", "The rate on your last dollar earned", "Your average tax rate", "The lowest bracket rate"], correct: 1, explanation: "Marginal rate is the tax rate applied to your next (or last) dollar of income." },
    { question: "If you're in the 24% bracket, what tax do you actually pay?", options: ["24% on all income", "Less than 24% on average", "24% plus state tax", "24% only on wages"], correct: 1, explanation: "Due to progressive brackets, your effective (average) rate is lower than your marginal rate." },
    { question: "Which rate matters most for financial decisions about additional income?", options: ["Effective rate", "Marginal rate", "State rate", "FICA rate"], correct: 1, explanation: "Marginal rate determines tax on additional income, making it key for decision-making." },
  ],
  "roth-vs-traditional": [
    { question: "When are Roth IRA withdrawals taxed?", options: ["When contributed", "When withdrawn", "Both times", "Never taxed"], correct: 3, explanation: "Roth contributions are after-tax, and qualified withdrawals are tax-free." },
    { question: "Who benefits most from a Roth IRA?", options: ["High earners near retirement", "Young people in low tax brackets", "Self-employed only", "Those with no employer plan"], correct: 1, explanation: "Young people expecting higher future tax brackets benefit most from Roth's tax-free growth." },
    { question: "Traditional IRA contributions are:", options: ["Tax-free forever", "Tax-deductible now, taxed later", "Never tax-deductible", "Taxed at capital gains rate"], correct: 1, explanation: "Traditional IRA offers tax deduction now; you pay taxes when you withdraw in retirement." },
  ],
};

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
      { id: "budget-5030-20", title: "50/30/20 budget rule", desc: "The 50/30/20 rule is a simple budgeting method: 50% for needs, 30% for wants, and 20% for savings and debt repayment.", difficulty: "beginner" },
      { id: "emergency-fund", title: "Emergency fund", desc: "An emergency fund is a savings account for unexpected expenses - aim for 3-6 months of essential expenses.", difficulty: "beginner" },
      { id: "compound-interest", title: "Compound interest", desc: "Compound interest is interest on both principal and accumulated interest - the key to building wealth over time.", difficulty: "beginner" },
      { id: "hysa", title: "High-yield savings account", desc: "A HYSA offers significantly higher interest rates than traditional savings accounts, often 4-5% APY.", difficulty: "beginner" },
      { id: "net-worth-calc", title: "Net worth calculation", desc: "Net worth = total assets minus total liabilities. Track this over time to measure financial progress.", difficulty: "beginner" },
      { id: "insurance-basics", title: "Insurance basics", desc: "Insurance transfers risk from you to an insurance company. Key types: health, life, auto, home/renters.", difficulty: "intermediate" },
    ],
  },
  {
    id: "credit_debt",
    label: "Credit & Debt",
    color: "var(--coral)",
    concepts: [
      { id: "fico-factors", title: "FICO score factors", desc: "Your FICO score is based on payment history (35%), amounts owed (30%), history length (15%), new credit (10%), and credit mix (10%).", difficulty: "beginner" },
      { id: "credit-util", title: "Credit utilization", desc: "Credit utilization is your balance divided by your credit limit. Keep it below 30% for a healthy score.", difficulty: "beginner" },
      { id: "avalanche-vs-snowball", title: "Avalanche vs Snowball", desc: "Avalanche pays highest interest first (saves money). Snowball pays smallest balance first (builds momentum).", difficulty: "intermediate" },
      { id: "apr-apy-diff", title: "APR vs APY", desc: "APR is the simple annual rate. APY includes compounding. Always compare APY for savings, APR for loans.", difficulty: "intermediate" },
      { id: "dti-ratio", title: "Debt-to-income ratio", desc: "DTI is monthly debt payments divided by gross income. Keep it below 36% for good financial health.", difficulty: "intermediate" },
    ],
  },
  {
    id: "investing",
    label: "Investing",
    color: "var(--green)",
    concepts: [
      { id: "index-funds-why", title: "Why index funds win", desc: "Index funds outperform 85% of active funds over 10+ years due to lower fees and broad diversification.", difficulty: "beginner" },
      { id: "etf-vs-mutual", title: "ETF vs mutual fund", desc: "ETFs trade like stocks throughout the day. Mutual funds are priced once daily. Both can track indices.", difficulty: "intermediate" },
      { id: "diversification", title: "Diversification", desc: "Spreading investments across asset classes reduces risk without sacrificing expected returns.", difficulty: "intermediate" },
      { id: "pe-ratio-explained", title: "P/E ratio", desc: "Price-to-Earnings ratio shows how much investors pay for $1 of earnings. Lower isn't always better.", difficulty: "intermediate" },
      { id: "dca-strategy", title: "Dollar-cost averaging", desc: "Investing fixed amounts regularly removes market timing risk and builds discipline.", difficulty: "beginner" },
      { id: "rebalancing", title: "Portfolio rebalancing", desc: "Periodically adjusting allocations back to targets forces you to sell high and buy low.", difficulty: "advanced" },
    ],
  },
  {
    id: "taxes",
    label: "Tax Literacy",
    color: "var(--amber)",
    concepts: [
      { id: "marginal-vs-effective", title: "Marginal vs effective rate", desc: "Marginal rate is on your next dollar. Effective rate is total tax divided by total income.", difficulty: "beginner" },
      { id: "roth-vs-traditional", title: "Roth vs Traditional IRA", desc: "Roth: pay taxes now, tax-free later. Traditional: deduct now, pay taxes in retirement.", difficulty: "intermediate" },
      { id: "capital-gains-rates", title: "Capital gains rates", desc: "Long-term (>1 year) gains are taxed at 0%, 15%, or 20%. Short-term gains are taxed as ordinary income.", difficulty: "intermediate" },
      { id: "tax-loss-harvest", title: "Tax-loss harvesting", desc: "Selling losers to offset gains can reduce taxes. Watch the wash sale rule (30 days).", difficulty: "advanced" },
      { id: "standard-vs-itemized", title: "Standard vs itemized deductions", desc: "Choose whichever is larger. Standard: fixed amount. Itemized: mortgage interest, state taxes, charity.", difficulty: "intermediate" },
    ],
  },
  {
    id: "career_income",
    label: "Career & Income",
    color: "var(--blue)",
    concepts: [
      { id: "salary-negotiation", title: "Salary negotiation", desc: "Research market rates, quantify your value, and negotiate total compensation, not just base salary.", difficulty: "intermediate" },
      { id: "401k-match-free", title: "401k employer match", desc: "Employer match is free money - always contribute at least enough to get the full match.", difficulty: "beginner" },
      { id: "total-comp-value", title: "Total compensation", desc: "Include salary, bonuses, equity, benefits, and perks when evaluating job offers.", difficulty: "intermediate" },
      { id: "gig-economy-taxes", title: "Gig economy taxes", desc: "Self-employed pay both halves of FICA (15.3%) plus income tax. Make quarterly estimated payments.", difficulty: "intermediate" },
    ],
  },
  {
    id: "advanced_finance",
    label: "Advanced Finance",
    color: "var(--purple)",
    concepts: [
      { id: "dcf-valuation", title: "DCF valuation", desc: "Discounted Cash Flow values an asset based on projected future cash flows discounted to present value.", difficulty: "advanced" },
      { id: "wacc-cost-capital", title: "WACC", desc: "Weighted Average Cost of Capital blends the cost of debt and equity financing.", difficulty: "advanced" },
      { id: "lbo-structure", title: "LBO basics", desc: "Leveraged Buyouts use debt to acquire companies, amplifying returns through leverage.", difficulty: "advanced" },
      { id: "options-greeks", title: "Options Greeks", desc: "Delta, Gamma, Theta, Vega, Rho measure how option prices change with various factors.", difficulty: "advanced" },
      { id: "financial-statements", title: "Reading financial statements", desc: "Income statement, balance sheet, and cash flow statement tell a company's financial story.", difficulty: "advanced" },
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
  const { success, error: showError } = useToast();
  
  // Lesson/Quiz state
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<{ id: string; title: string; desc: string; track: EducationTrack } | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const getStatus = (conceptId: string) =>
    progress?.progress?.find((p) => p.concept_id === conceptId)?.status ?? "not_started";
  const getQuizScore = (conceptId: string) =>
    progress?.progress?.find((p) => p.concept_id === conceptId)?.quiz_score;
  const getTrackPct = (trackId: EducationTrack) =>
    (progress?.by_track as any)?.[trackId]?.pct ?? 0;

  const markStatus = async (track: EducationTrack, conceptId: string, title: string, next: string) => {
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

  const startLesson = (track: EducationTrack, concept: { id: string; title: string; desc: string }) => {
    setActiveLesson({ ...concept, track });
    setActiveLessonId(concept.id);
    setShowQuiz(false);
    setQuizAnswers([]);
    setQuizSubmitted(false);
  };

  const startQuiz = () => {
    setShowQuiz(true);
    setQuizAnswers(new Array(QUIZ_DATA[activeLessonId!]?.length || 0).fill(-1));
    setQuizSubmitted(false);
  };

  const submitQuiz = async () => {
    if (!activeLessonId || !activeLesson) return;
    
    const questions = QUIZ_DATA[activeLessonId] || [];
    let correct = 0;
    questions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct) correct++;
    });
    
    const score = Math.round((correct / questions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);

    // Save quiz result
    try {
      await educationApi.recordQuiz(userId, activeLessonId, score);
      
      // Update status based on score
      const newStatus = score >= 90 ? "mastered" : score >= 70 ? "completed" : "in_progress";
      await educationApi.updateProgress({
        user_id: userId,
        track: activeLesson.track,
        concept_id: activeLessonId,
        concept_title: activeLesson.title,
        status: newStatus,
        quiz_score: score,
      });
      refetch();
    } catch {}
  };

  const lookupGloss = async () => {
    if (!glossTerm.trim()) return;
    setGlossLoading(true);
    try {
      const r = await glossaryApi.define(glossTerm.trim(), metadata?.literacy_level ?? "beginner");
      setGlossResult(r);
    } finally {
      setGlossLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 1080 }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.03em" }}>
          Learn
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--t3)", marginTop: 4 }}>
          Interactive lessons - Progress tracking - Quizzes - RAG-powered glossary
        </p>
      </div>
      <div className="tabs">
        {([
          { id: "curriculum", l: "Curriculum" },
          { id: "glossary", l: "Glossary" },
          { id: "taxschool", l: "Tax School" },
          { id: "ibschool", l: "Finance School" },
        ] as { id: LearnTab; l: string }[]).map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.l}
          </button>
        ))}
      </div>

      {/* CURRICULUM TAB */}
      {tab === "curriculum" && (
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Overall progress */}
          {progress && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1rem", background: "var(--bg-3)", borderRadius: "var(--r)", border: "1px solid var(--b1)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--t3)" }}>Overall progress</div>
              <div className="progress-track" style={{ flex: 1 }}>
                <div className="progress-fill" style={{ width: `${(progress.total_mastered / Math.max(1, TRACKS.reduce((a, t) => a + t.concepts.length, 0))) * 100}%` }} />
              </div>
              <div style={{ fontSize: "0.75rem", fontFamily: "var(--mono)", color: "var(--green)", fontWeight: 600 }}>
                {progress.total_mastered} / {TRACKS.reduce((a, t) => a + t.concepts.length, 0)} mastered
              </div>
            </div>
          )}

          {/* Due for review */}
          {progress?.due_review && progress.due_review.length > 0 && (
            <div className="insight amber">
              <div className="insight-label">Due for review ({progress.due_review.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.5rem" }}>
                {progress.due_review.map((r) => (
                  <span key={r.concept_id} className="tag">{r.concept_title}</span>
                ))}
              </div>
            </div>
          )}

          {/* Track cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: "0.75rem" }}>
            {TRACKS.map((track) => {
              const pct = getTrackPct(track.id);
              const completed = track.concepts.filter(c => ["completed", "mastered"].includes(getStatus(c.id))).length;
              return (
                <button
                  key={track.id}
                  onClick={() => setSelected(selected === track.id ? null : track.id)}
                  style={{
                    background: selected === track.id ? "var(--bg-5)" : "var(--bg-3)",
                    border: `1px solid ${selected === track.id ? track.color + "40" : "var(--b1)"}`,
                    borderRadius: "var(--r)",
                    padding: "0.875rem",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: track.color, marginBottom: 3 }}>{track.label}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--t4)", marginBottom: "0.75rem" }}>
                    {completed} / {track.concepts.length} completed
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: track.color }} />
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--t4)", marginTop: 3 }}>{pct.toFixed(0)}% complete</div>
                </button>
              );
            })}
          </div>

          {/* Selected track concepts */}
          {selected && (
            <div className="card fade-in">
              <div className="section-title" style={{ marginBottom: "1rem" }}>
                {TRACKS.find((t) => t.id === selected)?.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {TRACKS.find((t) => t.id === selected)?.concepts.map((c) => {
                  const status = getStatus(c.id);
                  const score = getQuizScore(c.id);
                  const hasQuiz = !!QUIZ_DATA[c.id];
                  return (
                    <div key={c.id} className="list-item">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.825rem", fontWeight: 500, color: "var(--t1)" }}>{c.title}</span>
                          <span className={`badge ${DIFF_BADGES[c.difficulty]}`}>{c.difficulty}</span>
                          {score !== undefined && (
                            <span style={{ fontSize: "0.68rem", fontFamily: "var(--mono)", color: score >= 70 ? "var(--green)" : "var(--amber)" }}>
                              Quiz: {score}%
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: "0.72rem", color: "var(--t3)", lineHeight: 1.5 }}>{c.desc}</p>
                      </div>
                      <div style={{ display: "flex", gap: "0.375rem", alignItems: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: "0.68rem", color: STATUS_COLORS[status], fontWeight: 500 }}>
                          {STATUS_LABELS[status]}
                        </span>
                        {hasQuiz && (
                          <button className="btn btn-primary btn-xs" onClick={() => startLesson(selected, c)}>
                            {status === "not_started" ? "Start" : "Review"}
                          </button>
                        )}
                        {!hasQuiz && status !== "mastered" && (
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => markStatus(selected, c.id, c.title, status === "not_started" ? "in_progress" : status === "in_progress" ? "completed" : "mastered")}
                          >
                            {status === "not_started" ? "Start" : status === "in_progress" ? "Complete" : "Master"}
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

      {/* GLOSSARY TAB */}
      {tab === "glossary" && (
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card">
            <div style={{ display: "flex", gap: "0.625rem", marginBottom: "0.875rem" }}>
              <input
                className="input"
                placeholder="Define any financial term (e.g. P/E ratio, EBITDA, WACC)..."
                value={glossTerm}
                onChange={(e) => setGlossTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupGloss()}
              />
              <button className="btn btn-primary" onClick={lookupGloss} disabled={glossLoading || !glossTerm.trim()}>
                {glossLoading ? "..." : "Define"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {["compound interest", "P/E ratio", "EBITDA", "Roth IRA", "dollar-cost averaging", "WACC", "beta", "yield curve", "basis points", "amortization", "arbitrage", "CAGR"].map((t) => (
                <button key={t} className="tag" onClick={() => { setGlossTerm(t); setTimeout(lookupGloss, 50); }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {glossResult && (
            <div className="card fade-in">
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--green)", letterSpacing: "-0.02em", marginBottom: "0.875rem" }}>
                {glossResult.term}
              </h2>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.75, color: "var(--t1)", marginBottom: "1rem" }}>
                {glossResult.definition}
              </p>
              {glossResult.example && (
                <div style={{ background: "var(--bg-4)", borderRadius: "var(--r)", padding: "0.875rem", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Example</div>
                  <p style={{ fontSize: "0.825rem", color: "var(--t2)", lineHeight: 1.6 }}>{glossResult.example}</p>
                </div>
              )}
              {glossResult.related_terms?.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.68rem", color: "var(--t3)", marginBottom: "0.5rem" }}>Related terms</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                    {glossResult.related_terms.map((t: string) => (
                      <button key={t} className="tag" onClick={() => { setGlossTerm(t); setTimeout(lookupGloss, 50); }}>{t}</button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize: "0.68rem", color: "var(--t4)", marginTop: "1rem" }}>Source: {glossResult.source}</div>
            </div>
          )}
        </div>
      )}

      {/* TAX SCHOOL TAB */}
      {tab === "taxschool" && (
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="insight">
            <div className="insight-label">Tax school</div>
            20 lessons covering everything from how brackets work to advanced strategies like Roth conversions and tax-loss harvesting.
          </div>
          {[
            { n: 1, t: "How tax brackets actually work", done: true },
            { n: 2, t: "Standard vs itemized deductions", done: true },
            { n: 3, t: "W-4 and withholding - why it matters", done: false },
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
            { n: 14, t: "Filing status - which to choose", done: false },
            { n: 15, t: "The FICA tax: SS + Medicare breakdown", done: false },
          ].map((lesson) => (
            <div key={lesson.n} className="list-item">
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: lesson.done ? "var(--green)" : "var(--bg-5)",
                  border: `1px solid ${lesson.done ? "var(--green)" : "var(--b2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", fontFamily: "var(--mono)", color: lesson.done ? "#041a0c" : "var(--t3)", fontWeight: 700, flexShrink: 0,
                }}>
                  {lesson.done ? "check" : lesson.n}
                </div>
                <span style={{ fontSize: "0.825rem", color: lesson.done ? "var(--t2)" : "var(--t1)", fontWeight: lesson.done ? 400 : 500 }}>
                  {lesson.t}
                </span>
              </div>
              <span className={`badge ${lesson.done ? "badge-green" : "badge-gray"}`}>{lesson.done ? "Done" : "Coming"}</span>
            </div>
          ))}
        </div>
      )}

      {/* IB / FINANCE SCHOOL TAB */}
      {tab === "ibschool" && (
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="insight blue" style={{ borderLeftColor: "var(--blue)", background: "var(--blue-bg)" }}>
            <div className="insight-label" style={{ color: "var(--blue)" }}>Investment Banking & Corporate Finance School</div>
            Wall Street skills for everyone. Learn DCF models, M&A analysis, LBO mechanics, and how to read company financials.
          </div>
          {[
            { n: 1, t: "Reading an income statement", cat: "Accounting" },
            { n: 2, t: "Balance sheet fundamentals", cat: "Accounting" },
            { n: 3, t: "Cash flow statement analysis", cat: "Accounting" },
            { n: 4, t: "Key financial ratios", cat: "Analysis" },
            { n: 5, t: "DCF valuation - step by step", cat: "Valuation" },
            { n: 6, t: "Comparable company analysis (comps)", cat: "Valuation" },
            { n: 7, t: "Precedent transaction analysis", cat: "M&A" },
            { n: 8, t: "M&A deal mechanics", cat: "M&A" },
            { n: 9, t: "LBO model basics", cat: "PE/VC" },
            { n: 10, t: "Venture capital term sheets", cat: "PE/VC" },
            { n: 11, t: "IPO process - from S-1 to listing", cat: "Capital Markets" },
            { n: 12, t: "Bond pricing and duration", cat: "Fixed Income" },
            { n: 13, t: "Options pricing and the Black-Scholes", cat: "Derivatives" },
            { n: 14, t: "WACC and cost of capital", cat: "Corporate Finance" },
            { n: 15, t: "Accretion/dilution analysis", cat: "M&A" },
          ].map((lesson) => {
            const CATS: Record<string, string> = {
              Accounting: "badge-blue", Analysis: "badge-gray", Valuation: "badge-green",
              "M&A": "badge-amber", "PE/VC": "badge-purple", "Capital Markets": "badge-blue",
              "Fixed Income": "badge-gray", Derivatives: "badge-amber", "Corporate Finance": "badge-green",
            };
            return (
              <div key={lesson.n} className="list-item">
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: "var(--bg-5)", border: "1px solid var(--b2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.7rem", fontFamily: "var(--mono)", color: "var(--t3)", fontWeight: 700, flexShrink: 0,
                  }}>
                    {lesson.n}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.825rem", color: "var(--t1)", fontWeight: 500 }}>{lesson.t}</div>
                  </div>
                </div>
                <span className={`badge ${CATS[lesson.cat] || "badge-gray"}`}>{lesson.cat}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* LESSON MODAL */}
      <Modal
        open={!!activeLesson}
        onClose={() => { setActiveLesson(null); setActiveLessonId(null); }}
        title={activeLesson?.title || "Lesson"}
        footer={!showQuiz ? (
          <>
            <button className="btn btn-secondary" onClick={() => { setActiveLesson(null); setActiveLessonId(null); }}>Close</button>
            {QUIZ_DATA[activeLessonId!] && (
              <button className="btn btn-primary" onClick={startQuiz}>Take Quiz</button>
            )}
          </>
        ) : quizSubmitted ? (
          <>
            <button className="btn btn-secondary" onClick={() => { setActiveLesson(null); setActiveLessonId(null); }}>Close</button>
            <button className="btn btn-primary" onClick={() => { setShowQuiz(false); setQuizSubmitted(false); }}>Review Lesson</button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={() => setShowQuiz(false)}>Back to Lesson</button>
            <button className="btn btn-primary" onClick={submitQuiz} disabled={quizAnswers.some(a => a === -1)}>
              Submit Quiz
            </button>
          </>
        )}
      >
        {activeLesson && !showQuiz && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className={`badge ${DIFF_BADGES[TRACKS.find(t => t.concepts.some(c => c.id === activeLessonId))?.concepts.find(c => c.id === activeLessonId)?.difficulty || "beginner"]}`}>
              {TRACKS.find(t => t.concepts.some(c => c.id === activeLessonId))?.concepts.find(c => c.id === activeLessonId)?.difficulty}
            </div>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.8, color: "var(--t1)" }}>
              {activeLesson.desc}
            </p>
            <div style={{ background: "var(--bg-4)", borderRadius: "var(--r)", padding: "1rem" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--green)", fontWeight: 600, marginBottom: "0.5rem" }}>Key Takeaways</div>
              <ul style={{ fontSize: "0.825rem", color: "var(--t2)", lineHeight: 1.8, paddingLeft: "1rem", margin: 0 }}>
                <li>Understand the core concept and why it matters</li>
                <li>Know how to apply this in your financial life</li>
                <li>Recognize common mistakes to avoid</li>
              </ul>
            </div>
          </div>
        )}

        {activeLesson && showQuiz && !quizSubmitted && QUIZ_DATA[activeLessonId!] && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--t3)" }}>
              Answer all questions to complete the quiz
            </div>
            {QUIZ_DATA[activeLessonId!].map((q, i) => (
              <div key={i} style={{ background: "var(--bg-3)", borderRadius: "var(--r)", padding: "1rem" }}>
                <div style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--t1)", marginBottom: "0.75rem" }}>
                  {i + 1}. {q.question}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {q.options.map((opt, j) => (
                    <button
                      key={j}
                      onClick={() => {
                        const newAnswers = [...quizAnswers];
                        newAnswers[i] = j;
                        setQuizAnswers(newAnswers);
                      }}
                      style={{
                        padding: "0.625rem 0.875rem",
                        background: quizAnswers[i] === j ? "var(--green-bg)" : "var(--bg-4)",
                        border: `1px solid ${quizAnswers[i] === j ? "var(--green-border)" : "var(--b1)"}`,
                        borderRadius: "var(--r-sm)",
                        textAlign: "left",
                        fontSize: "0.8rem",
                        color: quizAnswers[i] === j ? "var(--green)" : "var(--t2)",
                        cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                    >
                      {String.fromCharCode(65 + j)}. {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeLesson && showQuiz && quizSubmitted && QUIZ_DATA[activeLessonId!] && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ textAlign: "center", padding: "1.5rem", background: quizScore >= 70 ? "var(--green-bg)" : "var(--amber-bg)", borderRadius: "var(--r)", border: `1px solid ${quizScore >= 70 ? "var(--green-border)" : "var(--amber-border)"}` }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, fontFamily: "var(--mono)", color: quizScore >= 70 ? "var(--green)" : "var(--amber)" }}>
                {quizScore}%
              </div>
              <div style={{ fontSize: "0.875rem", color: quizScore >= 70 ? "var(--green)" : "var(--amber)", fontWeight: 500 }}>
                {quizScore >= 90 ? "Mastered!" : quizScore >= 70 ? "Completed!" : "Keep practicing"}
              </div>
            </div>
            
            {QUIZ_DATA[activeLessonId!].map((q, i) => {
              const isCorrect = quizAnswers[i] === q.correct;
              return (
                <div key={i} style={{ background: "var(--bg-3)", borderRadius: "var(--r)", padding: "1rem", borderLeft: `3px solid ${isCorrect ? "var(--green)" : "var(--red)"}` }}>
                  <div style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--t1)", marginBottom: "0.5rem" }}>
                    {i + 1}. {q.question}
                  </div>
                  <div style={{ fontSize: "0.775rem", marginBottom: "0.5rem" }}>
                    <span style={{ color: "var(--t3)" }}>Your answer: </span>
                    <span style={{ color: isCorrect ? "var(--green)" : "var(--red)", fontWeight: 500 }}>
                      {q.options[quizAnswers[i]]} {isCorrect ? "(Correct)" : "(Incorrect)"}
                    </span>
                  </div>
                  {!isCorrect && (
                    <div style={{ fontSize: "0.775rem", marginBottom: "0.5rem" }}>
                      <span style={{ color: "var(--t3)" }}>Correct answer: </span>
                      <span style={{ color: "var(--green)", fontWeight: 500 }}>{q.options[q.correct]}</span>
                    </div>
                  )}
                  <div style={{ fontSize: "0.72rem", color: "var(--t3)", fontStyle: "italic" }}>
                    {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
