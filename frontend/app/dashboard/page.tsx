"use client";
import Link from "next/link";
import { useDashboard, useNetWorthHistory, useHealthScore } from "@/hooks";
import { NetWorthChart } from "@/components/charts";
import {
  formatCurrency,
  getHealthGrade,
  LIFE_STAGE_COLORS,
  ALERT_PRIORITY_COLORS,
} from "@/lib/utils";
import { useFoliaStore } from "@/store";
import { alertsApi } from "@/lib/api/client";

export default function DashboardPage() {
  const { data: dash, loading, refetch } = useDashboard();
  const { data: history } = useNetWorthHistory(12);
  const { data: health } = useHealthScore();
  const metadata = useFoliaStore((s) => s.metadata);

  const nw = dash?.net_worth?.net_worth ?? 0;
  const assets = dash?.net_worth?.total_assets ?? 0;
  const debts = dash?.net_worth?.total_debts ?? 0;
  const grade = health ? getHealthGrade(health.total_score) : null;
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const stageColor = metadata
    ? (LIFE_STAGE_COLORS[metadata.life_stage] ?? "var(--green)")
    : "var(--green)";

  if (loading) return <Skeleton />;

  return (
    <div
      className="stagger"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        maxWidth: 1080,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--t4)",
              letterSpacing: "0.04em",
              marginBottom: 3,
            }}
          >
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--t1)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {greet}
          </h1>
          {metadata && (
            <p style={{ fontSize: "0.8rem", color: "var(--t3)", marginTop: 4 }}>
              {metadata.life_stage.charAt(0).toUpperCase() + metadata.life_stage.slice(1)}{" "}
              stage · Age {metadata.age} ·{" "}
              {metadata.income_type.replace("_", "-").toUpperCase()}
            </p>
          )}
        </div>
        {(dash?.alerts ?? []).length > 0 && (
          <Link href="/dashboard#alerts" style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "var(--red-bg)",
                border: "1px solid var(--red-border)",
                borderRadius: "var(--r)",
                padding: "0.4rem 0.75rem",
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--red)",
                }}
              />
              <span
                style={{
                  fontSize: "0.775rem",
                  color: "var(--red)",
                  fontWeight: 600,
                }}
              >
                {dash!.alerts?.length || 0} alert{(dash!.alerts?.length || 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* ── Primary: Net Worth + Health Score ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: "1rem",
        }}
      >
        {/* Net worth card */}
        <div className="card" style={{ padding: "1.375rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "1rem",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--t3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 6,
                }}
              >
                Net worth
              </div>
              <div
                style={{
                  fontSize: "2.4rem",
                  fontWeight: 700,
                  fontFamily: "var(--mono)",
                  color: nw >= 0 ? "var(--green)" : "var(--red)",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                }}
              >
                {formatCurrency(nw)}
              </div>
            </div>
            <div
              style={{ display: "flex", gap: "1.25rem", textAlign: "right" }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--t4)",
                    marginBottom: 3,
                  }}
                >
                  Assets
                </div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontFamily: "var(--mono)",
                    fontWeight: 600,
                    color: "var(--green)",
                  }}
                >
                  {formatCurrency(assets, true)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--t4)",
                    marginBottom: 3,
                  }}
                >
                  Debts
                </div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontFamily: "var(--mono)",
                    fontWeight: 600,
                    color: "var(--red)",
                  }}
                >
                  {formatCurrency(debts, true)}
                </div>
              </div>
            </div>
          </div>
          {(history?.snapshots?.length ?? 0) > 1 ? (
            <NetWorthChart data={history!.snapshots} height={130} />
          ) : (
            <div
              style={{
                height: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--t4)",
                fontSize: "0.75rem",
                borderRadius: "var(--r)",
                border: "1px dashed var(--b1)",
                background: "var(--bg-3)",
              }}
            >
              Chart builds after first month
            </div>
          )}
        </div>

        {/* Health score */}
        <div className="card" style={{ padding: "1.375rem" }}>
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--t3)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: "0.875rem",
            }}
          >
            Health score
          </div>
          {health ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "0.5rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div
                  style={{
                    fontSize: "3rem",
                    fontWeight: 700,
                    fontFamily: "var(--mono)",
                    color: grade?.color,
                    letterSpacing: "-0.05em",
                    lineHeight: 1,
                  }}
                >
                  {Math.round(health.total_score)}
                </div>
                <div style={{ paddingBottom: 6 }}>
                  <div
                    style={{
                      fontSize: "0.775rem",
                      fontWeight: 600,
                      color: grade?.color,
                    }}
                  >
                    {grade?.label}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--t3)" }}>
                    out of 100
                  </div>
                </div>
              </div>
              {[
                { l: "Emergency fund", v: health.emergency_fund_score, m: 25 },
                { l: "Debt ratio", v: health.debt_to_income_score, m: 25 },
                { l: "Savings rate", v: health.savings_rate_score, m: 25 },
                { l: "Trajectory", v: health.trajectory_score, m: 25 },
              ].map(({ l, v, m }) => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: "0.72rem", color: "var(--t3)" }}>
                      {l}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontFamily: "var(--mono)",
                        color: "var(--t2)",
                      }}
                    >
                      {v}/{m}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(v / m) * 100}%`,
                        background: getHealthGrade((v / m) * 100).color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 140,
                color: "var(--t4)",
                fontSize: "0.8rem",
              }}
            >
              Complete onboarding
            </div>
          )}
        </div>
      </div>

      {/* ── Quick stats row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.75rem",
        }}
      >
        {[
          {
            label: "Monthly income",
            value: metadata ? formatCurrency(metadata.annual_income / 12, true) : "—",
            color: "var(--green)",
            sub: "gross",
          },
          {
            label: "Monthly expenses",
            value: metadata ? formatCurrency(metadata.monthly_expenses, true) : "—",
            color: "var(--t1)",
            sub: "estimated",
          },
          {
            label: "Emergency fund",
            value: metadata ? `${metadata.emergency_fund_months} mo` : "—",
            color:
              metadata && metadata.emergency_fund_months >= 3
                ? "var(--green)"
                : "var(--amber)",
            sub: "of expenses",
          },
          {
            label: "Active goals",
            value: dash?.goals?.length?.toString() ?? "0",
            color: "var(--blue)",
            sub: "in progress",
          },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="metric">
            <div className="metric-label">{label}</div>
            <div
              className="metric-value"
              style={{ color, fontSize: "1.35rem" }}
            >
              {value}
            </div>
            <div className="metric-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Goals + Debts ── */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
      >
        {/* Goals */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div className="section-title">Goals</div>
            <Link
              href="/finances"
              style={{
                fontSize: "0.72rem",
                color: "var(--green)",
                textDecoration: "none",
                opacity: 0.8,
              }}
            >
              View all →
            </Link>
          </div>
          {(dash?.goals?.length ?? 0) > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {dash!.goals.slice(0, 4).map((g: any) => {
                const pct = Math.min(
                  100,
                  g.target_amount > 0
                    ? (g.current_amount / g.target_amount) * 100
                    : 0,
                );
                const color =
                  pct >= 80
                    ? "var(--green)"
                    : pct >= 40
                      ? "var(--blue)"
                      : "var(--amber)";
                return (
                  <div key={g.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.825rem",
                          color: "var(--t1)",
                          fontWeight: 500,
                        }}
                      >
                        {g.name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontFamily: "var(--mono)",
                          color: "var(--t2)",
                        }}
                      >
                        {formatCurrency(g.current_amount, true)} /{" "}
                        {formatCurrency(g.target_amount, true)}
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-icon">◎</div>
              <div className="empty-text">No goals yet</div>
              <Link
                href="/finances"
                style={{
                  fontSize: "0.775rem",
                  color: "var(--green)",
                  textDecoration: "none",
                  marginTop: 4,
                }}
              >
                Add your first goal →
              </Link>
            </div>
          )}
        </div>

        {/* Alerts */}
        <div id="alerts" className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div className="section-title">Alerts</div>
            <span style={{ fontSize: "0.68rem", color: "var(--t4)" }}>
              {dash?.alerts?.length ?? 0} unread
            </span>
          </div>
          {(dash?.alerts?.length ?? 0) > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {dash!.alerts.slice(0, 5).map((a: any) => (
                <AlertRow key={a.id} alert={a} onDismiss={refetch} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-icon">✓</div>
              <div className="empty-text">All caught up</div>
              <div className="empty-sub">No alerts right now</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Active debts ── */}
      {(dash?.debts?.length ?? 0) > 0 && (
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div className="section-title">Active debts</div>
            <Link
              href="/finances"
              style={{
                fontSize: "0.72rem",
                color: "var(--green)",
                textDecoration: "none",
                opacity: 0.8,
              }}
            >
              Manage →
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "0.625rem",
            }}
          >
            {dash!.debts.slice(0, 6).map((d: any) => (
              <div
                key={d.id}
                className="card-sm"
                style={{ background: "var(--bg-4)" }}
              >
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--t3)",
                    marginBottom: 3,
                  }}
                >
                  {d.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: "var(--red)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {formatCurrency(d.balance, true)}
                </div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--t4)",
                    marginTop: 3,
                  }}
                >
                  {d.interest_rate}% APR · ${d.minimum_payment}/mo
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Health improvements ── */}
      {(health?.improvements?.length ?? 0) > 0 && (
        <div className="insight">
          <div className="insight-label">Top actions to improve your score</div>
          {health!.improvements.slice(0, 2).map((imp: string, i: number) => (
            <div
              key={i}
              style={{
                marginBottom: i < health!.improvements.length - 1 ? "0.5rem" : 0,
              }}
            >
              → {imp}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert, onDismiss }: { alert: any; onDismiss: () => void }) {
  const color = ALERT_PRIORITY_COLORS[alert.priority] ?? "var(--t3)";
  const dismiss = async () => {
    try {
      await alertsApi.dismiss(alert.id);
      onDismiss();
    } catch {}
  };
  return (
    <div className="list-item" style={{ gap: "0.625rem", cursor: "default" }}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          marginTop: 1,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "var(--t1)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {alert.title}
        </div>
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--t3)",
            marginTop: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {alert.message}
        </div>
      </div>
      <button
        onClick={dismiss}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--t4)",
          fontSize: "0.7rem",
          flexShrink: 0,
          padding: "0.125rem",
          borderRadius: 4,
          transition: "color 0.1s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t2)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--t4)")}
      >
        ✕
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        maxWidth: 1080,
      }}
    >
      <div className="skeleton" style={{ height: 52, width: 260 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: "1rem",
        }}
      >
        <div className="skeleton" style={{ height: 220 }} />
        <div className="skeleton" style={{ height: 220 }} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "0.75rem",
        }}
      >
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 76 }} />
        ))}
      </div>
    </div>
  );
}
