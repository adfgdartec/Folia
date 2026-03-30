"use client";
import { useState } from "react";
import {
  useAssets,
  useDebts,
  useGoals,
  useTransactions,
  useBills,
  useDebtStrategies,
} from "@/hooks";
import { SpendingChart, DonutChart } from "@/components/charts";
import { AssetForm } from "@/components/forms/AssetForm";
import { DebtForm } from "@/components/forms/DebtForm";
import { GoalForm } from "@/components/forms/GoalForm";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  formatCurrency,
  formatPercent,
  DEBT_TYPE_LABELS,
  ASSET_TYPE_LABELS,
} from "@/lib/utils";
import {
  assetsApi,
  debtsApi,
  goalsApi,
  transactionsApi,
} from "@/lib/api/client";
import { useFoliaStore } from "@/store";
import type { Asset, Debt, Goal } from "@/types";
import { useRef } from "react";

type Tab = "overview" | "assets" | "debts" | "goals" | "transactions";

export default function FinancesPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "assets", label: "Assets" },
    { id: "debts", label: "Debts" },
    { id: "goals", label: "Goals" },
    { id: "transactions", label: "Transactions" },
  ];
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
          My Finances
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--t3)", marginTop: 4 }}>
          Assets, debts, goals, and every transaction — all in one place
        </p>
      </div>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/*
        Render ALL tabs at once, only hide the inactive ones.
        This prevents unmounting on tab switch or after refetch,
        which was resetting showAdd/showEdit/etc. back to false.
      */}
      <div style={{ display: tab === "overview" ? undefined : "none" }}>
        <OverviewTab />
      </div>
      <div style={{ display: tab === "assets" ? undefined : "none" }}>
        <AssetsTab />
      </div>
      <div style={{ display: tab === "debts" ? undefined : "none" }}>
        <DebtsTab />
      </div>
      <div style={{ display: tab === "goals" ? undefined : "none" }}>
        <GoalsTab />
      </div>
      <div style={{ display: tab === "transactions" ? undefined : "none" }}>
        <TransactionsTab />
      </div>
    </div>
  );
}

// ─── OVERVIEW ────────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: A } = useAssets();
  const { data: D } = useDebts();
  const { data: T } = useTransactions({ month: thisMonth() });
  const { data: B } = useBills();

  const totalAssets = A?.total ?? 0;
  const totalDebts = D?.total_balance ?? 0;
  const nw = totalAssets - totalDebts;

  const topSpend = Object.entries(T?.spending_by_category ?? {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 7)
    .map(([c, v]) => ({ category: c, amount: v as number }));

  const assetPie = Object.entries(A?.by_type ?? {})
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => ({ name: ASSET_TYPE_LABELS[k] || k, value: v as number }));

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
        <StatCard
          label="Total assets"
          value={formatCurrency(totalAssets, true)}
          color="var(--green)"
        />
        <StatCard
          label="Total debts"
          value={formatCurrency(totalDebts, true)}
          color="var(--red)"
        />
        <StatCard
          label="Net worth"
          value={formatCurrency(nw, true)}
          color={nw >= 0 ? "var(--green)" : "var(--red)"}
        />
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
      >
        <div className="card">
          <SectionHeader title="Spending this month" />
          {topSpend.length ? (
            <SpendingChart data={topSpend} height={210} />
          ) : (
            <Empty icon="◉" text="No expenses logged yet" />
          )}
        </div>
        <div className="card">
          <SectionHeader title="Asset allocation" />
          {assetPie.length ? (
            <DonutChart data={assetPie} height={210} />
          ) : (
            <Empty icon="◎" text="Add assets to see allocation" />
          )}
        </div>
      </div>
      {(B?.upcoming_30_days as any[])?.length > 0 && (
        <div className="card">
          <SectionHeader title="Upcoming bills" sub="Next 30 days" />
          <table className="table" style={{ marginTop: "0.75rem" }}>
            <thead>
              <tr>
                <th>Bill</th>
                <th>Category</th>
                <th>Due in</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Autopay</th>
              </tr>
            </thead>
            <tbody>
              {(B!.upcoming_30_days as any[]).map((bill: any) => (
                <tr key={bill.bill_id}>
                  <td style={{ fontWeight: 500, color: "var(--t1)" }}>
                    {bill.name}
                  </td>
                  <td>{bill.category || "—"}</td>
                  <td>
                    <span
                      className={`badge ${bill.days_away <= 3 ? "badge-red" : bill.days_away <= 7 ? "badge-amber" : "badge-gray"}`}
                    >
                      {bill.days_away}d
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      color: "var(--t1)",
                      fontWeight: 600,
                    }}
                  >
                    {formatCurrency(bill.amount)}
                  </td>
                  <td>
                    <span
                      className={`badge ${bill.autopay ? "badge-green" : "badge-gray"}`}
                    >
                      {bill.autopay ? "On" : "Off"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── ASSETS ───────────────────────────────────────────────────────────────────

function AssetsTab() {
  const { data, refetch } = useAssets();
  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<Asset | null>(null);
  const [del, setDel] = useState<Asset | null>(null);
  const { success, error: te } = useToast();

  const handleDel = async () => {
    if (!del) return;
    try {
      await assetsApi.delete(del.id);
      success("Asset removed");
      setDel(null);
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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--t3)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 4,
            }}
          >
            Total assets
          </div>
          <div
            style={{
              fontSize: "1.8rem",
              fontWeight: 700,
              fontFamily: "var(--mono)",
              color: "var(--green)",
              letterSpacing: "-0.03em",
            }}
          >
            {formatCurrency(data?.total ?? 0)}
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add asset
        </button>
      </div>
      {data?.by_type && Object.keys(data.by_type).length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))",
            gap: "0.625rem",
          }}
        >
          {Object.entries(data.by_type)
            .filter(([, v]) => (v as number) > 0)
            .map(([k, v]) => (
              <div
                key={k}
                className="card-sm"
                style={{ background: "var(--bg-4)" }}
              >
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: "var(--t4)",
                    marginBottom: 3,
                  }}
                >
                  {ASSET_TYPE_LABELS[k] || k}
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontWeight: 600,
                    color: "var(--green)",
                    fontSize: "0.9rem",
                  }}
                >
                  {formatCurrency(v as number, true)}
                </div>
              </div>
            ))}
        </div>
      )}
      <div className="card">
        <SectionHeader title="All assets" />
        {data?.assets?.length ? (
          <table className="table" style={{ marginTop: "0.75rem" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Institution</th>
                <th style={{ textAlign: "right" }}>Value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.assets.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500, color: "var(--t1)" }}>
                    {a.name}
                  </td>
                  <td>
                    <span className="badge badge-gray">
                      {ASSET_TYPE_LABELS[a.type] || a.type}
                    </span>
                  </td>
                  <td style={{ color: "var(--t3)" }}>{a.institution || "—"}</td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontWeight: 600,
                      color: "var(--green)",
                    }}
                  >
                    {formatCurrency(a.value)}
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.25rem",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setEdit(a)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        style={{ color: "var(--red)" }}
                        onClick={() => setDel(a)}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty
            icon="◎"
            text="No assets yet — add your first account or property"
          />
        )}
      </div>
      <AssetForm
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={refetch}
      />
      {edit && (
        <AssetForm
          open
          onClose={() => setEdit(null)}
          onSaved={refetch}
          existing={edit}
        />
      )}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={handleDel}
        danger
        title="Remove asset"
        confirmLabel="Remove"
        message={`Remove "${del?.name}" from your assets?`}
      />
    </div>
  );
}

// ─── DEBTS ────────────────────────────────────────────────────────────────────

function DebtsTab() {
  const { data, refetch } = useDebts();
  const [extra, setExtra] = useState(0);
  const { data: strats } = useDebtStrategies(extra);
  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<Debt | null>(null);
  const [del, setDel] = useState<Debt | null>(null);
  const [payD, setPayD] = useState<Debt | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [paying, setPaying] = useState(false);
  const { success, error: te } = useToast();

  const handlePay = async () => {
    if (!payD || +payAmt <= 0) return;
    setPaying(true);
    try {
      await debtsApi.applyPayment(payD.id, +payAmt);
      success("Payment applied");
      setPayD(null);
      setPayAmt("");
      refetch();
    } catch (e: any) {
      te(e.message);
    } finally {
      setPaying(false);
    }
  };
  const handleDel = async () => {
    if (!del) return;
    try {
      await debtsApi.delete(del.id);
      success("Debt removed");
      setDel(null);
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
        <StatCard
          label="Total balance"
          value={formatCurrency(data?.total_balance ?? 0)}
          color="var(--red)"
        />
        <StatCard
          label="Min. monthly"
          value={formatCurrency(data?.total_min_payment ?? 0)}
          color="var(--t1)"
        />
        <StatCard
          label="Monthly interest"
          value={formatCurrency(data?.monthly_interest ?? 0)}
          color="var(--amber)"
        />
      </div>

      {/* Strategy comparison */}
      {strats && strats.avalanche && (
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <SectionHeader
              title="Payoff strategies"
              sub="Compare Avalanche vs Snowball"
            />
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span style={{ fontSize: "0.775rem", color: "var(--t3)" }}>
                Extra/mo
              </span>
              <div className="input-group" style={{ width: 100 }}>
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  className="input"
                  value={extra}
                  onChange={(e) => setExtra(+e.target.value)}
                  min={0}
                  step={50}
                />
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            {[
              {
                k: "avalanche",
                label: "Avalanche",
                desc: "Highest interest first — minimizes total cost",
                color: "var(--green)",
              },
              {
                k: "snowball",
                label: "Snowball",
                desc: "Smallest balance first — maximizes wins",
                color: "var(--blue)",
              },
            ].map(({ k, label, desc, color }) => {
              const d = (strats as any)[k];
              return (
                <div
                  key={k}
                  style={{
                    background: "var(--bg-4)",
                    border: "1px solid var(--b1)",
                    borderRadius: "var(--r)",
                    padding: "1rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.825rem",
                      fontWeight: 700,
                      color,
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--t3)",
                      marginBottom: "0.875rem",
                    }}
                  >
                    {desc}
                  </div>
                  <div className="data-row">
                    <span className="data-row-label">Payoff time</span>
                    <span className="data-row-value">
                      {d.months_to_payoff} months
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="data-row-label">Total interest</span>
                    <span
                      className="data-row-value"
                      style={{ color: "var(--red)" }}
                    >
                      {formatCurrency(d.total_interest)}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: "0.625rem",
                      fontSize: "0.7rem",
                      color: "var(--t4)",
                    }}
                  >
                    Order: {d.order.slice(0, 3).join(" → ")}
                    {d.order.length > 3 ? ` +${d.order.length - 3} more` : ""}
                  </div>
                </div>
              );
            })}
          </div>
          {strats.interest_savings_with_avalanche > 0 && (
            <div className="insight">
              <div className="insight-label">Avalanche advantage</div>
              Saves {formatCurrency(strats.interest_savings_with_avalanche)} in
              interest and pays off {strats.time_savings_months} months sooner
              than Snowball.
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <SectionHeader title="Active debts" />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowAdd(true)}
          >
            + Add debt
          </button>
        </div>
        {data?.debts?.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Rate</th>
                <th>Min. payment</th>
                <th>Payoff</th>
                <th style={{ textAlign: "right" }}>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.debts.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500, color: "var(--t1)" }}>
                    {d.name}
                  </td>
                  <td>
                    <span className="badge badge-gray">
                      {DEBT_TYPE_LABELS[d.type] || d.type}
                    </span>
                  </td>
                  <td
                    style={{ fontFamily: "var(--mono)", color: "var(--amber)" }}
                  >
                    {d.interest_rate}%
                  </td>
                  <td style={{ fontFamily: "var(--mono)" }}>
                    {formatCurrency(d.minimum_payment)}
                  </td>
                  <td style={{ color: "var(--t3)" }}>
                    {d.months_to_payoff && d.months_to_payoff < 9999
                      ? `${d.months_to_payoff} mo`
                      : "—"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontWeight: 600,
                      color: "var(--red)",
                    }}
                  >
                    {formatCurrency(d.balance)}
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.25rem",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          setPayD(d);
                          setPayAmt("");
                        }}
                      >
                        Pay
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setEdit(d)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        style={{ color: "var(--red)" }}
                        onClick={() => setDel(d)}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty icon="✓" text="No active debts — great financial position!" />
        )}
      </div>

      <DebtForm
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={refetch}
      />
      {edit && (
        <DebtForm
          open
          onClose={() => setEdit(null)}
          onSaved={refetch}
          existing={edit}
        />
      )}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={handleDel}
        danger
        title="Delete debt"
        confirmLabel="Delete"
        message={`Remove "${del?.name}"?`}
      />
      {payD && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(5,8,12,0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setPayD(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 340,
              width: "100%",
              margin: "1rem",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: "0.875rem",
                fontSize: "0.9rem",
              }}
            >
              Log payment — {payD.name}
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--t3)",
                marginBottom: "0.75rem",
              }}
            >
              Current balance: {formatCurrency(payD.balance)}
            </div>
            <div className="input-group" style={{ marginBottom: "1rem" }}>
              <span className="input-prefix">$</span>
              <input
                type="number"
                className="input"
                placeholder="Payment amount"
                value={payAmt}
                onChange={(e) => setPayAmt(e.target.value)}
                autoFocus
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPayD(null)}
                disabled={paying}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePay}
                disabled={paying || !payAmt || +payAmt <= 0}
              >
                {paying ? "Applying..." : "Apply payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GOALS ────────────────────────────────────────────────────────────────────

function GoalsTab() {
  const { data, refetch } = useGoals();
  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<Goal | null>(null);
  const [del, setDel] = useState<Goal | null>(null);
  const [contG, setContG] = useState<Goal | null>(null);
  const [contAmt, setContAmt] = useState("");
  const [conting, setConting] = useState(false);
  const { success, error: te } = useToast();

  const handleDel = async () => {
    if (!del) return;
    try {
      await goalsApi.delete(del.id);
      success("Goal removed");
      setDel(null);
      refetch();
    } catch (e: any) {
      te(e.message);
    }
  };
  const handleCont = async () => {
    if (!contG || +contAmt <= 0) return;
    setConting(true);
    try {
      await goalsApi.contribute(contG.id, +contAmt);
      success(`Added ${formatCurrency(+contAmt)} to ${contG.name}`);
      setContG(null);
      setContAmt("");
      refetch();
    } catch (e: any) {
      te(e.message);
    } finally {
      setConting(false);
    }
  };

  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {data?.total_target ? (
          <div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--t3)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 3,
              }}
            >
              Overall progress
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--t1)" }}>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  color: "var(--green)",
                  fontWeight: 700,
                }}
              >
                {formatCurrency(data.total_saved, true)}
              </span>
              <span style={{ color: "var(--t3)" }}>
                {" "}
                of {formatCurrency(data.total_target, true)} ·{" "}
                {data.overall_pct?.toFixed(0)}%
              </span>
            </div>
          </div>
        ) : (
          <div />
        )}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setShowAdd(true)}
        >
          + New goal
        </button>
      </div>

      {data?.goals?.length ? (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
        >
          {data.goals.map((g) => {
            const pct = Math.min(
              100,
              g.target_amount > 0
                ? (g.current_amount / g.target_amount) * 100
                : 0,
            );
            const daysLeft = Math.max(
              0,
              Math.floor(
                (new Date(g.target_date).getTime() - Date.now()) / 86400000,
              ),
            );
            const color =
              pct >= 80
                ? "var(--green)"
                : pct >= 40
                  ? "var(--blue)"
                  : "var(--amber)";
            return (
              <div key={g.id} className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.875rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--t1)",
                        marginBottom: 3,
                      }}
                    >
                      {g.name}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <span className="badge badge-gray">
                        {g.category?.replace("_", " ")}
                      </span>
                      <span
                        className={`badge ${daysLeft < 90 ? "badge-amber" : "badge-gray"}`}
                      >
                        {daysLeft > 0 ? `${daysLeft}d left` : "Overdue"}
                      </span>
                      {g.on_track ? (
                        <span className="badge badge-green">On track</span>
                      ) : (
                        <span className="badge badge-red">Behind</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontWeight: 700,
                        color: "var(--green)",
                        fontSize: "1.1rem",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {formatCurrency(g.current_amount)}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--t3)" }}>
                      of {formatCurrency(g.target_amount)}
                    </div>
                  </div>
                </div>
                <div
                  className="progress-track"
                  style={{ marginBottom: "0.625rem" }}
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", color: "var(--t3)" }}>
                    {pct.toFixed(0)}% complete
                    {g.required_monthly != null && g.required_monthly < Infinity
                      ? ` · ${formatCurrency(g.required_monthly)}/mo needed`
                      : ""}
                  </span>
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-xs"
                      onClick={() => {
                        setContG(g);
                        setContAmt("");
                      }}
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setEdit(g)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ color: "var(--red)" }}
                      onClick={() => setDel(g)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          icon="◎"
          text="No goals yet — create your first financial goal"
        />
      )}

      <GoalForm
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={refetch}
      />
      {edit && (
        <GoalForm
          open
          onClose={() => setEdit(null)}
          onSaved={refetch}
          existing={edit}
        />
      )}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={handleDel}
        danger
        title="Delete goal"
        confirmLabel="Delete"
        message={`Remove "${del?.name}"?`}
      />
      {contG && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(5,8,12,0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setContG(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 340,
              width: "100%",
              margin: "1rem",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: "0.875rem",
                fontSize: "0.9rem",
              }}
            >
              Add to — {contG.name}
            </div>
            <div className="input-group" style={{ marginBottom: "1rem" }}>
              <span className="input-prefix">$</span>
              <input
                type="number"
                className="input"
                placeholder="Amount"
                value={contAmt}
                onChange={(e) => setContAmt(e.target.value)}
                autoFocus
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setContG(null)}
                disabled={conting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCont}
                disabled={conting || !contAmt || +contAmt <= 0}
              >
                {conting ? "Adding..." : "Add funds"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

function TransactionsTab() {
  const [month, setMonth] = useState(thisMonth());
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const userId = useFoliaStore((s) => s.userId)!;
  const { data, loading, refetch } = useTransactions({
    month,
    search: search || undefined,
  });
  const { success, error: te } = useToast();

  const handleDel = async (id: string) => {
    try {
      await transactionsApi.delete(id);
      success("Deleted");
      refetch();
    } catch (e: any) {
      te(e.message);
    }
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await transactionsApi.importCsv(userId, file);
      success(`Imported ${res.imported} transactions`);
      refetch();
    } catch (e: any) {
      te(e.message);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div
        style={{
          display: "flex",
          gap: "0.625rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="month"
          className="input"
          style={{ width: 160 }}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <input
          className="input"
          style={{ flex: 1, minWidth: 200 }}
          placeholder="Search by description or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setShowAdd(true)}
        >
          + Log
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => fileRef.current?.click()}
        >
          Import CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleCSV}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "0.75rem",
        }}
      >
        <StatCard
          label="Income"
          value={formatCurrency(data?.total_income ?? 0)}
          color="var(--green)"
        />
        <StatCard
          label="Expenses"
          value={formatCurrency(data?.total_expenses ?? 0)}
          color="var(--red)"
        />
        <StatCard
          label={
            data?.surplus_deficit != null && data.surplus_deficit >= 0
              ? "Surplus"
              : "Deficit"
          }
          value={formatCurrency(Math.abs(data?.surplus_deficit ?? 0))}
          color={
            (data?.surplus_deficit ?? 0) >= 0 ? "var(--green)" : "var(--red)"
          }
        />
      </div>

      <div className="card">
        {loading ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {[...Array(7)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 46 }} />
            ))}
          </div>
        ) : data?.transactions?.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td
                    style={{
                      fontFamily: "var(--mono)",
                      color: "var(--t3)",
                      fontSize: "0.75rem",
                    }}
                  >
                    {tx.date}
                  </td>
                  <td style={{ fontWeight: 500, color: "var(--t1)" }}>
                    {tx.description}
                  </td>
                  <td>
                    <span className="badge badge-gray">{tx.category}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${tx.type === "income" ? "badge-green" : "badge-gray"}`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontWeight: 600,
                      color:
                        tx.type === "income" ? "var(--green)" : "var(--t1)",
                    }}
                  >
                    {tx.type === "income" ? "+" : ""}
                    {formatCurrency(tx.amount)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ color: "var(--t4)" }}
                      onClick={() => handleDel(tx.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty icon="◉" text="No transactions this period" />
        )}
      </div>
      <TransactionForm
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={refetch}
      />
    </div>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div
        className="metric-value"
        style={{ color: color ?? "var(--t1)", fontSize: "1.35rem" }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: sub ? 2 : 0 }}>
      <div className="section-title">{title}</div>
      {sub && <div className="section-sub">{sub}</div>}
    </div>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      className="empty"
      style={{ paddingTop: "2rem", paddingBottom: "2rem" }}
    >
      <div className="empty-icon">{icon}</div>
      <div className="empty-text">{text}</div>
    </div>
  );
}

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}