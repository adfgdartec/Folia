"use client";
import { useState } from "react";
import { useFoliaStore } from "@/store";
import { stocksApi, paperTradingApi, macroApi } from "@/lib/api/client";
import { usePaperPortfolio, useMacroIndicators } from "@/hooks";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import type { StockData } from "@/types";

type Tab = "stocks" | "portfolio" | "macro" | "etf" | "crypto";

const MACRO_COLORS: Record<string, string> = {
  cpi: "var(--amber)",
  fed_funds: "var(--red)",
  unemployment: "var(--blue)",
  gdp: "var(--green)",
  mortgage_30: "var(--coral)",
  sp500: "var(--teal)",
  inflation: "var(--amber)",
  yield_spread: "var(--purple)",
  m2: "var(--t2)",
};

const ETF_PRESETS = [
  { ticker: "SPY", name: "S&P 500", er: 0.0945, style: "Blend", size: "Large" },
  {
    ticker: "QQQ",
    name: "Nasdaq 100",
    er: 0.2,
    style: "Growth",
    size: "Large",
  },
  {
    ticker: "VTI",
    name: "Total US Market",
    er: 0.03,
    style: "Blend",
    size: "All",
  },
  {
    ticker: "VXUS",
    name: "Total Intl Market",
    er: 0.07,
    style: "Blend",
    size: "All",
  },
  {
    ticker: "BND",
    name: "Total Bond Market",
    er: 0.03,
    style: "Bond",
    size: "All",
  },
  {
    ticker: "VNQ",
    name: "Real Estate (REIT)",
    er: 0.12,
    style: "Value",
    size: "REIT",
  },
  { ticker: "GLD", name: "Gold", er: 0.4, style: "Comm.", size: "Comd." },
  {
    ticker: "IWM",
    name: "Russell 2000",
    er: 0.19,
    style: "Blend",
    size: "Small",
  },
];

const CRYPTO_COINS = [
  { symbol: "BTC", name: "Bitcoin", cat: "Store of value" },
  { symbol: "ETH", name: "Ethereum", cat: "Smart contracts" },
  { symbol: "SOL", name: "Solana", cat: "High-performance" },
  { symbol: "USDC", name: "USD Coin", cat: "Stablecoin" },
  { symbol: "BNB", name: "BNB", cat: "Exchange token" },
];

export default function InvestPage() {
  const [tab, setTab] = useState<Tab>("stocks");
  const userId = useFoliaStore((s) => s.userId)!;
  const dna = useFoliaStore((s) => s.dna);

  const TABS = [
    { id: "stocks" as Tab, label: "Stocks" },
    { id: "etf" as Tab, label: "ETF Screener" },
    { id: "portfolio" as Tab, label: "Paper Portfolio" },
    { id: "macro" as Tab, label: "Macro Lab" },
    { id: "crypto" as Tab, label: "Crypto" },
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
          Invest
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--t3)", marginTop: 4 }}>
          Real market data · Paper trading · ETF screening · Macro intelligence
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
      {tab === "stocks" && <StocksTab dna={dna} />}
      {tab === "etf" && <ETFTab />}
      {tab === "portfolio" && <PortfolioTab userId={userId} />}
      {tab === "macro" && <MacroTab />}
      {tab === "crypto" && <CryptoTab />}
    </div>
  );
}

// ─── STOCKS ───────────────────────────────────────────────────────────────────

function StocksTab({ dna }: { dna: any }) {
  const [query, setQuery] = useState("");
  const [searchRes, setSearchRes] = useState<
    { symbol: string; name: string }[]
  >([]);
  const [result, setResult] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setSearchRes([]);
      return;
    }
    try {
      const r = await stocksApi.search(q);
      setSearchRes(r.results.slice(0, 6));
    } catch {}
  };

  const lookup = async (t: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    setSearchRes([]);
    try {
      const r = await stocksApi.get(t.toUpperCase(), dna ?? undefined);
      setResult(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const QUICK = [
    "AAPL",
    "MSFT",
    "GOOGL",
    "AMZN",
    "NVDA",
    "TSLA",
    "META",
    "SPY",
    "QQQ",
    "BRK-B",
  ];

  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div className="card">
        <div
          style={{ display: "flex", gap: "0.625rem", marginBottom: "0.75rem" }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <input
              className="input"
              placeholder="Search ticker or company name (e.g. AAPL, Tesla)..."
              value={query}
              onChange={(e) => search(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") lookup(query);
              }}
            />
            {searchRes.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  background: "var(--bg-5)",
                  border: "1px solid var(--b2)",
                  borderRadius: "var(--r)",
                  marginTop: 3,
                  overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                {searchRes.map((r) => (
                  <button
                    key={r.symbol}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "0.6rem 0.875rem",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--t1)",
                      fontSize: "0.825rem",
                      transition: "background 0.08s",
                    }}
                    onClick={() => {
                      setQuery(r.symbol);
                      lookup(r.symbol);
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-4)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: "var(--green)",
                        marginRight: 10,
                      }}
                    >
                      {r.symbol}
                    </span>
                    <span style={{ color: "var(--t2)", fontSize: "0.775rem" }}>
                      {r.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={() => lookup(query)}
            disabled={loading || !query.trim()}
          >
            {loading ? "..." : "Look up"}
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {QUICK.map((t) => (
            <button
              key={t}
              className="btn btn-ghost btn-xs"
              onClick={() => {
                setQuery(t);
                lookup(t);
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-red">{error}</div>}
      {loading && <div className="skeleton" style={{ height: 280 }} />}

      {result && (
        <div
          className="stagger"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.75rem",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {result.ticker}
                  </span>
                  <span style={{ fontSize: "0.875rem", color: "var(--t3)" }}>
                    {result.company_name}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "2rem",
                      fontWeight: 700,
                      fontFamily: "var(--mono)",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {formatCurrency(result.current_price)}
                  </span>
                  <span
                    style={{
                      fontSize: "0.9rem",
                      fontFamily: "var(--mono)",
                      color:
                        result.change_pct >= 0 ? "var(--green)" : "var(--red)",
                      fontWeight: 600,
                    }}
                  >
                    {result.change_pct >= 0 ? "+" : ""}
                    {result.change_pct.toFixed(2)}%
                  </span>
                </div>
              </div>
              {result.market_cap && (
                <div className="metric" style={{ minWidth: 120 }}>
                  <div className="metric-label">Market cap</div>
                  <div className="metric-value" style={{ fontSize: "1rem" }}>
                    {formatCurrency(result.market_cap, true)}
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(110px,1fr))",
                gap: "0.5rem",
                marginTop: "1.25rem",
              }}
            >
              {[
                { l: "P/E ratio", v: result.pe_ratio?.toFixed(1) },
                {
                  l: "EPS",
                  v: result.eps != null ? formatCurrency(result.eps) : null,
                },
                {
                  l: "Dividend yield",
                  v:
                    result.dividend_yield != null
                      ? `${result.dividend_yield.toFixed(2)}%`
                      : null,
                },
                { l: "Debt/equity", v: result.debt_to_equity?.toFixed(2) },
                {
                  l: "52w high",
                  v:
                    result.week_52_high != null
                      ? formatCurrency(result.week_52_high)
                      : null,
                },
                {
                  l: "52w low",
                  v:
                    result.week_52_low != null
                      ? formatCurrency(result.week_52_low)
                      : null,
                },
              ]
                .filter((x) => x.v != null)
                .map(({ l, v }) => (
                  <div
                    key={l}
                    style={{
                      background: "var(--bg-4)",
                      borderRadius: "var(--r-sm)",
                      padding: "0.5rem 0.625rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--t4)",
                        marginBottom: 2,
                      }}
                    >
                      {l}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "0.825rem",
                        fontWeight: 600,
                        color: "var(--t1)",
                      }}
                    >
                      {v}
                    </div>
                  </div>
                ))}
            </div>
          </div>
          {result.ai_summary && (
            <div
              className="insight insight-blue"
              style={{
                borderLeftColor: "var(--blue)",
                background: "var(--blue-bg)",
              }}
            >
              <div className="insight-label" style={{ color: "var(--blue)" }}>
                AI analysis
              </div>
              {result.ai_summary}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ETF SCREENER ─────────────────────────────────────────────────────────────

function ETFTab() {
  const [lookup, setLookup] = useState<StockData | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const dna = useFoliaStore((s) => s.dna);

  const fetch = async (ticker: string) => {
    setLoading(ticker);
    try {
      const r = await stocksApi.get(ticker, dna ?? undefined);
      setLookup(r);
    } catch {
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div
        className="insight insight-blue"
        style={{ borderLeftColor: "var(--blue)", background: "var(--blue-bg)" }}
      >
        <div className="insight-label" style={{ color: "var(--blue)" }}>
          ETF education
        </div>
        Index ETFs outperform ~85% of actively managed funds over 10-year
        periods after fees. A simple 3-fund portfolio (US stocks + intl stocks +
        bonds) beats most sophisticated strategies.
      </div>
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>
          Common ETFs
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Name</th>
              <th>Style</th>
              <th>Expense ratio</th>
              <th>Size</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ETF_PRESETS.map((etf) => (
              <tr key={etf.ticker}>
                <td
                  style={{
                    fontWeight: 700,
                    color: "var(--green)",
                    fontFamily: "var(--mono)",
                  }}
                >
                  {etf.ticker}
                </td>
                <td style={{ color: "var(--t1)", fontWeight: 500 }}>
                  {etf.name}
                </td>
                <td>
                  <span className="badge badge-gray">{etf.style}</span>
                </td>
                <td
                  style={{
                    fontFamily: "var(--mono)",
                    color:
                      etf.er <= 0.05
                        ? "var(--green)"
                        : etf.er <= 0.2
                          ? "var(--amber)"
                          : "var(--red)",
                  }}
                >
                  {etf.er}%
                </td>
                <td>
                  <span className="badge badge-gray">{etf.size}</span>
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => fetch(etf.ticker)}
                    disabled={loading === etf.ticker}
                  >
                    {loading === etf.ticker ? "..." : "Look up"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lookup && (
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span
                style={{ fontSize: "1.2rem", fontWeight: 700, marginRight: 8 }}
              >
                {lookup.ticker}
              </span>
              <span style={{ color: "var(--t3)" }}>{lookup.company_name}</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}
            >
              <span
                style={{
                  fontSize: "1.3rem",
                  fontFamily: "var(--mono)",
                  fontWeight: 700,
                }}
              >
                {formatCurrency(lookup.current_price)}
              </span>
              <span
                style={{
                  color: lookup.change_pct >= 0 ? "var(--green)" : "var(--red)",
                  fontFamily: "var(--mono)",
                }}
              >
                {lookup.change_pct >= 0 ? "+" : ""}
                {lookup.change_pct.toFixed(2)}%
              </span>
            </div>
          </div>
          {lookup.ai_summary && (
            <p
              style={{
                fontSize: "0.825rem",
                color: "var(--t2)",
                lineHeight: 1.65,
                marginTop: "0.875rem",
              }}
            >
              {lookup.ai_summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PAPER PORTFOLIO ──────────────────────────────────────────────────────────

function PortfolioTab({ userId }: { userId: string }) {
  const { data: port, refetch } = usePaperPortfolio();
  const [ticker, setTicker] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { success, error: te } = useToast();

  const create = async () => {
    await paperTradingApi.createPortfolio(userId);
    refetch();
  };

  const placeOrder = async () => {
    if (!port?.portfolio || !ticker || !shares) return;
    setLoading(true);
    try {
      await paperTradingApi.placeOrder({
        portfolio_id: port.portfolio.id,
        user_id: userId,
        ticker: ticker.toUpperCase(),
        order_type: "market",
        side,
        shares: +shares,
        reasoning: reason || undefined,
      });
      success(
        `${side.toUpperCase()} ${shares} ${ticker.toUpperCase()} executed`,
      );
      setTicker("");
      setShares("");
      setReason("");
      refetch();
    } catch (e: any) {
      te(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!port?.portfolio) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <div
          style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}
        >
          Start paper trading
        </div>
        <div
          style={{
            fontSize: "0.825rem",
            color: "var(--t3)",
            marginBottom: "1.25rem",
          }}
        >
          Practice investing with $100,000 in virtual cash — zero real money
          risk
        </div>
        <button className="btn btn-primary" onClick={create}>
          Create paper portfolio
        </button>
      </div>
    );
  }

  const totalReturn = port.total_return_pct ?? 0;
  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "0.75rem",
        }}
      >
        {[
          {
            l: "Total value",
            v: formatCurrency(port.total_value ?? 0),
            c: "var(--t1)",
          },
          {
            l: "Cash",
            v: formatCurrency(port.cash_balance ?? 0),
            c: "var(--t2)",
          },
          {
            l: "Invested",
            v: formatCurrency(port.holdings_value ?? 0),
            c: "var(--blue)",
          },
          {
            l: "Total return",
            v: `${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`,
            c: totalReturn >= 0 ? "var(--green)" : "var(--red)",
          },
        ].map(({ l, v, c }) => (
          <div key={l} className="metric">
            <div className="metric-label">{l}</div>
            <div
              className="metric-value"
              style={{ color: c, fontSize: "1.15rem" }}
            >
              {v}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>
          Place order
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.625rem",
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              className={`btn btn-sm ${side === "buy" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSide("buy")}
            >
              Buy
            </button>
            <button
              className={`btn btn-sm ${side === "sell" ? "btn-danger" : "btn-secondary"}`}
              onClick={() => setSide("sell")}
            >
              Sell
            </button>
          </div>
          <input
            className="input"
            style={{ width: 90 }}
            placeholder="TICKER"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
          />
          <input
            type="number"
            className="input"
            style={{ width: 90 }}
            placeholder="Shares"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            min={0.001}
            step={1}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            placeholder="Trade thesis (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={placeOrder}
            disabled={loading || !ticker || !shares}
          >
            {loading ? "..." : "Execute"}
          </button>
        </div>
      </div>

      {port.holdings?.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: "1rem" }}>
            Holdings
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Shares</th>
                <th>Avg cost</th>
                <th>Current</th>
                <th style={{ textAlign: "right" }}>Market value</th>
                <th style={{ textAlign: "right" }}>P&L</th>
              </tr>
            </thead>
            <tbody>
              {port.holdings.map((h: any) => (
                <tr key={h.id}>
                  <td style={{ fontWeight: 700, color: "var(--t1)" }}>
                    {h.ticker}
                  </td>
                  <td style={{ fontFamily: "var(--mono)" }}>
                    {h.shares.toFixed(4)}
                  </td>
                  <td style={{ fontFamily: "var(--mono)", color: "var(--t3)" }}>
                    {formatCurrency(h.avg_cost)}
                  </td>
                  <td style={{ fontFamily: "var(--mono)" }}>
                    {h.current_price ? formatCurrency(h.current_price) : "—"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontWeight: 600,
                    }}
                  >
                    {h.market_value ? formatCurrency(h.market_value) : "—"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontWeight: 600,
                      color:
                        h.unrealized_pnl >= 0 ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {h.unrealized_pnl != null
                      ? `${h.unrealized_pnl >= 0 ? "+" : ""}${formatCurrency(h.unrealized_pnl)} (${h.pnl_pct?.toFixed(1)}%)`
                      : "—"}
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

// ─── MACRO LAB ────────────────────────────────────────────────────────────────

function MacroTab() {
  const { data: macro, loading } = useMacroIndicators();
  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div
        className="card-sm"
        style={{ fontSize: "0.8rem", color: "var(--t2)", lineHeight: 1.6 }}
      >
        Live data from the Federal Reserve (FRED) · Updated weekly · Seasonally
        adjusted where applicable
      </div>
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))",
            gap: "0.75rem",
          }}
        >
          {[...Array(12)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80 }} />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))",
            gap: "0.75rem",
          }}
        >
          {macro?.indicators?.map((ind: any) => (
            <div key={ind.key} className="metric">
              <div className="metric-label">{ind.label}</div>
              <div
                className="metric-value"
                style={{
                  color: MACRO_COLORS[ind.key] ?? "var(--t1)",
                  fontSize: "1.3rem",
                }}
              >
                {ind.value != null
                  ? ind.value.toFixed(ind.value > 100 ? 0 : 2)
                  : "—"}
              </div>
              {ind.change != null && (
                <div
                  className={`metric-change ${ind.change >= 0 ? "up" : "down"}`}
                >
                  {ind.change >= 0 ? "+" : ""}
                  {ind.change.toFixed(2)}
                </div>
              )}
              {ind.date && <div className="metric-sub">{ind.date}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CRYPTO ───────────────────────────────────────────────────────────────────

function CryptoTab() {
  return (
    <div
      className="stagger"
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div className="alert alert-amber">
        ⚠ Cryptocurrency is highly volatile. Only invest what you can afford to
        lose entirely. Most financial advisors recommend limiting crypto to 1–5%
        of total portfolio.
      </div>
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>
          Major cryptocurrencies
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Name</th>
              <th>Category</th>
              <th>Tax treatment</th>
            </tr>
          </thead>
          <tbody>
            {CRYPTO_COINS.map((c) => (
              <tr key={c.symbol}>
                <td
                  style={{
                    fontWeight: 700,
                    fontFamily: "var(--mono)",
                    color: "var(--amber)",
                  }}
                >
                  {c.symbol}
                </td>
                <td style={{ fontWeight: 500, color: "var(--t1)" }}>
                  {c.name}
                </td>
                <td>
                  <span className="badge badge-gray">{c.cat}</span>
                </td>
                <td style={{ fontSize: "0.775rem", color: "var(--t3)" }}>
                  Capital gains (short/long term)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>
          Crypto tax rules (US)
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}
        >
          {[
            {
              rule: "Hold &lt; 1 year",
              treatment:
                "Short-term capital gains — taxed as ordinary income (10–37%)",
            },
            {
              rule: "Hold ≥ 1 year",
              treatment: "Long-term capital gains — taxed at 0%, 15%, or 20%",
            },
            {
              rule: "Crypto → crypto",
              treatment:
                "Taxable event — even trading BTC for ETH triggers capital gains",
            },
            {
              rule: "Crypto income",
              treatment:
                "Mining, staking rewards taxed as ordinary income at receipt value",
            },
            {
              rule: "NFT sales",
              treatment:
                "Taxable — treated as property like other crypto assets",
            },
          ].map(({ rule, treatment }) => (
            <div key={rule} className="data-row">
              <span
                className="data-row-label"
                dangerouslySetInnerHTML={{ __html: rule }}
              />
              <span
                style={{
                  fontSize: "0.775rem",
                  color: "var(--t2)",
                  maxWidth: 440,
                  textAlign: "right",
                }}
              >
                {treatment}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
