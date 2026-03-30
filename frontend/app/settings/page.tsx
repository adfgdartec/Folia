"use client";
import { useState } from "react";
import { useFoliaStore } from "@/store";
import { useBills } from "@/hooks";
import { usersApi, billsApi } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/Modal";
import {
  getLifeStageFromAge,
  LIFE_STAGE_LABELS,
  formatCurrency,
} from "@/lib/utils";
import type { IncomeType, FilingStatus, LiteracyLevel } from "@/types";

type Tab = "profile" | "bills";
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

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        maxWidth: 700,
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
          Settings
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--t3)", marginTop: 4 }}>
          Update your Financial metadata to keep all insights accurate
        </p>
      </div>
      <div className="tabs" style={{ maxWidth: 320 }}>
        <button
          className={`tab ${tab === "profile" ? "active" : ""}`}
          onClick={() => setTab("profile")}
        >
          Financial metadata
        </button>
        <button
          className={`tab ${tab === "bills" ? "active" : ""}`}
          onClick={() => setTab("bills")}
        >
          Recurring Bills
        </button>
      </div>
      {tab === "profile" && <ProfileTab />}
      {tab === "bills" && <BillsTab />}
    </div>
  );
}

function ProfileTab() {
  const metadata = useFoliaStore((s) => s.metadata);
  const setMetadata = useFoliaStore((s) => s.setMetadata);
  const userId = useFoliaStore((s) => s.userId);
  const { success, error: te } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    age: metadata?.age ?? 25,
    income_type: (metadata?.income_type ?? "w2") as IncomeType,
    annual_income: metadata?.annual_income ?? 50000,
    filing_status: (metadata?.filing_status ?? "single") as FilingStatus,
    state: metadata?.state ?? "",
    monthly_expenses: metadata?.monthly_expenses ?? 2500,
    emergency_fund_months: metadata?.emergency_fund_months ?? 0,
    literacy_level: (metadata?.literacy_level ?? "beginner") as LiteracyLevel,
  });
  const set = (k: keyof typeof form, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!userId || !metadata) return;
    setSaving(true);
    try {
      const updated = {
        ...metadata,
        ...form,
        life_stage: getLifeStageFromAge(form.age),
      };
      await usersApi.upsertMetadata(userId, updated);
      setMetadata(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      success("Financial metadata updated");
    } catch (e: any) {
      te(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1.5rem" }}>
          Financial metadata
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div>
              <label className="label">Age</label>
              <input
                type="number"
                className="input"
                value={form.age}
                min={13}
                max={120}
                onChange={(e) => set("age", +e.target.value)}
              />
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--green)",
                  marginTop: 4,
                }}
              >
                {LIFE_STAGE_LABELS[getLifeStageFromAge(form.age)]}
              </div>
            </div>
            <div>
              <label className="label">State</label>
              <select
                className="select"
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
              >
                <option value="">None selected</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Income type</label>
            <select
              className="select"
              value={form.income_type}
              onChange={(e) => set("income_type", e.target.value as IncomeType)}
            >
              <option value="w2">W-2 Employee</option>
              <option value="freelance">Freelance / 1099</option>
              <option value="mixed">Both W-2 + freelance</option>
              <option value="retired">Retired</option>
              <option value="unemployed">Not employed</option>
            </select>
          </div>
          <div>
            <label className="label">Annual income (gross)</label>
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
          <div>
            <label className="label">Tax filing status</label>
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
            <label className="label">Monthly expenses</label>
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
          <div>
            <label className="label">
              Emergency fund — {form.emergency_fund_months} months
            </label>
            <input
              type="range"
              min={0}
              max={12}
              step={0.5}
              value={form.emergency_fund_months}
              onChange={(e) => set("emergency_fund_months", +e.target.value)}
              style={{ width: "100%", accentColor: "var(--green)" }}
            />
          </div>
          <div>
            <label className="label">Financial literacy level</label>
            <select
              className="select"
              value={form.literacy_level}
              onChange={(e) =>
                set("literacy_level", e.target.value as LiteracyLevel)
              }
            >
              <option value="beginner">Beginner — just getting started</option>
              <option value="intermediate">
                Intermediate — know the basics
              </option>
              <option value="advanced">
                Advanced — comfortable with concepts
              </option>
            </select>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            marginTop: "1.5rem",
          }}
        >
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          {saved && (
            <span style={{ fontSize: "0.8rem", color: "var(--green)" }}>
              ✓ Saved
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-title" style={{ marginBottom: "0.875rem" }}>
          Account
        </div>
        <div className="data-row">
          <span className="data-row-label">User ID</span>
          <code style={{ fontSize: "0.72rem" }}>{userId}</code>
        </div>
      </div>
    </div>
  );
}

function BillsTab() {
  const { data, refetch } = useBills();
  const [showAdd, setShowAdd] = useState(false);
  const [delBill, setDelBill] = useState<string | null>(null);
  const { success, error: te } = useToast();
  const [form, setForm] = useState({
    name: "",
    amount: 0,
    category: "housing",
    due_day: 1,
    frequency: "monthly",
    autopay: false,
  });
  const userId = useFoliaStore((s) => s.userId)!;

  const handleAdd = async () => {
    if (!form.name || form.amount <= 0) return;
    try {
      await billsApi.create({
        ...form,
        user_id: userId,
        is_active: true,
      } as any);
      success("Bill added");
      setShowAdd(false);
      setForm({
        name: "",
        amount: 0,
        category: "housing",
        due_day: 1,
        frequency: "monthly",
        autopay: false,
      });
      refetch();
    } catch (e: any) {
      te(e.message);
    }
  };

  const handleDel = async () => {
    if (!delBill) return;
    try {
      await billsApi.delete(delBill);
      success("Bill removed");
      setDelBill(null);
      refetch();
    } catch (e: any) {
      te(e.message);
    }
  };

  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "0.75rem",
        }}
      >
        <div className="metric">
          <div className="metric-label">Total monthly</div>
          <div className="metric-value" style={{ fontSize: "1.2rem" }}>
            {formatCurrency(data?.total_monthly ?? 0)}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Annual total</div>
          <div className="metric-value" style={{ fontSize: "1.2rem" }}>
            {formatCurrency((data?.total_monthly ?? 0) * 12)}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Active bills</div>
          <div className="metric-value" style={{ fontSize: "1.2rem" }}>
            {(data?.bills as any[])?.length ?? 0}
          </div>
        </div>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div className="section-title">Recurring bills</div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAdd(!showAdd)}
          >
            + Add bill
          </button>
        </div>

        {showAdd && (
          <div
            style={{
              background: "var(--bg-4)",
              borderRadius: "var(--r)",
              padding: "1rem",
              marginBottom: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: "0.75rem",
              }}
            >
              <div>
                <label className="label">Bill name</label>
                <input
                  className="input"
                  placeholder="e.g. Netflix"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">Amount</label>
                <div className="input-group">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    className="input"
                    value={form.amount}
                    min={0}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, amount: +e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <div>
                <label className="label">Category</label>
                <input
                  className="input"
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">Due day</label>
                <input
                  type="number"
                  className="input"
                  value={form.due_day}
                  min={1}
                  max={31}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, due_day: +e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">Frequency</label>
                <select
                  className="select"
                  value={form.frequency}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, frequency: e.target.value }))
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.825rem",
                  color: "var(--t2)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.autopay}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, autopay: e.target.checked }))
                  }
                />{" "}
                Autopay enabled
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAdd}
                  disabled={!form.name || form.amount <= 0}
                >
                  Add bill
                </button>
              </div>
            </div>
          </div>
        )}

        {(data?.bills as any[])?.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Due</th>
                <th>Frequency</th>
                <th>Autopay</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data!.bills as any[]).map((b: any) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 500, color: "var(--t1)" }}>
                    {b.name}
                  </td>
                  <td>
                    <span className="badge badge-gray">{b.category}</span>
                  </td>
                  <td style={{ fontFamily: "var(--mono)", color: "var(--t3)" }}>
                    Day {b.due_day}
                  </td>
                  <td>
                    <span className="badge badge-gray">{b.frequency}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${b.autopay ? "badge-green" : "badge-gray"}`}
                    >
                      {b.autopay ? "On" : "Off"}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontWeight: 600,
                    }}
                  >
                    {formatCurrency(b.amount)}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-xs"
                      style={{ color: "var(--red)" }}
                      onClick={() => setDelBill(b.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            <div className="empty-icon">◉</div>
            <div className="empty-text">No recurring bills added yet</div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!delBill}
        onClose={() => setDelBill(null)}
        onConfirm={handleDel}
        danger
        title="Remove bill"
        confirmLabel="Remove"
        message="Remove this recurring bill?"
      />
    </div>
  );
}
