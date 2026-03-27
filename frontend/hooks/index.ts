"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  usersApi,
  assetsApi,
  debtsApi,
  goalsApi,
  transactionsApi,
  alertsApi,
  healthApi,
  macroApi,
  paperTradingApi,
  educationApi,
  journalApi,
  billsApi,
} from "@/lib/api/client";
import { useFoliaStore } from "@/store";
import type {
  Asset,
  Debt,
  Goal,
  Transaction,
  Alert,
  HealthScoreResult,
  MacroIndicator,
  FinancialMetadata,
  DashboardData,
} from "@/types";

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  enabled = true,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [enabled, ...deps]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useDashboard() {
  const userId = useFoliaStore((s) => s.userId);
  const setDashboard = useFoliaStore((s) => s.setDashboard);
  const setAlertCount = useFoliaStore((s) => s.setAlertCount);

  const result = useAsync(
    () => usersApi.getDashboard(userId!),
    [userId],
    !!userId,
  );

  useEffect(() => {
    if (result.data) {
      setDashboard(result.data);
      setAlertCount(result.data.alerts?.length ?? 0);
    }
  }, [result.data]);

  return result;
}

export function useNetWorthHistory(months = 12) {
  const userId = useFoliaStore((s) => s.userId);
  return useAsync(
    () => usersApi.getNetWorthHistory(userId!, months),
    [userId, months],
    !!userId,
  );
}

export function useAssets() {
  const userId = useFoliaStore((s) => s.userId);
  return useAsync(() => assetsApi.list(userId!), [userId], !!userId);
}

export function useDebts() {
  const userId = useFoliaStore((s) => s.userId);
  return useAsync(() => debtsApi.list(userId!), [userId], !!userId);
}

export function useDebtStrategies(extraPayment = 0) {
  const userId = useFoliaStore((s) => s.userId);
  return useAsync(
    () => debtsApi.strategies(userId!, extraPayment),
    [userId, extraPayment],
    !!userId,
  );
}

export function useGoals(includeAchieved = false) {
  const userId = useFoliaStore((s) => s.userId);
  return useAsync(
    () => goalsApi.list(userId!, includeAchieved),
    [userId, includeAchieved],
    !!userId,
  );
}

export function useTransactions(params?: {
  month?: string;
  category?: string;
  type?: string;
  search?: string;
}) {
  const userId = useFoliaStore((s) => s.userId);
  return useAsync(
    () => transactionsApi.list(userId!, params),
    [userId, JSON.stringify(params)],
    !!userId,
  );
}

export function useAlerts(includeRead = false) {
  const userId = useFoliaStore((s) => s.userId);
  return useAsync(
    () => alertsApi.list(userId!, includeRead),
    [userId],
    !!userId,
  );
}

export function useHealthScore() {
  const metadata = useFoliaStore((s) => s.metadata);
  return useAsync(
    () => healthApi.compute(metadata!),
    [metadata?.user_id, metadata?.annual_income, metadata?.monthly_expenses],
    !!metadata,
  );
}

export function useMacroIndicators() {
  return useAsync(() => macroApi.indicators(), []);
}

export function usePaperPortfolio() {
  const userId = useFoliaStore((s) => s.userId);
  return useAsync(
    () => paperTradingApi.getPortfolio(userId!),
    [userId],
    !!userId,
  );
}

export function useEducationProgress(track?: string) {
  const userId = useFoliaStore((s) => s.userId);
  return useAsync(
    () => educationApi.getProgress(userId!, track),
    [userId, track],
    !!userId,
  );
}

export function useJournal() {
  const userId = useFoliaStore((s) => s.userId);
  return useAsync(() => journalApi.list(userId!), [userId], !!userId);
}

export function useBills() {
  const userId = useFoliaStore((s) => s.userId);
  return useAsync(() => billsApi.list(userId!), [userId], !!userId);
}

export function useAdvisorStream() {
  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState("");
  const [citations, setCitations] = useState<unknown[]>([]);
  const abortRef = useRef<(() => void) | null>(null);

  const send = useCallback(async (
    message: string,
    metadata: FinancialMetadata,
    history: { role: 'user' | 'assistant'; content: string }[],
    sessionId?: string,
  ) => {
    setStreaming(true)
    setContent('')
    setCitations([])

    const { advisorApi } = await import('@/lib/api/client')
    try {
        await advisorApi.stream(
            { message, metadata, history, session_id: sessionId },
            (chunk) => setContent((prev) => prev + chunk),
            (cits) => setCitations(cits as unknown[]),
            () => setStreaming(false),
        )
    } catch {
        setStreaming(false)
    }
  }, [])
  return { send, streaming, content, citations, reset: () => setContent('') }
}

export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})

  const set = (field: keyof T, value: unknown) =>
    setValues((prev) => ({ ...prev, [field]: value }))

  const setError = (field: keyof T, msg: string) =>
    setErrors((prev) => ({ ...prev, [field]: msg }))

  const clearErrors = () => setErrors({})
  const reset = () => { setValues(initial); setErrors({}) }

  return { values, set, errors, setError, clearErrors, reset, setValues }
}
