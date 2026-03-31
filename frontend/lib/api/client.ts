import {
  FinancialMetadata,
  Asset,
  Debt,
  Goal,
  Transaction,
  RecurringBill,
  HealthScoreResult,
  Alert,
  SimulationRequest,
  SimulationResult,
  TaxResult,
  StockData,
  BudgetAnalysis,
  DocumentResult,
  GlossaryEntry,
  MacroIndicator,
  TreasuryYields,
  PaperPortfolio,
  PaperHolding,
  PaperTrade,
  EducationProgress,
  JournalEntry,
  CommunityScenario,
  DashboardData,
  NetWorthSnapshot,
  DebtStrategiesResult,
  UserProfile,
  ChatMessage,
  OrderType,
  OrderSide,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      detail = (await res.json()).detail || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

async function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

async function destroy<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

export const usersApi = {
  getProfile: (userId: string) => get<UserProfile>(`/api/users/${userId}`),
  updateProfile: (userId: string, body: Partial<UserProfile>) =>
    patch<UserProfile>(`/api/users/${userId}`, body),
  getMetadata: (userId: string) =>
    get<FinancialMetadata>(`/api/users/${userId}/metadata`),
  upsertMetadata: (userId: string, metadata: FinancialMetadata) =>
    put<FinancialMetadata>(`/api/users/${userId}/metadata`, metadata),
  getNetWorthHistory: (userId: string, months = 12) =>
    get<{ snapshots: NetWorthSnapshot[] }>(
      `/api/users/${userId}/net-worth?months=${months}`,
    ),
  getDashboard: (userId: string) =>
    get<DashboardData>(`/api/users/${userId}/dashboard`),
};

export const assetsApi = {
  list: (userId: string) =>
    get<{ assets: Asset[]; total: number; by_type: Record<string, number> }>(
      `/api/assets/${userId}`,
    ),
  create: (body: Omit<Asset, "id"> & { user_id: string }) =>
    post<Asset>("/api/assets", body),
  update: (assetId: string, body: Partial<Asset>) =>
    patch<Asset>(`/api/assets/${assetId}`, body),
  delete: (assetId: string) =>
    destroy<{ deleted: string }>(`/api/assets/${assetId}`),
};

export const debtsApi = {
  list: (userId: string) =>
    get<{
      debts: Debt[];
      total_balance: number;
      total_min_payment: number;
      monthly_interest: number;
    }>(`/api/debts/${userId}`),
  strategies: (userId: string, extraPayment = 0) =>
    get<DebtStrategiesResult>(
      `/api/debts/${userId}/strategies?extra_payment=${extraPayment}`,
    ),
  create: (body: Omit<Debt, "id"> & { user_id: string }) =>
    post<Debt>("/api/debts", body),
  update: (debtId: string, body: Partial<Debt>) =>
    patch<Debt>(`/api/debts/${debtId}`, body),
  applyPayment: (debtId: string, amount: number) =>
    post<Debt>(`/api/debts/${debtId}/payment`, { payment_amount: amount }),
  delete: (debtId: string) =>
    destroy<{ deleted: string }>(`/api/debts/${debtId}`),
};

export const goalsApi = {
  list: (userId: string, includeAchieved = false) =>
    get<{
      goals: Goal[];
      total_target: number;
      total_saved: number;
      overall_pct: number;
    }>(`/api/goals/${userId}?include_achieved=${includeAchieved}`),
  create: (body: Omit<Goal, "id" | "is_achieved"> & { user_id: string }) =>
    post<Goal>("/api/goals", body),
  update: (goalId: string, body: Partial<Goal>) =>
    patch<Goal>(`/api/goals/${goalId}`, body),
  contribute: (goalId: string, amount: number) =>
    post<Goal>(`/api/goals/${goalId}/contribute`, { amount }),
  delete: (goalId: string) =>
    destroy<{ deleted: string }>(`/api/goals/${goalId}`),
};

export const transactionsApi = {
  list: (
    userId: string,
    params?: {
      month?: string;
      category?: string;
      type?: string;
      search?: string;
      limit?: number;
    },
  ) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return get<{
      transactions: Transaction[];
      total_income: number;
      total_expenses: number;
      surplus_deficit: number;
      spending_by_category: Record<string, number>;
    }>(`/api/transactions/${userId}${qs ? "?" + qs : ""}`);
  },
  create: (body: Omit<Transaction, "id">) =>
    post<Transaction>("/api/transactions", body),
  createBatch: (txs: Omit<Transaction, "id">[]) =>
    post<{ inserted: number }>("/api/transactions/batch", txs),
  update: (txId: string, body: Partial<Transaction>) =>
    patch<Transaction>(`/api/transactions/${txId}`, body),
  delete: (txId: string) =>
    destroy<{ deleted: string }>(`/api/transactions/${txId}`),
  listRecurring: (userId: string) =>
    get<{ recurring: Transaction[] }>(`/api/transactions/${userId}/recurring`),
  importCsv: async (userId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(
      `${API_URL}/api/transactions/${userId}/import-csv`,
      { method: "POST", body: fd },
    );
    if (!res.ok) throw new ApiError(res.status, "CSV import failed");
    return res.json();
  },
};

export const billsApi = {
  list: (userId: string) =>
    get<{
      bills: RecurringBill[];
      total_monthly: number;
      upcoming_30_days: unknown[];
    }>(`/api/bills/${userId}`),
  create: (body: Omit<RecurringBill, "id"> & { user_id: string }) =>
    post<RecurringBill>("/api/bills", body),
  update: (billId: string, body: Partial<RecurringBill>) =>
    patch<RecurringBill>(`/api/bills/${billId}`, body),
  delete: (billId: string) =>
    destroy<{ deleted: string }>(`/api/bills/${billId}`),
};

export const healthApi = {
  compute: (metadata: FinancialMetadata) =>
    post<HealthScoreResult>("/api/health", metadata),
};

export const alertsApi = {
  list: (userId: string, includeRead = false) =>
    get<{ alerts: Alert[]; unread_count: number; urgent_count: number }>(
      `/api/alerts/${userId}?include_read=${includeRead}`,
    ),
  markRead: (alertId: string) => post<Alert>(`/api/alerts/${alertId}/read`),
  markAllRead: (userId: string) => post(`/api/alerts/${userId}/read-all`),
  dismiss: (alertId: string) => post<Alert>(`/api/alerts/${alertId}/dismiss`),
};

export const simulateApi = {
  run: (req: SimulationRequest) => post<SimulationResult>("/api/simulate", req),
};

export const taxApi = {
  calculate: (body: {
    metadata: FinancialMetadata;
    ytd_income?: number;
    ytd_withholding?: number;
    retirement_contributions?: number;
    hsa_contributions?: number;
    business_expenses?: number;
    other_deductions?: number;
    tax_year?: number;
  }) => post<TaxResult>("/api/tax", body),
};

/*export const advisorApi = {
    chat: (body) => 
        post<{ content: string; citations: unknown[]; session_id: string }>('api/advisor', body),
    stream: async (
        body: {message: string; metadata: FinancialMetadata; history: ChatMessage[]; session_id?: string }, 
        onChunk: (text: string) => void, 
        onCitations: (citations: unknown[]) => void, 
        onDone: () => void) => {
            const res = await fetch(`/api/advisor/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body),
            })
            if (!res.ok) throw new ApiError(res.status, 'Stream failed')
            const reader = res.body!.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let citationsParsed = false

            while(true) {
                const { done, value } = await reader.read()
                if (done) { onDone(); break }
                buffer += decoder.decode(value, { stream: true })

                if (!citationsParsed && buffer.includes('\n')) {
                    const newlineIndex = buffer.indexOf('\n')
                    const firstLine = buffer.slice(0, newlineIndex)
                    if (firstLine.startsWith('__CITATIONS__:')) {
                        const citStr = firstLine.slice('__CITATIONS__:'.length)
                        try { onCitations(JSON.parse(citStr)) } catch {}
                        buffer = buffer.slice(newlineIndex + 1)
                        citationsParsed = true
                    }
                }

                if (citationsParsed) {
                    onChunk(buffer)
                    buffer = ''
                }
            }
        }, 
}*/

export const advisorApi = {
  chat: async (body: {
    message: string;
    metadata: FinancialMetadata;
    history: ChatMessage[];
    session_id?: string;
  }) => {
    const res = await fetch("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text || "Chat failed");
    }

    return res.json();
  },

  stream: async (
    body: {
      message: string;
      metadata: FinancialMetadata;
      history: ChatMessage[];
      session_id?: string;
    },
    onChunk: (text: string) => void,
    onCitations: (citations: unknown[]) => void,
    onDone: () => void,
  ) => {
    const res = await fetch("/api/advisor/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text || "Stream failed");
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let citationsParsed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        onDone();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      if (!citationsParsed && buffer.includes("\n")) {
        const newlineIndex = buffer.indexOf("\n");
        const firstLine = buffer.slice(0, newlineIndex);

        if (firstLine.startsWith("__CITATIONS__:")) {
          const citStr = firstLine.slice("__CITATIONS__:".length);
          try {
            onCitations(JSON.parse(citStr));
          } catch {}
          buffer = buffer.slice(newlineIndex + 1);
          citationsParsed = true;
        }
      }

      if (citationsParsed && buffer) {
        onChunk(buffer);
        buffer = "";
      }
    }
  },
};

export const documentsApi = {
  analyze: async (
    file: File,
    docType: string,
    userId: string,
  ): Promise<DocumentResult> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc_type", docType);
    fd.append("user_id", userId);
    const res = await fetch(`${API_URL}/api/documents`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new ApiError(res.status, "Document analysis failed");
    return res.json();
  },
};

export const stocksApi = {
  get: (ticker: string, metadata?: FinancialMetadata) =>
    post<StockData>("/api/stocks", {
      ticker,
      include_ai_summary: true,
      metadata,
    }),
  search: (query: string) =>
    get<{ results: { symbol: string; name: string }[] }>(
      `/api/stocks/search/${encodeURIComponent(query)}`,
    ),
};

export const budgetApi = {
  analyze: (body: {
    transactions: Transaction[];
    metadata: FinancialMetadata;
    previous_month_expenses?: number;
  }) => post<BudgetAnalysis>("/api/budget", body),
};

export const macroApi = {
  indicators: () =>
    get<{ indicators: MacroIndicator[] }>("/api/macro/indicators"),
  series: (key: string, months = 24) =>
    get<{
      key: string;
      label: string;
      data: { date: string; value: number }[];
    }>(`/api/macro/series/${key}?months=${months}`),
  yields: () => get<{ yields: TreasuryYields }>("/api/macro/yields"),
  mortgageRate: () => get<{ rate: number }>("/api/macro/mortgage-rate"),
  fedRate: () => get<{ rate: number }>("/api/macro/fed-rate"),
};

export const glossaryApi = {
  define: (term: string, literacyLevel = "beginner", context?: string) =>
    post<GlossaryEntry>("/api/glossary", {
      term,
      literacy_level: literacyLevel,
      context,
    }),
};

export const narrateApi = {
  narrate: (
    context: string,
    metadata: FinancialMetadata,
    narrationType = "simulation",
  ) =>
    post<{ narration: string }>("/api/narrate", {
      context,
      metadata,
      narration_type: narrationType,
    }),
};

export const paperTradingApi = {
  createPortfolio: (userId: string, startingCash: number = 100000) =>
    post<PaperPortfolio>("/api/paper-trading/portfolio", {
      user_id: userId,
      starting_cash: startingCash,
    }),
  getPortfolio: (userId: string) =>
    get<{
      portfolio: PaperPortfolio;
      holdings: PaperHolding[];
      cash_balance: number;
      total_value: number;
      total_return_percent: number;
    }>(`/api/paper-trading/portfolio/${userId}`),
  placeOrder: (body: {
    portfolio_id: string;
    user_id: string;
    ticker: string;
    order_type: OrderType;
    side: OrderSide;
    shares: number;
    reasoning?: string;
  }) =>
    post<{ trade: PaperTrade; execution_price: number }>(
      "/api/paper-trading/order",
      body,
    ),
  getTrades: (userId: string) =>
    get<{ trades: PaperTrade[]; total_trades: number; realized_pnl: number }>(
      `/api/paper-trading/trades/${userId}`,
    ),
  resetPortfolio: (portfolioId: string) =>
    post(`/api/paper-trading/portfolio/${portfolioId}/reset`),
};

export const educationApi = {
  getProgress: (userId: string, track?: string) =>
    get<{
      progress: EducationProgress[];
      by_track: Record<string, unknown>;
      due_review: EducationProgress[];
      total_mastered: number;
    }>(`/api/education/${userId}${track ? "?track=" + track : ""}`),
  updateProgress: (body: {
    user_id: string;
    track: string;
    concept_id: string;
    concept_title: string;
    status: string;
    quiz_score?: number;
  }) => post<EducationProgress>("/api/education/update", body),
  recordQuiz: (userId: string, conceptId: string, score: number) =>
    post("/api/education/quiz-result", {
      user_id: userId,
      concept_id: conceptId,
      score,
    }),
  getDueReview: (userId: string) =>
    get<{ due: EducationProgress[]; count: number }>(
      `/api/education/${userId}/due-review`,
    ),
};

export const journalApi = {
  list: (userId: string) =>
    get<{
      entries: JournalEntry[];
      pending_count: number;
      awaiting_followup: JournalEntry[];
    }>(`/api/journal/${userId}`),
  create: (body: {
    user_id: string;
    decision: string;
    reasoning?: string;
    predicted_outcome?: string;
    simulation_id?: string;
  }) => post<JournalEntry>("/api/journal", body),
  update: (entryId: string, body: Partial<JournalEntry>) =>
    patch<JournalEntry>(`/api/journal/${entryId}`, body),
  logOutcome: (entryId: string, actualOutcome: string) =>
    post<JournalEntry>(`/api/journal/${entryId}/outcome`, {
      actual_outcome: actualOutcome,
    }),
  delete: (entryId: string) => destroy(`/api/journal/${entryId}`),
};

export const communityApi = {
  templates: (lifeStage?: string, simType?: string) => {
    const qs = new URLSearchParams();
    if (lifeStage) qs.set("life_stage", lifeStage);
    if (simType) qs.set("simulation_type", simType);
    return get<{ templates: CommunityScenario[] }>(
      `/api/community/templates${qs.toString() ? "?" + qs : ""}`,
    );
  },
  listTemplates: (lifeStage?: string, simType?: string) => {
    const qs = new URLSearchParams();
    if (lifeStage) qs.set("life_stage", lifeStage);
    if (simType) qs.set("simulation_type", simType);
    return get<{ templates: CommunityScenario[] }>(
      `/api/community/templates${qs.toString() ? "?" + qs : ""}`,
    );
  },
  benchmarks: (lifeStage: string, simType?: string) =>
    get<{ benchmarks: any; sample_size: number; life_stage: string }>(
      `/api/community/benchmarks?life_stage=${lifeStage}${simType ? "&simulation_type=" + simType : ""}`,
    ),
  getBenchmarks: (lifeStage: string, simType?: string) =>
    get<{ benchmarks: any; sample_size: number; life_stage: string }>(
      `/api/community/benchmarks?life_stage=${lifeStage}${simType ? "&simulation_type=" + simType : ""}`,
    ),
  contribute: (body: unknown) =>
    post<CommunityScenario>("/api/community/contribute", body),
  upvote: (scenarioId: string) => post(`/api/community/${scenarioId}/upvote`),
};
