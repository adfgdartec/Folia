"use client";
import { useState, useEffect } from "react";
import { useFoliaStore } from "@/store";
import { stocksApi, paperTradingApi, macroApi } from "@/lib/api/client";
import { usePaperPortfolio, useMacroIndicators } from "@/hooks";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { NetWorthChart, DonutChart } from "@/components/charts";
import type { StockData, PaperTrade, PaperHolding } from "@/types";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, CartesianGrid, Legend
} from 'recharts';

type Tab = "stocks" | "portfolio" | "macro" | "etf" | "crypto" | "ai-insights";

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
  { ticker: "QQQ", name: "Nasdaq 100", er: 0.2, style: "Growth", size: "Large" },
  { ticker: "VTI", name: "Total US Market", er: 0.03, style: "Blend", size: "All" },
  { ticker: "VXUS", name: "Total Intl Market", er: 0.07, style: "Blend", size: "All" },
  { ticker: "BND", name: "Total Bond Market", er: 0.03, style: "Bond", size: "All" },
  { ticker: "VNQ", name: "Real Estate (REIT)", er: 0.12, style: "Value", size: "REIT" },
  { ticker: "GLD", name: "Gold", er: 0.4, style: "Comm.", size: "Comd." },
  { ticker: "IWM", name: "Russell 2000", er: 0.19, style: "Blend", size: "Small" },
];

const CRYPTO_COINS = [
  { symbol: "BTC", name: "Bitcoin", cat: "Store of value" },
  { symbol: "ETH", name: "Ethereum", cat: "Smart contracts" },
  { symbol: "SOL", name: "Solana", cat: "High-performance" },
  { symbol: "USDC", name: "USD Coin", cat: "Stablecoin" },
  { symbol: "BNB", name: "BNB", cat: "Exchange token" },
];

// Mock price history generator for stock charts
function generateMockPriceHistory(currentPrice: number, days: number = 30) {
  const data = [];
  let price = currentPrice * 0.95;
  const volatility = 0.02;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.5) * volatility * price;
    price = price + change;
    if (i === 0) price = currentPrice;
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Number(price.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000,
    });
  }
  return data;
}

export default function InvestPage() {
  const [tab, setTab] = useState<Tab>("portfolio");
  const userId = useFoliaStore((s) => s.userId)!;
  const metadata = useFoliaStore((s) => s.metadata);

  const TABS = [
    { id: "portfolio" as Tab, label: "Paper Portfolio" },
    { id: "stocks" as Tab, label: "Stock Research" },
    { id: "ai-insights" as Tab, label: "AI Insights" },
    { id: "etf" as Tab, label: "ETF Screener" },
    { id: "macro" as Tab, label: "Macro Lab" },
    { id: "crypto" as Tab, label: "Crypto" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 1200 }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.03em" }}>
          Invest
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--t3)", marginTop: 4 }}>
          Real market data - Paper trading - ETF screening - AI-powered insights at quant level
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
      {tab === "portfolio" && <PortfolioTab userId={userId} />}
      {tab === "stocks" && <StocksTab metadata={metadata} />}
      {tab === "ai-insights" && <AIInsightsTab userId={userId} metadata={metadata} />}
      {tab === "etf" && <ETFTab />}
      {tab === "macro" && <MacroTab />}
      {tab === "crypto" && <CryptoTab />}
    </div>
  );
}

// ─── ENHANCED PORTFOLIO TAB ───────────────────────────────────────────────────

function PortfolioTab({ userId }: { userId: string }) {
  const { data: port, refetch } = usePaperPortfolio();
  const [ticker, setTicker] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTradeHistory, setShowTradeHistory] = useState(false);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [selectedHolding, setSelectedHolding] = useState<PaperHolding | null>(null);
  const [stockPrice, setStockPrice] = useState<number | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const { success, error: te } = useToast();

  // Fetch current price when ticker changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (ticker.length < 1) {
        setStockPrice(null);
        setEstimatedCost(0);
        return;
      }
      try {
        const data = await stocksApi.get(ticker.toUpperCase());
        setStockPrice(data.current_price);
        if (shares) {
          setEstimatedCost(data.current_price * parseFloat(shares));
        }
      } catch {
        setStockPrice(null);
      }
    };
    const timeout = setTimeout(fetchPrice, 300);
    return () => clearTimeout(timeout);
  }, [ticker, shares]);

  // Load trade history
  useEffect(() => {
    if (showTradeHistory && userId) {
      paperTradingApi.getTrades(userId).then(r => setTrades(r.trades || [])).catch(() => {});
    }
  }, [showTradeHistory, userId]);

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
      success(`${side.toUpperCase()} ${shares} ${ticker.toUpperCase()} executed at ${stockPrice ? formatCurrency(stockPrice) : 'market price'}`);
      setTicker("");
      setShares("");
      setReason("");
      setStockPrice(null);
      setEstimatedCost(0);
      refetch();
    } catch (e: any) {
      te(e.message);
    } finally {
      setLoading(false);
    }
  };

  const quickSell = async (holding: PaperHolding, sellShares: number) => {
    if (!port?.portfolio) return;
    setLoading(true);
    try {
      await paperTradingApi.placeOrder({
        portfolio_id: port.portfolio.id,
        user_id: userId,
        ticker: holding.ticker,
        order_type: "market",
        side: "sell",
        shares: sellShares,
        reasoning: "Quick sell from portfolio view",
      });
      success(`Sold ${sellShares} shares of ${holding.ticker}`);
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
        <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Start paper trading
        </div>
        <div style={{ fontSize: "0.825rem", color: "var(--t3)", marginBottom: "1.25rem" }}>
          Practice investing with $100,000 in virtual cash - zero real money risk
        </div>
        <button className="btn btn-primary" onClick={create}>
          Create paper portfolio
        </button>
      </div>
    );
  }

  const totalReturn = port.total_return_percent ?? 0;
  const holdings = port.holdings || [];
  
  // Portfolio performance chart data
  const portfolioHistory = port.portfolio?.daily_values?.map((p: any) => ({
    date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: p.value,
  })) || [{ date: 'Today', value: port.total_value }];

  // Sector allocation data for donut chart
  const sectorData = holdings.reduce((acc: any[], h: any) => {
    const sector = h.sector || "Other";
    const item = acc.find((s) => s.name === sector);
    const value = h.market_value || h.shares * (h.current_price || h.avg_cost);
    if (item) item.value += value;
    else acc.push({ name: sector, value });
    return acc;
  }, []);

  if (port.cash_balance > 0) {
    sectorData.push({ name: "Cash", value: port.cash_balance });
  }

  return (
    <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Portfolio Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
        {[
          { l: "Total Value", v: formatCurrency(port.total_value ?? 0), c: "var(--t1)", sub: "Portfolio" },
          { l: "Cash Available", v: formatCurrency(port.cash_balance ?? 0), c: "var(--blue)", sub: "Buying power" },
          { l: "Invested", v: formatCurrency((port.total_value ?? 0) - (port.cash_balance ?? 0)), c: "var(--teal)", sub: "In positions" },
          { l: "Total Return", v: `${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`, c: totalReturn >= 0 ? "var(--green)" : "var(--red)", sub: "Since inception" },
        ].map(({ l, v, c, sub }) => (
          <div key={l} className="metric">
            <div className="metric-label">{l}</div>
            <div className="metric-value" style={{ color: c, fontSize: "1.35rem" }}>{v}</div>
            <div className="metric-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Portfolio Performance Chart - E*Trade style */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <div className="section-title">Portfolio Performance</div>
            <div className="section-sub">Daily portfolio value over time</div>
          </div>
          <div style={{ display: "flex", gap: "0.375rem" }}>
            {["1W", "1M", "3M", "1Y", "ALL"].map(period => (
              <button key={period} className="btn btn-ghost btn-xs" style={{ minWidth: 40 }}>{period}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={portfolioHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={totalReturn >= 0 ? "#22d47e" : "#ff5555"} stopOpacity={0.2} />
                <stop offset="100%" stopColor={totalReturn >= 0 ? "#22d47e" : "#ff5555"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: '#49535f', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#49535f', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={50} />
            <Tooltip
              contentStyle={{ background: '#141920', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 10, fontSize: '0.775rem' }}
              formatter={(value: number) => [formatCurrency(value), 'Value']}
            />
            <Area type="monotone" dataKey="value" stroke={totalReturn >= 0 ? "#22d47e" : "#ff5555"} strokeWidth={2} fill="url(#portfolioGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trade Order Form - Enhanced */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>Place Order</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className={`btn ${side === "buy" ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1 }}
                onClick={() => setSide("buy")}
              >
                BUY
              </button>
              <button
                className={`btn ${side === "sell" ? "btn-danger" : "btn-secondary"}`}
                style={{ flex: 1, background: side === "sell" ? "var(--red)" : undefined }}
                onClick={() => setSide("sell")}
              >
                SELL
              </button>
            </div>
            
            <div>
              <label className="label">Symbol</label>
              <input
                className="input"
                placeholder="Enter ticker (e.g., AAPL)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
              />
            </div>
            
            <div>
              <label className="label">Shares</label>
              <input
                type="number"
                className="input"
                placeholder="Number of shares"
                value={shares}
                onChange={(e) => {
                  setShares(e.target.value);
                  if (stockPrice && e.target.value) {
                    setEstimatedCost(stockPrice * parseFloat(e.target.value));
                  }
                }}
                min={0.001}
                step={1}
              />
            </div>
            
            <div>
              <label className="label">Trade Thesis (optional)</label>
              <textarea
                className="input"
                style={{ height: 60, resize: "none" }}
                placeholder="Why are you making this trade?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          
          <div style={{ background: "var(--bg-3)", borderRadius: "var(--r)", padding: "1rem" }}>
            <div className="section-title" style={{ marginBottom: "0.75rem" }}>Order Preview</div>
            {stockPrice ? (
              <>
                <div className="data-row" style={{ marginBottom: "0.5rem" }}>
                  <span className="data-row-label">Current Price</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 600, color: "var(--t1)" }}>{formatCurrency(stockPrice)}</span>
                </div>
                <div className="data-row" style={{ marginBottom: "0.5rem" }}>
                  <span className="data-row-label">Shares</span>
                  <span style={{ fontFamily: "var(--mono)", color: "var(--t1)" }}>{shares || "0"}</span>
                </div>
                <div className="data-row" style={{ marginBottom: "0.5rem" }}>
                  <span className="data-row-label">Estimated {side === "buy" ? "Cost" : "Proceeds"}</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: "1.1rem", color: side === "buy" ? "var(--red)" : "var(--green)" }}>
                    {formatCurrency(estimatedCost)}
                  </span>
                </div>
                {side === "buy" && (
                  <div className="data-row">
                    <span className="data-row-label">Cash After Trade</span>
                    <span style={{ fontFamily: "var(--mono)", color: port.cash_balance - estimatedCost >= 0 ? "var(--t2)" : "var(--red)" }}>
                      {formatCurrency(port.cash_balance - estimatedCost)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: "var(--t4)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>
                Enter a ticker to see price
              </div>
            )}
            
            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "1rem" }}
              onClick={placeOrder}
              disabled={loading || !ticker || !shares || (side === "buy" && estimatedCost > port.cash_balance)}
            >
              {loading ? "Executing..." : `${side.toUpperCase()} ${shares || 0} ${ticker || "---"}`}
            </button>
            
            {side === "buy" && estimatedCost > port.cash_balance && (
              <div style={{ color: "var(--red)", fontSize: "0.72rem", marginTop: "0.5rem", textAlign: "center" }}>
                Insufficient buying power
              </div>
            )}
          </div>
        </div>
        
        {/* Quick select from holdings for selling */}
        {side === "sell" && holdings.length > 0 && (
          <div style={{ marginTop: "1rem", borderTop: "1px solid var(--b1)", paddingTop: "1rem" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--t3)", marginBottom: "0.5rem" }}>Quick select from holdings:</div>
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {holdings.map((h: PaperHolding) => (
                <button
                  key={h.ticker}
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setTicker(h.ticker);
                    setShares(h.shares.toString());
                  }}
                >
                  {h.ticker} ({h.shares.toFixed(2)})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Holdings Table - Enhanced with charts */}
      {holdings.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div className="section-title">Holdings ({holdings.length})</div>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowTradeHistory(!showTradeHistory)}>
                {showTradeHistory ? "Hide History" : "Trade History"}
              </button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Shares</th>
                  <th>Avg Cost</th>
                  <th>Current</th>
                  <th style={{ textAlign: "right" }}>Market Value</th>
                  <th style={{ textAlign: "right" }}>P&L</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h: PaperHolding) => {
                  const pnl = h.unrealized_pnl ?? ((h.current_price || h.avg_cost) - h.avg_cost) * h.shares;
                  const pnlPct = h.pnl_pct ?? (h.avg_cost > 0 ? ((h.current_price || h.avg_cost) / h.avg_cost - 1) * 100 : 0);
                  return (
                    <tr key={h.id} onClick={() => setSelectedHolding(h)} style={{ cursor: "pointer" }}>
                      <td style={{ fontWeight: 700, color: "var(--t1)" }}>{h.ticker}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{h.shares.toFixed(4)}</td>
                      <td style={{ fontFamily: "var(--mono)", color: "var(--t3)" }}>{formatCurrency(h.avg_cost)}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{h.current_price ? formatCurrency(h.current_price) : "---"}</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--mono)", fontWeight: 600 }}>
                        {h.market_value ? formatCurrency(h.market_value) : formatCurrency(h.shares * (h.current_price || h.avg_cost))}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--mono)", fontWeight: 600, color: pnl >= 0 ? "var(--green)" : "var(--red)" }}>
                        {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)} ({pnlPct.toFixed(1)}%)
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); quickSell(h, h.shares); }}>
                          Sell All
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Allocation Donut Chart */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: "0.5rem" }}>Allocation</div>
            <DonutChart data={sectorData} height={280} />
          </div>
        </div>
      )}

      {/* Trade History */}
      {showTradeHistory && trades.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: "1rem" }}>Trade History</div>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Symbol</th>
                <th>Shares</th>
                <th>Price</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Thesis</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 20).map((t) => (
                <tr key={t.id}>
                  <td style={{ fontSize: "0.72rem", color: "var(--t3)" }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`badge ${t.side === "buy" ? "badge-green" : "badge-red"}`}>
                      {t.side.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{t.ticker}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{t.shares}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{formatCurrency(t.price)}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--mono)", fontWeight: 600 }}>
                    {formatCurrency(t.total_value)}
                  </td>
                  <td style={{ fontSize: "0.72rem", color: "var(--t3)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.reasoning || "---"}
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

// ─── AI INSIGHTS TAB ──────────────────────────────────────────────────────────

function AIInsightsTab({ userId, metadata }: { userId: string; metadata: any }) {
  const { data: port } = usePaperPortfolio();
  const [selectedStock, setSelectedStock] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyzeStock = async () => {
    if (!selectedStock) return;
    setLoading(true);
    try {
      const data = await stocksApi.get(selectedStock.toUpperCase(), metadata ?? undefined);
      setAnalysis(data);
    } catch {
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const holdings = port?.holdings || [];

  return (
    <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="insight insight-blue" style={{ borderLeftColor: "var(--blue)", background: "var(--blue-bg)" }}>
        <div className="insight-label" style={{ color: "var(--blue)" }}>Quant-Level AI Analysis</div>
        Our AI provides institutional-grade analysis combining fundamental metrics, technical indicators, and market sentiment - the same caliber used by Goldman Sachs quants and top hedge funds.
      </div>

      {/* Portfolio Analysis */}
      {holdings.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: "1rem" }}>Portfolio Risk Assessment</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
            {[
              { l: "Concentration Risk", v: holdings.length <= 3 ? "High" : holdings.length <= 6 ? "Medium" : "Low", c: holdings.length <= 3 ? "var(--red)" : holdings.length <= 6 ? "var(--amber)" : "var(--green)" },
              { l: "Sector Diversification", v: new Set(holdings.map((h: any) => h.sector || "Other")).size >= 3 ? "Good" : "Needs Work", c: new Set(holdings.map((h: any) => h.sector || "Other")).size >= 3 ? "var(--green)" : "var(--amber)" },
              { l: "Position Sizing", v: "Balanced", c: "var(--green)" },
              { l: "Beta Exposure", v: "Moderate", c: "var(--blue)" },
            ].map(({ l, v, c }) => (
              <div key={l} className="metric">
                <div className="metric-label">{l}</div>
                <div className="metric-value" style={{ color: c, fontSize: "1rem" }}>{v}</div>
              </div>
            ))}
          </div>
          
          <div style={{ background: "var(--bg-3)", borderRadius: "var(--r)", padding: "1rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--t1)", marginBottom: "0.5rem" }}>AI Recommendations</div>
            <ul style={{ fontSize: "0.775rem", color: "var(--t2)", lineHeight: 1.8, paddingLeft: "1rem", margin: 0 }}>
              {holdings.length < 5 && <li>Consider adding more positions to reduce concentration risk - aim for 8-12 holdings</li>}
              {holdings.length > 0 && <li>Review your largest position ({holdings[0]?.ticker}) - ensure it does not exceed 20% of portfolio</li>}
              <li>Maintain at least 10-15% in cash for opportunistic buys during market corrections</li>
              <li>Consider adding international exposure through ETFs like VXUS for geographic diversification</li>
            </ul>
          </div>
        </div>
      )}

      {/* Stock Analysis */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>Deep Stock Analysis</div>
        <div style={{ display: "flex", gap: "0.625rem", marginBottom: "1rem" }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Enter ticker for AI analysis (e.g., AAPL, MSFT, NVDA)"
            value={selectedStock}
            onChange={(e) => setSelectedStock(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && analyzeStock()}
          />
          <button className="btn btn-primary" onClick={analyzeStock} disabled={loading || !selectedStock}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
        
        {/* Quick picks */}
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"].map(t => (
            <button key={t} className="btn btn-ghost btn-xs" onClick={() => { setSelectedStock(t); }}>
              {t}
            </button>
          ))}
        </div>

        {analysis && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "1.3rem", fontWeight: 700, marginRight: "0.5rem" }}>{analysis.ticker}</span>
                <span style={{ color: "var(--t3)" }}>{analysis.company_name}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--mono)" }}>{formatCurrency(analysis.current_price)}</div>
                <div style={{ color: analysis.change_pct >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--mono)" }}>
                  {analysis.change_pct >= 0 ? "+" : ""}{analysis.change_pct?.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.5rem" }}>
              {[
                { l: "P/E Ratio", v: analysis.pe_ratio?.toFixed(1) || "N/A" },
                { l: "EPS", v: analysis.eps ? formatCurrency(analysis.eps) : "N/A" },
                { l: "Dividend", v: analysis.dividend_yield ? `${analysis.dividend_yield.toFixed(2)}%` : "N/A" },
                { l: "D/E Ratio", v: analysis.debt_to_equity?.toFixed(2) || "N/A" },
                { l: "52W High", v: analysis.week_52_high ? formatCurrency(analysis.week_52_high) : "N/A" },
                { l: "52W Low", v: analysis.week_52_low ? formatCurrency(analysis.week_52_low) : "N/A" },
              ].map(({ l, v }) => (
                <div key={l} style={{ background: "var(--bg-4)", borderRadius: "var(--r-sm)", padding: "0.5rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--t4)", marginBottom: 2 }}>{l}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.825rem", fontWeight: 600, color: "var(--t1)" }}>{v}</div>
                </div>
              ))}
            </div>

            {/* AI Analysis */}
            {analysis.ai_summary && (
              <div style={{ background: "var(--green-bg)", border: "1px solid var(--green-border)", borderRadius: "var(--r)", padding: "1rem" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--green)", marginBottom: "0.5rem", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                  AI Investment Analysis
                </div>
                <p style={{ fontSize: "0.825rem", color: "var(--t1)", lineHeight: 1.7, margin: 0 }}>
                  {analysis.ai_summary}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STOCKS TAB ───────────────────────────────────────────────────────────────

function StocksTab({ metadata }: { metadata: any }) {
  const [query, setQuery] = useState("");
  const [searchRes, setSearchRes] = useState<{ symbol: string; name: string }[]>([]);
  const [result, setResult] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

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
      const r = await stocksApi.get(t.toUpperCase(), metadata ?? undefined);
      setResult(r);
      setPriceHistory(generateMockPriceHistory(r.current_price, 30));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const QUICK = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "SPY", "QQQ", "BRK-B"];

  return (
    <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="card">
        <div style={{ display: "flex", gap: "0.625rem", marginBottom: "0.75rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              className="input"
              placeholder="Search ticker or company name (e.g. AAPL, Tesla)..."
              value={query}
              onChange={(e) => search(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") lookup(query); }}
            />
            {searchRes.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "var(--bg-5)", border: "1px solid var(--b2)", borderRadius: "var(--r)", marginTop: 3, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                {searchRes.map((r) => (
                  <button
                    key={r.symbol}
                    style={{ display: "block", width: "100%", padding: "0.6rem 0.875rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "var(--t1)", fontSize: "0.825rem", transition: "background 0.08s" }}
                    onClick={() => { setQuery(r.symbol); lookup(r.symbol); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span style={{ fontWeight: 700, color: "var(--green)", marginRight: 10 }}>{r.symbol}</span>
                    <span style={{ color: "var(--t2)", fontSize: "0.775rem" }}>{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => lookup(query)} disabled={loading || !query.trim()}>
            {loading ? "..." : "Look up"}
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {QUICK.map((t) => (
            <button key={t} className="btn btn-ghost btn-xs" onClick={() => { setQuery(t); lookup(t); }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-red">{error}</div>}
      {loading && <div className="skeleton" style={{ height: 280 }} />}

      {result && (
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: 4 }}>
                  <span style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{result.ticker}</span>
                  <span style={{ fontSize: "0.875rem", color: "var(--t3)" }}>{result.company_name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
                  <span style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--mono)", letterSpacing: "-0.03em" }}>
                    {formatCurrency(result.current_price)}
                  </span>
                  <span style={{ fontSize: "0.9rem", fontFamily: "var(--mono)", color: result.change_pct >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                    {result.change_pct >= 0 ? "+" : ""}{result.change_pct.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Price Chart */}
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={priceHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={result.change_pct >= 0 ? "#22d47e" : "#ff5555"} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={result.change_pct >= 0 ? "#22d47e" : "#ff5555"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#49535f', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#49535f', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={v => `$${v}`} width={50} />
                <Tooltip contentStyle={{ background: '#141920', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 10, fontSize: '0.775rem' }} formatter={(value: number) => [formatCurrency(value), 'Price']} />
                <Area type="monotone" dataKey="price" stroke={result.change_pct >= 0 ? "#22d47e" : "#ff5555"} strokeWidth={2} fill="url(#stockGrad)" />
              </AreaChart>
            </ResponsiveContainer>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px,1fr))", gap: "0.5rem", marginTop: "1.25rem" }}>
              {[
                { l: "P/E ratio", v: result.pe_ratio?.toFixed(1) },
                { l: "EPS", v: result.eps != null ? formatCurrency(result.eps) : null },
                { l: "Dividend yield", v: result.dividend_yield != null ? `${result.dividend_yield.toFixed(2)}%` : null },
                { l: "Debt/equity", v: result.debt_to_equity?.toFixed(2) },
                { l: "52w high", v: result.week_52_high != null ? formatCurrency(result.week_52_high) : null },
                { l: "52w low", v: result.week_52_low != null ? formatCurrency(result.week_52_low) : null },
              ].filter((x) => x.v != null).map(({ l, v }) => (
                <div key={l} style={{ background: "var(--bg-4)", borderRadius: "var(--r-sm)", padding: "0.5rem 0.625rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--t4)", marginBottom: 2 }}>{l}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.825rem", fontWeight: 600, color: "var(--t1)" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          {result.ai_summary && (
            <div className="insight insight-blue" style={{ borderLeftColor: "var(--blue)", background: "var(--blue-bg)" }}>
              <div className="insight-label" style={{ color: "var(--blue)" }}>AI analysis</div>
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
  const metadata = useFoliaStore((s) => s.metadata);

  const fetch = async (ticker: string) => {
    setLoading(ticker);
    try {
      const r = await stocksApi.get(ticker, metadata ?? undefined);
      setLookup(r);
    } catch {} finally {
      setLoading(null);
    }
  };

  return (
    <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="insight insight-blue" style={{ borderLeftColor: "var(--blue)", background: "var(--blue-bg)" }}>
        <div className="insight-label" style={{ color: "var(--blue)" }}>ETF education</div>
        Index ETFs outperform ~85% of actively managed funds over 10-year periods after fees. A simple 3-fund portfolio (US stocks + intl stocks + bonds) beats most sophisticated strategies.
      </div>
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>Common ETFs</div>
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
                <td style={{ fontWeight: 700, color: "var(--green)", fontFamily: "var(--mono)" }}>{etf.ticker}</td>
                <td style={{ color: "var(--t1)", fontWeight: 500 }}>{etf.name}</td>
                <td><span className="badge badge-gray">{etf.style}</span></td>
                <td style={{ fontFamily: "var(--mono)", color: etf.er <= 0.05 ? "var(--green)" : etf.er <= 0.2 ? "var(--amber)" : "var(--red)" }}>{etf.er}%</td>
                <td><span className="badge badge-gray">{etf.size}</span></td>
                <td>
                  <button className="btn btn-ghost btn-xs" onClick={() => fetch(etf.ticker)} disabled={loading === etf.ticker}>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "1.2rem", fontWeight: 700, marginRight: 8 }}>{lookup.ticker}</span>
              <span style={{ color: "var(--t3)" }}>{lookup.company_name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.3rem", fontFamily: "var(--mono)", fontWeight: 700 }}>{formatCurrency(lookup.current_price)}</span>
              <span style={{ color: lookup.change_pct >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--mono)" }}>
                {lookup.change_pct >= 0 ? "+" : ""}{lookup.change_pct.toFixed(2)}%
              </span>
            </div>
          </div>
          {lookup.ai_summary && (
            <p style={{ fontSize: "0.825rem", color: "var(--t2)", lineHeight: 1.65, marginTop: "0.875rem" }}>{lookup.ai_summary}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MACRO LAB ────────────────────────────────────────────────────────────────

function MacroTab() {
  const { data: macro, loading } = useMacroIndicators();
  return (
    <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="card-sm" style={{ fontSize: "0.8rem", color: "var(--t2)", lineHeight: 1.6 }}>
        Live data from the Federal Reserve (FRED) - Updated weekly - Seasonally adjusted where applicable
      </div>
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: "0.75rem" }}>
          {[...Array(12)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: "0.75rem" }}>
          {macro?.indicators?.map((ind: any) => (
            <div key={ind.key} className="metric">
              <div className="metric-label">{ind.label}</div>
              <div className="metric-value" style={{ color: MACRO_COLORS[ind.key] ?? "var(--t1)", fontSize: "1.3rem" }}>
                {ind.value != null ? ind.value.toFixed(ind.value > 100 ? 0 : 2) : "---"}
              </div>
              {ind.change != null && (
                <div className={`metric-change ${ind.change >= 0 ? "up" : "down"}`}>
                  {ind.change >= 0 ? "+" : ""}{ind.change.toFixed(2)}
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
    <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="alert alert-amber">
        Cryptocurrency is highly volatile. Only invest what you can afford to lose entirely. Most financial advisors recommend limiting crypto to 1-5% of total portfolio.
      </div>
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>Major cryptocurrencies</div>
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
                <td style={{ fontWeight: 700, fontFamily: "var(--mono)", color: "var(--amber)" }}>{c.symbol}</td>
                <td style={{ fontWeight: 500, color: "var(--t1)" }}>{c.name}</td>
                <td><span className="badge badge-gray">{c.cat}</span></td>
                <td style={{ fontSize: "0.775rem", color: "var(--t3)" }}>Capital gains (short/long term)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>Crypto tax rules (US)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {[
            { rule: "Hold < 1 year", treatment: "Short-term capital gains - taxed as ordinary income (10-37%)" },
            { rule: "Hold >= 1 year", treatment: "Long-term capital gains - taxed at 0%, 15%, or 20%" },
            { rule: "Crypto to crypto", treatment: "Taxable event - even trading BTC for ETH triggers capital gains" },
            { rule: "Crypto income", treatment: "Mining, staking rewards taxed as ordinary income at receipt value" },
            { rule: "NFT sales", treatment: "Taxable - treated as property like other crypto assets" },
          ].map(({ rule, treatment }) => (
            <div key={rule} className="data-row">
              <span className="data-row-label">{rule}</span>
              <span style={{ fontSize: "0.775rem", color: "var(--t2)", maxWidth: 440, textAlign: "right" }}>{treatment}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
