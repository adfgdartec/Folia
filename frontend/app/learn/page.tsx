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
        desc: "The 50/30/20 rule is a simple budgeting method popularized by Senator Elizabeth Warren. It suggests dividing your after-tax income into three categories: 50% for needs (essentials like housing, food, utilities, transportation, and minimum debt payments), 30% for wants (discretionary spending like dining out, entertainment, and hobbies), and 20% for savings and debt repayment (building an emergency fund, retirement contributions, and extra debt payments). This framework provides a straightforward way to ensure you're living within your means while building financial security. Start by calculating your take-home pay and allocating accordingly. Adjust as needed based on your circumstances, but aim to stick to these proportions to achieve long-term financial health.",
        difficulty: "beginner",
      },
      {
        id: "emergency-fund",
        title: "Emergency fund",
        desc: "An emergency fund is a savings account set aside for unexpected expenses or financial emergencies. Financial experts typically recommend saving 3-6 months' worth of essential living expenses. This fund acts as a safety net, preventing you from going into debt or dipping into retirement savings when faced with car repairs, medical bills, job loss, or other unforeseen costs. Keep this money in a high-yield savings account that's easily accessible but separate from your checking account. Start small if needed - even $1,000 can provide a buffer - and build it up gradually. The peace of mind that comes with having this fund is invaluable for financial stability.",
        difficulty: "beginner",
      },
      {
        id: "compound-interest",
        title: "Compound interest",
        desc: "Compound interest is the interest you earn on both your original principal and the accumulated interest from previous periods. It's often called 'interest on interest' and is one of the most powerful forces in personal finance. The key insight is that money grows exponentially over time, not linearly. Starting to invest early gives your money more time to compound, leading to dramatically larger returns. For example, investing $10,000 at age 25 with an 8% annual return would grow to over $217,000 by age 65, while the same investment at age 35 would only reach about $100,000. Understanding compound interest explains why delaying retirement contributions or student loan payments can be so costly, and why starting early is the biggest advantage in building wealth.",
        difficulty: "beginner",
      },
      {
        id: "hysa",
        title: "High-yield savings account",
        desc: "A high-yield savings account (HYSA) is a type of savings account that offers significantly higher interest rates than traditional savings accounts, often 4-5% APY or more compared to 0.01% at brick-and-mortar banks. These accounts are typically offered by online banks and credit unions, and they're FDIC-insured up to $250,000. The key benefits include earning substantial interest on your emergency fund or other savings while maintaining liquidity. However, they may have minimum balance requirements or monthly fees, so read the terms carefully. Use a HYSA for your emergency fund and short-term savings goals, but remember that rates can fluctuate with the Federal Reserve's interest rate changes. It's a simple way to make your money work harder for you without taking on investment risk.",
        difficulty: "beginner",
      },
      {
        id: "net-worth-calc",
        title: "Net worth calculation",
        desc: "Your net worth is a snapshot of your financial health at a given moment, calculated by subtracting your total liabilities (what you owe) from your total assets (what you own). Assets include cash, investments, real estate, vehicles, and valuable possessions. Liabilities include credit card debt, student loans, mortgages, car loans, and other debts. A positive net worth means you have more assets than liabilities, while negative means you're in debt. Tracking your net worth over time helps you understand if you're building wealth or falling behind. It's not about having a high number - it's about the trend. Focus on increasing assets and decreasing liabilities to improve your net worth. This metric provides a clearer picture of your financial position than income or savings alone.",
        difficulty: "beginner",
      },
      {
        id: "insurance-basics",
        title: "Insurance basics",
        desc: "Insurance is a risk management tool that protects you from financial loss due to unexpected events. The key types for most people include: health insurance (covers medical expenses), life insurance (provides income replacement for dependents), auto insurance (covers vehicle damage and liability), and renters/homeowners insurance (protects your living space and belongings). When choosing policies, consider deductibles (the amount you pay before coverage kicks in), premiums (monthly costs), and coverage limits. Shop around and compare quotes, but don't buy based on price alone - ensure adequate coverage for your situation. Review your policies annually and update them as your life changes (marriage, children, home purchase). Insurance isn't optional for most adults; it's about transferring risk you can't afford to bear alone to an insurance company.",
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
        desc: "Your FICO credit score is calculated using five main factors: payment history (35% of score - paying bills on time is most important), amounts owed (30% - credit utilization and debt levels), length of credit history (15% - older accounts are better), new credit (10% - frequent hard inquiries hurt), and credit mix (10% - having different types of credit helps). Understanding these factors helps you prioritize actions to improve your score. Focus first on paying bills on time and keeping credit utilization below 30%. Your score ranges from 300-850, with 670+ considered good. Different lenders may use slightly different scoring models, but FICO is the most common. Monitor your score regularly and dispute any errors on your credit report.",
        difficulty: "beginner",
      },
      {
        id: "credit-util",
        title: "Credit utilization",
        desc: "Credit utilization is the ratio of your credit card balances to your credit limits, expressed as a percentage. It accounts for 30% of your FICO score. Keeping utilization below 30% is ideal for optimal credit scoring. For example, if you have a $1,000 limit and a $200 balance, your utilization is 20%. High utilization signals to lenders that you're relying heavily on credit, which can hurt your score. The best strategy is to pay your cards in full each month to keep utilization at 0%. If you carry balances, try to keep them below 10% of your limit. Multiple cards with low utilization are better than one card at high utilization. Monitor this ratio regularly as it changes with every purchase and payment.",
        difficulty: "beginner",
      },
      {
        id: "avalanche-vs-snowball",
        title: "Avalanche vs Snowball",
        desc: "The debt avalanche and debt snowball are two popular strategies for paying off multiple debts. The avalanche method focuses on paying the highest interest rate debt first while making minimum payments on others, then rolling the freed-up payment into the next highest rate debt. This saves the most money in interest over time. The snowball method pays off the smallest balance first, regardless of interest rate, to build momentum and motivation through quick wins. While mathematically the avalanche saves more money, the snowball often works better psychologically for people who need visible progress. Choose based on your personality - if you're motivated by numbers, use avalanche; if you need encouragement, use snowball. Either way, having a plan beats no plan at all.",
        difficulty: "intermediate",
      },
      {
        id: "apr-apy-diff",
        title: "APR vs APY",
        desc: "APR (Annual Percentage Rate) and APY (Annual Percentage Yield) both describe the cost of borrowing or return on savings, but they calculate compounding differently. APR is the simple annual rate without considering compounding, used for loans and credit cards. APY factors in compounding and shows the true annual return or cost. For savings accounts, APY will be higher than APR when interest compounds. For loans, APR might be higher than APY if payments are made monthly. When comparing financial products, look at APY for savings (it shows your real return) and APR for loans (it shows your real cost). Credit card APRs are often variable and can change. Understanding this difference prevents you from overpaying on debt or underestimating savings growth.",
        difficulty: "intermediate",
      },
      {
        id: "dti-ratio",
        title: "Debt-to-income ratio",
        desc: "Your debt-to-income ratio (DTI) is a percentage calculated by dividing your total monthly debt payments by your gross monthly income. Lenders use it to assess your ability to manage monthly payments and take on new debt. A DTI below 36% is generally considered good, with front-end DTI (housing costs only) under 28% for mortgages. To calculate: add up minimum payments for credit cards, loans, mortgage/rent, and divide by gross income. Lower is better - it shows lenders you're not overextended. If your DTI is high, focus on paying down debt or increasing income. This ratio affects loan approvals, interest rates, and borrowing power. Monitoring DTI helps you avoid taking on too much debt relative to your income.",
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
        desc: "Index funds are investment funds that track a market index like the S&P 500, holding all or a representative sample of the stocks in that index. They consistently outperform most actively managed mutual funds because they have lower fees (expense ratios around 0.03-0.10% vs 0.5-1%+ for active funds) and don't try to beat the market through stock picking. Studies show that 85% of active funds underperform their benchmarks over 10+ years after fees. Index funds provide broad diversification, tax efficiency, and simplicity. They're perfect for most investors who want market returns without the risk of underperforming due to poor fund manager decisions. Warren Buffett has recommended index funds for decades. Start with low-cost index funds like Vanguard's VTI or S&P 500 index funds for long-term investing.",
        difficulty: "beginner",
      },
      {
        id: "etf-vs-mutual",
        title: "ETF vs mutual fund",
        desc: "ETFs (Exchange-Traded Funds) and mutual funds are both baskets of investments, but they differ in key ways. ETFs trade like stocks throughout the day at market prices, while mutual funds are priced once daily at net asset value. ETFs generally have lower expense ratios and are more tax-efficient due to their structure. You can buy/sell ETFs instantly, but mutual funds settle at end of day. ETFs offer intraday trading and options strategies, while mutual funds are better for dollar-cost averaging through automatic investments. Both can track indexes, but ETFs often have lower minimum investments. Choose ETFs for flexibility and active trading, mutual funds for simplicity and retirement accounts. Many investors use both in their portfolios.",
        difficulty: "intermediate",
      },
      {
        id: "diversification",
        title: "Diversification",
        desc: "Diversification is spreading your investments across different asset classes, sectors, geographies, and companies to reduce risk. It works because different investments don't move in perfect correlation - when one goes down, others may go up or stay stable. Modern Portfolio Theory shows that diversification can reduce volatility without sacrificing returns. Don't put all eggs in one basket - spread across stocks, bonds, real estate, commodities. Within stocks, diversify across large/small caps, growth/value, domestic/international. Target allocations like 60% stocks/40% bonds for moderate risk. Rebalance periodically to maintain targets. Diversification doesn't eliminate risk but manages it. Over-diversification can dilute returns, so find the right balance for your risk tolerance and time horizon.",
        difficulty: "intermediate",
      },
      {
        id: "pe-ratio-explained",
        title: "P/E ratio",
        desc: "The Price-to-Earnings (P/E) ratio compares a company's stock price to its earnings per share, showing how much investors pay for $1 of earnings. A high P/E suggests growth expectations or overvaluation, while low P/E may indicate value or problems. Compare P/E ratios within the same industry - tech stocks often have higher P/E than utilities. Forward P/E uses expected earnings, trailing P/E uses past earnings. P/E doesn't work well for unprofitable companies. Use it with other metrics like growth rate and return on equity. A reasonable P/E range is 15-25 for most stocks, but this varies by sector and market conditions. Remember, P/E is just one tool - combine it with fundamental analysis for better investment decisions.",
        difficulty: "intermediate",
      },
      {
        id: "dca-strategy",
        title: "Dollar-cost averaging",
        desc: "Dollar-cost averaging (DCA) is investing a fixed amount of money at regular intervals, regardless of price. Instead of trying to time the market, you buy more shares when prices are low and fewer when high, averaging out your purchase price over time. This removes emotional decision-making and market timing risk. For example, investing $500 monthly buys more shares at $50 than at $100. DCA works best for long-term investors in volatile markets. It's particularly effective in retirement accounts with automatic contributions. While you might miss some upside during bull markets, you avoid the risk of buying high and selling low. DCA is a disciplined approach that takes advantage of market volatility rather than fighting it.",
        difficulty: "beginner",
      },
      {
        id: "rebalancing",
        title: "Portfolio rebalancing",
        desc: "Portfolio rebalancing involves periodically adjusting your asset allocation back to your target percentages as market movements cause drift. For example, if your target is 60% stocks/40% bonds and stocks grow to 70%, sell some stocks and buy bonds to restore balance. This forces you to sell high and buy low, maintaining your desired risk level. Rebalance annually or when allocations deviate by 5-10%. It reduces risk by preventing overexposure to outperforming assets. Tax-loss harvesting can be done during rebalancing. While it may trigger capital gains taxes, the risk control benefits often outweigh costs. Use automatic rebalancing in target-date funds, or do it manually. Rebalancing is especially important as you approach retirement to reduce volatility.",
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
        desc: "Your marginal tax rate is the tax rate on your next dollar of income, while your effective tax rate is your total tax divided by total income. The U.S. has progressive brackets, so marginal rates increase as income rises, but most people don't pay their marginal rate on all income due to deductions and credits. For example, if you're in the 22% bracket, you pay 22% only on income above the bracket threshold, not on your entire income. Effective rate is usually lower. Understanding this prevents overestimating tax burdens. When making decisions, consider marginal rates for additional income/spending, effective rates for overall tax efficiency. Tax planning focuses on marginal rates - deductions and credits reduce effective rates but don't change marginal rates for decisions.",
        difficulty: "beginner",
      },
      {
        id: "roth-vs-traditional",
        title: "Roth vs Traditional IRA",
        desc: "Roth IRAs use after-tax dollars - you pay taxes now, qualified withdrawals are tax-free in retirement. Traditional IRAs use pre-tax dollars - you get a deduction now, pay taxes on withdrawals later. Choose Roth if you expect to be in a higher tax bracket in retirement or want tax-free growth. Choose Traditional if you want immediate tax savings and expect lower taxes later. Income limits apply for Roth contributions. Roths are better for young people in low brackets expecting growth. Consider your current vs future tax situation, retirement timeline, and whether you need the tax deduction now. You can have both types of IRAs. Required minimum distributions start at 73 for Traditional, never for Roth. Roths provide more flexibility in retirement.",
        difficulty: "intermediate",
      },
      {
        id: "capital-gains-rates",
        title: "Capital gains rates",
        desc: "Capital gains tax applies to profits from selling assets like stocks, real estate, or collectibles. Short-term gains (held <1 year) are taxed at ordinary income rates (up to 37%). Long-term gains (held >1 year) have preferential rates: 0%, 15%, or 20% depending on income. The rate depends on your total income and filing status. Holding investments longer reduces taxes significantly. Capital gains are taxed only when realized, not on unrealized gains. Use tax-loss harvesting to offset gains. Consider tax implications when selling - sometimes holding longer saves thousands. Qualified dividends are taxed at capital gains rates too. Understanding these rates helps optimize investment decisions and tax planning.",
        difficulty: "intermediate",
      },
      {
        id: "tax-loss-harvest",
        title: "Tax-loss harvesting",
        desc: "Tax-loss harvesting involves selling losing investments to offset capital gains taxes and reduce your taxable income. You can use up to $3,000 in net capital losses against ordinary income annually, carrying forward excess losses. Sell losers to offset winners in the same tax year. The wash sale rule prevents repurchasing substantially identical securities within 30 days before/after the sale. Use harvested losses to buy similar but not identical investments. This strategy can turn paper losses into real tax savings. It's especially valuable in taxable accounts during market downturns. Automate the process with robo-advisors, but understand the rules to avoid IRS penalties. Tax-loss harvesting adds value beyond just investment returns.",
        difficulty: "advanced",
      },
      {
        id: "standard-vs-itemized",
        title: "Standard vs itemized deductions",
        desc: "The standard deduction is a fixed amount you subtract from income before calculating taxes ($13,850 for single filers in 2023). Itemized deductions include mortgage interest, state/local taxes, charitable donations, and medical expenses that exceed thresholds. Choose whichever gives the larger deduction. Itemizing makes sense if your deductible expenses exceed the standard deduction. The break-even point depends on your situation. With the higher standard deduction from the Tax Cuts and Jobs Act, fewer people itemize. Track potential deductions throughout the year. Itemizing requires more record-keeping but can significantly reduce taxes if you have substantial deductible expenses. Consider bunching deductions to exceed the standard amount in alternating years.",
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
        desc: "Salary negotiation is a skill that can add tens of thousands to your lifetime earnings. Research market rates using sites like Levels.fyi, Glassdoor, or Payscale. Know your worth based on experience, skills, and location. Don't accept the first offer - most companies expect negotiation. Prepare by quantifying your value and having a target range 10-20% above the offer. Practice scripts like 'I'm excited about this role. Based on my research and experience, I was expecting something in the range of X-Y.' Consider total compensation including bonuses, equity, and benefits. Have a strong alternative if needed. Women and minorities often negotiate less - don't leave money on the table. Timing matters - negotiate after receiving an offer. Be confident but collaborative.",
        difficulty: "intermediate",
      },
      {
        id: "401k-match-free",
        title: "401k employer match",
        desc: "An employer 401k match is free money from your employer, typically 50% of your contributions up to 6% of salary. If you earn $60,000 and contribute 6% ($3,600), your employer might match $1,800, giving you an immediate 50% return. This is the highest guaranteed return you'll find. Always contribute at least enough to get the full match - it's like getting a raise without working more. The match is usually vested immediately or over time. Don't leave this money on the table. If your employer doesn't offer a match, consider an IRA instead. The match vests over 3-6 years at many companies, so stay long enough to own it fully. This benefit alone can make a job more valuable.",
        difficulty: "beginner",
      },
      {
        id: "total-comp-value",
        title: "Total compensation",
        desc: "Total compensation includes salary plus all benefits and perks, providing a complete picture of your pay package. Calculate by adding: base salary, bonuses/commission, equity (stock options/RSUs), retirement contributions (401k match), health insurance value, paid time off, professional development, commuting benefits, and other perks. Use tools like Levels.fyi to compare total comp across companies. A job paying $150k with $50k in equity and benefits might be worth more than $180k in pure salary elsewhere. Consider vesting schedules for equity and tax implications. When negotiating, focus on total value, not just salary. Understand what each component is worth to you personally. This holistic view prevents undervaluing generous benefit packages.",
        difficulty: "intermediate",
      },
      {
        id: "gig-economy-taxes",
        title: "Gig economy taxes",
        desc: "Gig workers (Uber, DoorDash, freelance) are self-employed and responsible for their own taxes. You pay both halves of Social Security/Medicare taxes (15.3% self-employment tax) plus income tax. Track all income and expenses meticulously. Make quarterly estimated tax payments to avoid penalties - due April 15, June 15, September 15, January 15. Deduct business expenses like mileage, phone, home office, supplies. Keep records of all transactions. File Schedule C with your 1040. Consider setting aside 30-40% of income for taxes. Use apps like HomePay or Bench for tracking. If you earn over $400 from one payer, they'll send a 1099-NEC. Consult a tax professional familiar with gig work. Proper planning prevents year-end surprises.",
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
        desc: "Discounted Cash Flow (DCF) valuation estimates an asset's value based on its future cash flows discounted to present value. Project free cash flows for 5-10 years, then add a terminal value. Discount using WACC (weighted average cost of capital) to account for time value of money and risk. The formula is: Value = CF1/(1+r) + CF2/(1+r)^2 + ... + CFn/(1+r)^n + TV/(1+r)^n. DCF requires assumptions about growth rates, margins, and discount rates. It's most useful for stable, predictable businesses. Compare DCF value to market price - if DCF > market, it might be undervalued. Sensitivity analysis tests different assumptions. DCF is theoretically sound but practically challenging due to forecasting uncertainty. Use it alongside other valuation methods like comparables and precedent transactions.",
        difficulty: "advanced",
      },
      {
        id: "wacc-cost-capital",
        title: "WACC",
        desc: "Weighted Average Cost of Capital (WACC) is the blended cost of a company's debt and equity financing, used as the discount rate in DCF valuations. Calculate as: WACC = (E/V * Re) + (D/V * Rd * (1-T)) where E=equity value, D=debt value, V=total value, Re=cost of equity, Rd=cost of debt, T=tax rate. Cost of equity uses CAPM: Re = Rf + β(Rm - Rf). WACC represents the minimum return required by investors. Projects with returns above WACC create value, below destroy value. Lower WACC means cheaper financing. Use market values for accurate calculations. WACC is crucial for capital budgeting and valuation decisions.",
        difficulty: "advanced",
      },
      {
        id: "lbo-structure",
        title: "LBO basics",
        desc: "A Leveraged Buyout (LBO) is acquiring a company using mostly debt, with equity providing 20-40% of purchase price. Private equity firms use LBOs to amplify returns through leverage. Structure includes senior debt (60-70%), subordinated debt (10-20%), and equity (20-30%). Success depends on company's cash flow covering debt payments. PE firms target stable businesses with predictable cash flows, low capital requirements, and turnaround potential. They improve operations, pay down debt, then exit via IPO or sale. Returns come from EBITDA growth, multiple expansion, and leverage payoff. Risks include debt covenants, refinancing challenges, and business downturns. LBOs create value through operational improvements and tax shields, but require strong underwriting. Famous examples include RJR Nabisco and Hilton Hotels.",
        difficulty: "advanced",
      },
      {
        id: "options-greeks",
        title: "Options Greeks",
        desc: "Options Greeks measure how option prices change with underlying factors. Delta (Δ) shows price change per $1 underlying move - call delta 0-1, put delta -1-0. Gamma (Γ) measures delta change rate. Theta (Θ) shows time decay - options lose value daily. Vega (V) measures volatility sensitivity - higher vega means bigger volatility impact. Rho (ρ) shows interest rate sensitivity. Delta-hedging uses these to manage risk. Long calls have positive delta/gamma/theta/vega, short calls opposite. Greeks help understand position risk and adjust strategies. For example, high gamma means position becomes more sensitive to price moves. Use Greeks to build balanced portfolios and manage risk exposure. They're essential for serious options trading.",
        difficulty: "advanced",
      },
      {
        id: "financial-statements",
        title: "Reading financial statements",
        desc: "Financial statements tell a company's story through three main reports. Income statement shows revenue, expenses, and profit over a period. Balance sheet snapshots assets, liabilities, and equity at a point in time. Cash flow statement tracks cash movements from operations, investing, and financing. Key ratios include profit margins, return on equity, debt-to-equity, and current ratio. Look for trends, compare to peers, and understand business drivers. Income statement: top-line growth, margin expansion. Balance sheet: liquidity, leverage. Cash flow: free cash flow generation. Footnotes provide crucial context. Use statements to assess financial health, valuation, and growth prospects. They're historical but inform future expectations. Master these to become a better investor or business owner.",
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
