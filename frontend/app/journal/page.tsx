"use client";
import { useState } from "react";
import { useJournal } from "@/hooks";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { journalApi } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { useFoliaStore } from "@/store";
import { formatDate } from "@/lib/utils";
import type { JournalEntry } from "@/types";

type View = "all" | "pending" | "resolved";

export default function JournalPage() {
  const userId = useFoliaStore((s) => s.userId)!;
  const { data, loading, refetch } = useJournal();
  const { success, error: te } = useToast();
  const [view, setView] = useState<View>("all");
  const [showNew, setShowNew] = useState(false);
  const [showOutcome, setShowOutcome] = useState<JournalEntry | null>(null);
  const [showEdit, setShowEdit] = useState<JournalEntry | null>(null);
  const [delEntry, setDelEntry] = useState<JournalEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const [newForm, setNewForm] = useState({
    decision: "",
    reasoning: "",
    predicted_outcome: "",
  });
  const setN = (k: keyof typeof newForm, v: string) =>
    setNewForm((p) => ({ ...p, [k]: v }));

  const [outcome, setOutcome] = useState("");

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

  const allEntries: JournalEntry[] = data?.entries ?? [];
  const filtered =
    view === "pending"
      ? allEntries.filter((e) => !e.actual_outcome)
      : view === "resolved"
        ? allEntries.filter((e) => !!e.actual_outcome)
        : allEntries;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        maxWidth: 900,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
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
            Decision Journal
          </h1>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--t3)",
              marginTop: 4,
              lineHeight: 1.6,
            }}
          >
            Log financial decisions · revisit outcomes 3 months later · close
            the feedback loop
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Log decision
        </button>
      </div>

      {/* Follow-up banner */}
      {data?.awaiting_followup && data.awaiting_followup.length > 0 && (
        <div
          style={{
            background: "var(--amber-bg)",
            border: "1px solid var(--amber-border)",
            borderRadius: "var(--r-lg)",
            padding: "1rem 1.25rem",
          }}
        >
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--amber)",
              marginBottom: "0.625rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: "var(--amber)",
                borderRadius: "50%",
                display: "inline-block",
              }}
            />
            {data.awaiting_followup.length} decision
            {data.awaiting_followup.length > 1 ? "s" : ""} ready for outcome —
            made 3+ months ago
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {data.awaiting_followup.map((e) => (
              <button
                key={e.id}
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setShowOutcome(e);
                  setOutcome("");
                }}
              >
                {e.decision.length > 50
                  ? e.decision.slice(0, 50) + "..."
                  : e.decision}{" "}
                →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.75rem",
        }}
      >
        {[
          { l: "Total decisions", v: allEntries.length, c: "var(--t1)" },
          {
            l: "Awaiting outcome",
            v: allEntries.filter((e) => !e.actual_outcome).length,
            c: "var(--amber)",
          },
          {
            l: "Outcomes logged",
            v: allEntries.filter((e) => !!e.actual_outcome).length,
            c: "var(--green)",
          },
        ].map(({ l, v, c }) => (
          <div key={l} className="metric">
            <div className="metric-label">{l}</div>
            <div
              className="metric-value"
              style={{ color: c, fontSize: "1.5rem" }}
            >
              {v}
            </div>
          </div>
        ))}
      </div>

      {/* View filter */}
      <div className="tabs" style={{ maxWidth: 340 }}>
        {(["all", "pending", "resolved"] as View[]).map((v) => (
          <button
            key={v}
            className={`tab ${view === v ? "active" : ""}`}
            onClick={() => setView(v)}
          >
            {v === "all" ? "All" : v === "pending" ? "Pending" : "Resolved"}
            {v === "pending" && data?.pending_count
              ? ` (${data.pending_count})`
              : ""}
          </button>
        ))}
      </div>

      {/* Entry list */}
      {loading ? (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120 }} />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div
          className="stagger"
          style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
        >
          {filtered.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onOutcome={() => {
                setShowOutcome(entry);
                setOutcome("");
              }}
              onEdit={() => setShowEdit(entry)}
              onDelete={() => setDelEntry(entry)}
            />
          ))}
        </div>
      ) : (
        <div className="empty" style={{ paddingTop: "3rem" }}>
          <div className="empty-icon">◷</div>
          <div className="empty-text">
            {view === "pending"
              ? "No pending decisions"
              : view === "resolved"
                ? "No resolved decisions yet"
                : "No decisions logged yet"}
          </div>
          {view === "all" && (
            <div className="empty-sub" style={{ marginTop: 4 }}>
              Log your first financial decision to start closing the feedback
              loop
            </div>
          )}
        </div>
      )}

      {/* New entry modal */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Log a financial decision"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowNew(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={createEntry}
              disabled={saving || !newForm.decision.trim()}
            >
              {saving ? "Saving..." : "Log decision"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="label">
              Decision <span style={{ color: "var(--red)" }}>*</span>
            </label>
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
        onClose={() => {
          setShowOutcome(null);
          setOutcome("");
        }}
        title="Log outcome"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowOutcome(null)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={logOutcome}
              disabled={saving || !outcome.trim()}
            >
              {saving ? "Saving..." : "Record outcome"}
            </button>
          </>
        }
      >
        {showOutcome && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div
              style={{
                background: "var(--bg-4)",
                borderRadius: "var(--r)",
                padding: "0.875rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--t3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 4,
                }}
              >
                Original decision
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--t1)",
                  lineHeight: 1.6,
                }}
              >
                {showOutcome.decision}
              </div>
              {showOutcome.predicted_outcome && (
                <>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--t3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginTop: "0.625rem",
                      marginBottom: 4,
                    }}
                  >
                    Predicted outcome
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--t2)",
                      lineHeight: 1.6,
                    }}
                  >
                    {showOutcome.predicted_outcome}
                  </div>
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

      {/* Edit modal */}
      {showEdit && (
        <EditEntryModal
          entry={showEdit}
          onClose={() => setShowEdit(null)}
          onSaved={() => {
            setShowEdit(null);
            refetch();
          }}
        />
      )}

      <ConfirmDialog
        open={!!delEntry}
        onClose={() => setDelEntry(null)}
        onConfirm={handleDelete}
        danger
        title="Delete entry"
        confirmLabel="Delete"
        message={`Delete this journal entry? This cannot be undone.`}
      />
    </div>
  );
}

function EntryCard({
  entry,
  onOutcome,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry;
  onOutcome: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const resolved = !!entry.actual_outcome;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="card"
      style={{
        borderLeft: `3px solid ${resolved ? "var(--green)" : "var(--b2)"}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <span
              className={`badge ${resolved ? "badge-green" : "badge-amber"}`}
            >
              {resolved ? "Resolved" : "Pending outcome"}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--t4)" }}>
              {formatDate(entry.decision_date)}
            </span>
          </div>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--t1)",
              fontWeight: 500,
              lineHeight: 1.6,
              marginBottom: entry.reasoning ? "0.5rem" : 0,
            }}
          >
            {entry.decision}
          </p>

          {expanded && (
            <div
              className="fade-in"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
                marginTop: "0.75rem",
              }}
            >
              {entry.reasoning && (
                <div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--t4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: 3,
                    }}
                  >
                    Reasoning
                  </div>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--t2)",
                      lineHeight: 1.6,
                    }}
                  >
                    {entry.reasoning}
                  </p>
                </div>
              )}
              {entry.predicted_outcome && (
                <div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--t4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: 3,
                    }}
                  >
                    Predicted
                  </div>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--t2)",
                      lineHeight: 1.6,
                    }}
                  >
                    {entry.predicted_outcome}
                  </p>
                </div>
              )}
              {entry.actual_outcome && (
                <div
                  style={{
                    background: "var(--green-bg)",
                    border: "1px solid var(--green-border)",
                    borderRadius: "var(--r)",
                    padding: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--green)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: 3,
                    }}
                  >
                    Actual outcome
                  </div>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--t1)",
                      lineHeight: 1.6,
                    }}
                  >
                    {entry.actual_outcome}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
            flexShrink: 0,
          }}
        >
          {!resolved && (
            <button className="btn btn-primary btn-xs" onClick={onOutcome}>
              Log outcome
            </button>
          )}
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "▲" : "▼"}
            </button>
            <button className="btn btn-ghost btn-xs" onClick={onEdit}>
              Edit
            </button>
            <button
              className="btn btn-ghost btn-xs"
              style={{ color: "var(--red)" }}
              onClick={onDelete}
            >
              ✕
            </button>
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
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label className="label">Decision</label>
          <textarea
            className="input"
            style={{ height: 80 }}
            value={form.decision}
            onChange={(e) =>
              setForm((p) => ({ ...p, decision: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="label">Reasoning</label>
          <textarea
            className="input"
            style={{ height: 70 }}
            value={form.reasoning}
            onChange={(e) =>
              setForm((p) => ({ ...p, reasoning: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="label">Predicted outcome</label>
          <textarea
            className="input"
            style={{ height: 70 }}
            value={form.predicted_outcome}
            onChange={(e) =>
              setForm((p) => ({ ...p, predicted_outcome: e.target.value }))
            }
          />
        </div>
      </div>
    </Modal>
  );
}
