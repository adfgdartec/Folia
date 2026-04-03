"use client";
import { useState, useEffect } from "react";
import { useJournal, usePaperPortfolio } from "@/hooks";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { journalApi, paperTradingApi, narrateApi } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { useFoliaStore } from "@/store";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { JournalEntry, PaperTrade, FinancialMetadata } from "@/types";

type View = "all" | "pending" | "resolved" | "trades" | "insights";

export default function JournalPage() {
  const userId = useFoliaStore((s) => s.userId)!;
  const metadata = useFoliaStore((s) => s.metadata);
  const { data, loading, refetch } = useJournal();
  const { data: portfolioData } = usePaperPortfolio();
  const { success, error: te } = useToast();
  const [view, setView] = useState<View>("all");
  const [showNew, setShowNew] = useState(false);
  const [showOutcome, setShowOutcome] = useState<JournalEntry | null>(null);
  const [showEdit, setShowEdit] = useState<JournalEntry | null>(null);
  const [delEntry, setDelEntry] = useState<JournalEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [showAIInsight, setShowAIInsight] = useState<JournalEntry | null>(null);
  const [aiInsight, setAIInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [autoLogLoading, setAutoLogLoading] = useState(false);

  const [newForm, setNewForm] = useState({
    decision: "",
    reasoning: "",
    predicted_outcome: "",
  });
  const setN = (k: keyof typeof newForm, v: string) =>
    setNewForm((p) => ({ ...p, [k]: v }));

  const [outcome, setOutcome] = useState("");

  // Load trades for auto-logging
  useEffect(() => {
    if (view === "trades" && userId) {
      setLoadingTrades(true);
      paperTradingApi.getTrades(userId)
        .then(r => setTrades(r.trades || []))
        .catch(() => {})
        .finally(() => setLoadingTrades(false));
    }
  }, [view, userId]);

  const createEntry = async () => {
    if (!newForm.decision.trim()) return;
    setSaving(true);
    try {
      await journalApi.create({ user_id: userId, ...newForm });
      success("Decision logged");
      setNewForm({ decision: "", reasoning: "", predicted_outcome: "" });
      setShowNew(false);
      refetch();
    } catch (e: any) {
      te(e.message);
    } finally {
      setSaving(false);
    }
  };

  const logOutcome = async () => {
    if (!showOutcome || !outcome.trim()) return;
    setSaving(true);
    try {
      await journalApi.logOutcome(showOutcome.id, outcome);
      success("Outcome recorded");
      setShowOutcome(null);
      setOutcome("");
      refetch();
    } catch (e: any) {
      te(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!delEntry) return;
    try {
      await journalApi.delete(delEntry.id);
      success("Entry deleted");
      setDelEntry(null);
      refetch();
    } catch (e: any) {
      te(e.message);
    }
  };

  // Auto-log a trade to journal
  const autoLogTrade = async (trade: PaperTrade) => {
    setAutoLogLoading(true);
    try {
      const decision = `${trade.side.toUpperCase()} ${trade.shares} shares of ${trade.ticker} at ${formatCurrency(trade.price)}`;
      const reasoning = trade.reasoning || `Market order executed on ${new Date(trade.created_at).toLocaleDateString()}`;
      
      await journalApi.create({
        user_id: userId,
        decision,
        reasoning,
        predicted_outcome: `Trade thesis: ${trade.reasoning || "No specific thesis recorded"}. Will review performance in 3 months.`,
      });
      
      success(`Trade logged: ${trade.side.toUpperCase()} ${trade.ticker}`);
      refetch();
    } catch (e: any) {
      te(e.message);
    } finally {
      setAutoLogLoading(false);
    }
  };

  // Auto-log all recent trades
  const autoLogAllTrades = async () => {
    setAutoLogLoading(true);
    const recentTrades = trades.slice(0, 5);
    let logged = 0;
    
    for (const trade of recentTrades) {
      try {
        const decision = `${trade.side.toUpperCase()} ${trade.shares} shares of ${trade.ticker} at ${formatCurrency(trade.price)}`;
        await journalApi.create({
          user_id: userId,
          decision,
          reasoning: trade.reasoning || `Market order executed on ${new Date(trade.created_at).toLocaleDateString()}`,
          predicted_outcome: `Trade thesis: ${trade.reasoning || "No specific thesis"}. Will review performance in 3 months.`,
        });
        logged++;
      } catch {}
    }
    
    setAutoLogLoading(false);
    success(`Logged ${logged} trades to journal`);
    refetch();
  };

  // Get AI insights for a journal entry
  const getAIInsight = async (entry: JournalEntry) => {
    setShowAIInsight(entry);
    setLoadingInsight(true);
    setAIInsight("");
    
    try {
      const context = `
        Financial Decision: ${entry.decision}
        Reasoning: ${entry.reasoning || "Not provided"}
        Predicted Outcome: ${entry.predicted_outcome || "Not provided"}
        ${entry.actual_outcome ? `Actual Outcome: ${entry.actual_outcome}` : "Outcome: Pending"}
        Decision Date: ${entry.decision_date}
      `;
      
      const result = await narrateApi.narrate(
        context,
        metadata as FinancialMetadata,
        "decision_analysis"
      );
      
      setAIInsight(result.narration || generateLocalInsight(entry));
    } catch {
      // Generate local insight if API fails
      setAIInsight(generateLocalInsight(entry));
    } finally {
      setLoadingInsight(false);
    }
  };

  // Generate local insight when API is unavailable
  const generateLocalInsight = (entry: JournalEntry): string => {
    const hasOutcome = !!entry.actual_outcome;
    const insights = [];
    
    if (entry.decision.toLowerCase().includes("buy") || entry.decision.toLowerCase().includes("invest")) {
      insights.push("Investment Decision Analysis:");
      insights.push("- Consider your position sizing relative to your total portfolio");
      insights.push("- Evaluate if this aligns with your long-term investment strategy");
      insights.push("- Review your thesis periodically to ensure it remains valid");
    } else if (entry.decision.toLowerCase().includes("sell")) {
      insights.push("Sale Decision Analysis:");
      insights.push("- Document the specific reasons for exiting this position");
      insights.push("- Compare against your original investment thesis");
      insights.push("- Consider tax implications of this sale");
    } else {
      insights.push("Financial Decision Analysis:");
      insights.push("- Evaluate the long-term impact on your financial goals");
      insights.push("- Consider opportunity costs of this decision");
      insights.push("- Document lessons learned for future reference");
    }
    
    if (hasOutcome) {
      insights.push("");
      insights.push("Outcome Review:");
      if (entry.actual_outcome?.toLowerCase().includes("profit") || entry.actual_outcome?.toLowerCase().includes("success")) {
        insights.push("- Identify what factors contributed to this positive outcome");
        insights.push("- Consider if this approach can be replicated");
      } else {
        insights.push("- Analyze what could have been done differently");
        insights.push("- Extract specific lessons for future decisions");
      }
    }
    
    insights.push("");
    insights.push("Improvement Suggestions:");
    insights.push("1. Set specific, measurable criteria for success before making similar decisions");
    insights.push("2. Create a checklist of factors to evaluate before major financial decisions");
    insights.push("3. Review your journal entries monthly to identify patterns in your decision-making");
    
    return insights.join("\n");
  };

  const allEntries: JournalEntry[] = data?.entries ?? [];
  const filtered =
    view === "pending"
      ? allEntries.filter((e) => !e.actual_outcome)
      : view === "resolved"
        ? allEntries.filter((e) => !!e.actual_outcome)
        : view === "trades" || view === "insights"
          ? allEntries
          : allEntries;

  // Calculate journal statistics
  const totalEntries = allEntries.length;
  const resolvedEntries = allEntries.filter(e => !!e.actual_outcome).length;
  const pendingEntries = allEntries.filter(e => !e.actual_outcome).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.03em" }}>
            Decision Journal
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--t3)", marginTop: 4, lineHeight: 1.6 }}>
            Log financial decisions - AI auto-logging from trades - Get insights and learn from outcomes
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={() => setView("trades")}>
            Auto-log Trades
          </button>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + Log Decision
          </button>
        </div>
      </div>

      {/* Follow-up banner */}
      {data?.awaiting_followup && data.awaiting_followup.length > 0 && (
        <div style={{ background: "var(--amber-bg)", border: "1px solid var(--amber-border)", borderRadius: "var(--r-lg)", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--amber)", marginBottom: "0.625rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ width: 6, height: 6, background: "var(--amber)", borderRadius: "50%", display: "inline-block" }} />
            {data.awaiting_followup.length} decision{data.awaiting_followup.length > 1 ? "s" : ""} ready for outcome review - made 3+ months ago
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {data.awaiting_followup.map((e) => (
              <button key={e.id} className="btn btn-secondary btn-sm" onClick={() => { setShowOutcome(e); setOutcome(""); }}>
                {e.decision.length > 50 ? e.decision.slice(0, 50) + "..." : e.decision}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
        {[
          { l: "Total Decisions", v: totalEntries, c: "var(--t1)" },
          { l: "Awaiting Outcome", v: pendingEntries, c: "var(--amber)" },
          { l: "Outcomes Logged", v: resolvedEntries, c: "var(--green)" },
          { l: "Success Rate", v: resolvedEntries > 0 ? "---" : "N/A", c: "var(--blue)" },
        ].map(({ l, v, c }) => (
          <div key={l} className="metric">
            <div className="metric-label">{l}</div>
            <div className="metric-value" style={{ color: c, fontSize: "1.5rem" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* View filter */}
      <div className="tabs">
        {([
          { id: "all" as View, l: "All Entries" },
          { id: "pending" as View, l: `Pending (${pendingEntries})` },
          { id: "resolved" as View, l: `Resolved (${resolvedEntries})` },
          { id: "trades" as View, l: "Trade Log" },
          { id: "insights" as View, l: "AI Insights" },
        ]).map((v) => (
          <button key={v.id} className={`tab ${view === v.id ? "active" : ""}`} onClick={() => setView(v.id)}>
            {v.l}
          </button>
        ))}
      </div>

      {/* Trade Auto-logging View */}
      {view === "trades" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <div className="section-title">Auto-log Trades</div>
              <div className="section-sub">Automatically create journal entries from your paper trading activity</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={autoLogAllTrades} disabled={autoLogLoading || trades.length === 0}>
              {autoLogLoading ? "Logging..." : "Log All Recent"}
            </button>
          </div>
          
          {loadingTrades ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 60 }} />)}
            </div>
          ) : trades.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {trades.slice(0, 10).map((trade) => (
                <div key={trade.id} className="list-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4 }}>
                      <span className={`badge ${trade.side === "buy" ? "badge-green" : "badge-red"}`}>
                        {trade.side.toUpperCase()}
                      </span>
                      <span style={{ fontWeight: 600, color: "var(--t1)" }}>{trade.ticker}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--t2)" }}>
                        {trade.shares} shares @ {formatCurrency(trade.price)}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--t3)" }}>
                      {new Date(trade.created_at).toLocaleDateString()} - {trade.reasoning || "No thesis recorded"}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-xs" onClick={() => autoLogTrade(trade)} disabled={autoLogLoading}>
                    Log to Journal
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-icon">N</div>
              <div className="empty-text">No trades found</div>
              <div className="empty-sub">Make some paper trades to auto-log them here</div>
            </div>
          )}
        </div>
      )}

      {/* AI Insights View */}
      {view === "insights" && (
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="insight insight-blue" style={{ borderLeftColor: "var(--blue)", background: "var(--blue-bg)" }}>
            <div className="insight-label" style={{ color: "var(--blue)" }}>AI-Powered Decision Analysis</div>
            Get personalized insights on your financial decisions. Learn from your successes and mistakes with detailed analysis.
          </div>
          
          {allEntries.length > 0 ? (
            allEntries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="card" style={{ borderLeft: `3px solid ${entry.actual_outcome ? "var(--green)" : "var(--amber)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <span className={`badge ${entry.actual_outcome ? "badge-green" : "badge-amber"}`}>
                        {entry.actual_outcome ? "Resolved" : "Pending"}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--t4)" }}>{formatDate(entry.decision_date)}</span>
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "var(--t1)", fontWeight: 500, lineHeight: 1.6 }}>
                      {entry.decision}
                    </p>
                  </div>
                  <button className="btn btn-primary btn-xs" onClick={() => getAIInsight(entry)}>
                    Get AI Insight
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">
              <div className="empty-icon">Q</div>
              <div className="empty-text">No decisions to analyze</div>
              <div className="empty-sub">Log some financial decisions to get AI insights</div>
            </div>
          )}
        </div>
      )}

      {/* Entry list */}
      {(view === "all" || view === "pending" || view === "resolved") && (
        loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {filtered.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onOutcome={() => { setShowOutcome(entry); setOutcome(""); }}
                onEdit={() => setShowEdit(entry)}
                onDelete={() => setDelEntry(entry)}
                onGetInsight={() => getAIInsight(entry)}
              />
            ))}
          </div>
        ) : (
          <div className="empty" style={{ paddingTop: "3rem" }}>
            <div className="empty-icon">J</div>
            <div className="empty-text">
              {view === "pending" ? "No pending decisions" : view === "resolved" ? "No resolved decisions yet" : "No decisions logged yet"}
            </div>
            {view === "all" && (
              <div className="empty-sub" style={{ marginTop: 4 }}>
                Log your first financial decision to start closing the feedback loop
              </div>
            )}
          </div>
        )
      )}

      {/* New entry modal */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Log a financial decision"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowNew(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={createEntry} disabled={saving || !newForm.decision.trim()}>
              {saving ? "Saving..." : "Log Decision"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="label">Decision <span style={{ color: "var(--red)" }}>*</span></label>
            <textarea
              className="input"
              style={{ height: 80 }}
              placeholder="e.g. Opened a Roth IRA and contributed $6,500"
              value={newForm.decision}
              onChange={(e) => setN("decision", e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Reasoning</label>
            <textarea
              className="input"
              style={{ height: 70 }}
              placeholder="Why did you make this decision?"
              value={newForm.reasoning}
              onChange={(e) => setN("reasoning", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Predicted outcome</label>
            <textarea
              className="input"
              style={{ height: 70 }}
              placeholder="What do you expect to happen? (review in 3 months)"
              value={newForm.predicted_outcome}
              onChange={(e) => setN("predicted_outcome", e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Outcome modal */}
      <Modal
        open={!!showOutcome}
        onClose={() => { setShowOutcome(null); setOutcome(""); }}
        title="Log outcome"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowOutcome(null)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={logOutcome} disabled={saving || !outcome.trim()}>
              {saving ? "Saving..." : "Record Outcome"}
            </button>
          </>
        }
      >
        {showOutcome && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: "var(--bg-4)", borderRadius: "var(--r)", padding: "0.875rem" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Original decision</div>
              <div style={{ fontSize: "0.875rem", color: "var(--t1)", lineHeight: 1.6 }}>{showOutcome.decision}</div>
              {showOutcome.predicted_outcome && (
                <>
                  <div style={{ fontSize: "0.68rem", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: "0.625rem", marginBottom: 4 }}>Predicted outcome</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--t2)", lineHeight: 1.6 }}>{showOutcome.predicted_outcome}</div>
                </>
              )}
            </div>
            <div>
              <label className="label">What actually happened?</label>
              <textarea
                className="input"
                style={{ height: 90 }}
                placeholder="Describe what actually happened after this decision..."
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}
      </Modal>

      {/* AI Insight modal */}
      <Modal
        open={!!showAIInsight}
        onClose={() => { setShowAIInsight(null); setAIInsight(""); }}
        title="AI Decision Analysis"
        footer={<button className="btn btn-primary" onClick={() => { setShowAIInsight(null); setAIInsight(""); }}>Close</button>}
      >
        {showAIInsight && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: "var(--bg-4)", borderRadius: "var(--r)", padding: "0.875rem" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Decision</div>
              <div style={{ fontSize: "0.875rem", color: "var(--t1)", lineHeight: 1.6 }}>{showAIInsight.decision}</div>
            </div>
            
            {loadingInsight ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
                <div style={{ width: 24, height: 24, border: "2px solid var(--bg-5)", borderTop: "2px solid var(--green)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : (
              <div style={{ background: "var(--green-bg)", border: "1px solid var(--green-border)", borderRadius: "var(--r)", padding: "1rem" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--green)", marginBottom: "0.75rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  AI Analysis & Recommendations
                </div>
                <pre style={{ fontSize: "0.825rem", color: "var(--t1)", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
                  {aiInsight}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      {showEdit && (
        <EditEntryModal
          entry={showEdit}
          onClose={() => setShowEdit(null)}
          onSaved={() => { setShowEdit(null); refetch(); }}
        />
      )}

      <ConfirmDialog
        open={!!delEntry}
        onClose={() => setDelEntry(null)}
        onConfirm={handleDelete}
        danger
        title="Delete entry"
        confirmLabel="Delete"
        message="Delete this journal entry? This cannot be undone."
      />
    </div>
  );
}

function EntryCard({
  entry,
  onOutcome,
  onEdit,
  onDelete,
  onGetInsight,
}: {
  entry: JournalEntry;
  onOutcome: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onGetInsight: () => void;
}) {
  const resolved = !!entry.actual_outcome;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card" style={{ borderLeft: `3px solid ${resolved ? "var(--green)" : "var(--b2)"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span className={`badge ${resolved ? "badge-green" : "badge-amber"}`}>
              {resolved ? "Resolved" : "Pending outcome"}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--t4)" }}>{formatDate(entry.decision_date)}</span>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--t1)", fontWeight: 500, lineHeight: 1.6, marginBottom: entry.reasoning ? "0.5rem" : 0 }}>
            {entry.decision}
          </p>

          {expanded && (
            <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginTop: "0.75rem" }}>
              {entry.reasoning && (
                <div>
                  <div style={{ fontSize: "0.65rem", color: "var(--t4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Reasoning</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--t2)", lineHeight: 1.6 }}>{entry.reasoning}</p>
                </div>
              )}
              {entry.predicted_outcome && (
                <div>
                  <div style={{ fontSize: "0.65rem", color: "var(--t4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Predicted</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--t2)", lineHeight: 1.6 }}>{entry.predicted_outcome}</p>
                </div>
              )}
              {entry.actual_outcome && (
                <div style={{ background: "var(--green-bg)", border: "1px solid var(--green-border)", borderRadius: "var(--r)", padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Actual outcome</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--t1)", lineHeight: 1.6 }}>{entry.actual_outcome}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", flexShrink: 0 }}>
          {!resolved && (
            <button className="btn btn-primary btn-xs" onClick={onOutcome}>Log outcome</button>
          )}
          <button className="btn btn-secondary btn-xs" onClick={onGetInsight}>AI Insight</button>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button className="btn btn-ghost btn-xs" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Less" : "More"}
            </button>
            <button className="btn btn-ghost btn-xs" onClick={onEdit}>Edit</button>
            <button className="btn btn-ghost btn-xs" style={{ color: "var(--red)" }} onClick={onDelete}>X</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditEntryModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: JournalEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    decision: entry.decision,
    reasoning: entry.reasoning ?? "",
    predicted_outcome: entry.predicted_outcome ?? "",
  });
  const [saving, setSaving] = useState(false);
  const { success, error: te } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      await journalApi.update(entry.id, form);
      success("Entry updated");
      onSaved();
    } catch (e: any) {
      te(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit journal entry"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label className="label">Decision</label>
          <textarea className="input" style={{ height: 80 }} value={form.decision} onChange={(e) => setForm((p) => ({ ...p, decision: e.target.value }))} />
        </div>
        <div>
          <label className="label">Reasoning</label>
          <textarea className="input" style={{ height: 70 }} value={form.reasoning} onChange={(e) => setForm((p) => ({ ...p, reasoning: e.target.value }))} />
        </div>
        <div>
          <label className="label">Predicted outcome</label>
          <textarea className="input" style={{ height: 70 }} value={form.predicted_outcome} onChange={(e) => setForm((p) => ({ ...p, predicted_outcome: e.target.value }))} />
        </div>
      </div>
    </Modal>
  );
}
