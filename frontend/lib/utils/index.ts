import type { LifeStage, LiteracyLevel } from "@/types";

export function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1)}M`;
  if (compact && Math.abs(value) >= 1_000)
    return `${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function monthsFromNow(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.max(
    0,
    (target.getFullYear() - now.getFullYear()) * 12 +
      (target.getMonth() - now.getMonth()),
  );
}

export const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  foundations: "Foundations (13–17)",
  launch: "Launch (18–24)",
  build: "Build (25–34)",
  accelerate: "Accelerate (35–49)",
  preserve: "Preserve (50–64)",
  retire: "Retirement (65+)",
};

export const LIFE_STAGE_COLORS: Record<LifeStage, string> = {
  foundations: "#1D9E75",
  launch: "#639922",
  build: "#BA7517",
  accelerate: "#D85A30",
  preserve: "#534AB7",
  retire: "#378ADD",
};

export function getLifeStageFromAge(age: number): LifeStage {
  if (age <= 17) return "foundations";
  if (age <= 24) return "launch";
  if (age <= 34) return "build";
  if (age <= 49) return "accelerate";
  if (age <= 64) return "preserve";
  return "retire";
}

export function getIncomeBucket(income: number): string {
  if (income < 30000) return "<30k";
  if (income < 60000) return "30-60k";
  if (income < 100000) return "60-100k";
  if (income < 200000) return "100-200k";
  return "200k+";
}

export function getAgeBucket(age: number): string {
  if (age <= 17) return "13-17";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 49) return "35-49";
  if (age <= 64) return "50-64";
  return "65+";
}

export function getHealthGrade(score: number): {
  label: string;
  color: string;
} {
  if (score >= 85) return { label: "Excellent", color: "#1D9E75" };
  if (score >= 70) return { label: "Good", color: "#639922" };
  if (score >= 50) return { label: "Fair", color: "#BA7517" };
  return { label: "Needs work", color: "#E24B4A" };
}

export const ALERT_PRIORITY_COLORS: Record<string, string> = {
  urgent: "#E24B4A",
  high: "#D85A30",
  medium: "#BA7517",
  low: "#888780",
};

export const CATEGORY_COLORS: Record<string, string> = {
  housing: "#378ADD",
  utilities: "#534AB7",
  groceries: "#1D9E75",
  dining: "#D85A30",
  transport: "#BA7517",
  fuel: "#854F0B",
  insurance: "#7F77DD",
  healthcare: "#E24B4A",
  subscriptions: "#D4537E",
  entertainment: "#EF9F27",
  clothing: "#F0997B",
  education: "#5DCAA5",
  childcare: "#9FE1CB",
  pets: "#97C459",
  travel: "#378ADD",
  gifts: "#D4537E",
  savings: "#1D9E75",
  investments: "#0F6E56",
  debt_payment: "#A32D2D",
  salary: "#1D9E75",
  freelance: "#639922",
  other: "#888780",
};

export const DEBT_TYPE_LABELS: Record<string, string> = {
  student: "Student Loan",
  credit_card: "Credit Card",
  mortgage: "Mortgage",
  auto: "Auto Loan",
  medical: "Medical",
  personal: "Personal Loan",
  business: "Business Loan",
  other: "Other",
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  checking: "Checking Account",
  savings: "Savings Account",
  retirement_401k: "401(k)",
  retirement_ira: "IRA",
  brokerage: "Brokerage",
  real_estate: "Real Estate",
  crypto: "Cryptocurrency",
  hsa: "HSA",
  pension: "Pension",
  other: "Other",
};

export const LITERACY_LABELS: Record<LiteracyLevel, string> = {
  beginner: "Beginner — I'm just getting started",
  intermediate: "Intermediate — I know the basics",
  advanced: "Advanced — I'm comfortable with financial concepts",
};

export function calculateNetWorth(
  assets: { value: number }[],
  debts: { balance: number }[],
): number {
  return (
    assets.reduce((s, a) => s + a.value, 0) -
    debts.reduce((s, d) => s + d.balance, 0)
  );
}

export function calculateSavingsRate(
  income: number,
  expenses: number,
  debtPayments: number,
): number {
  if (income <= 0) return 0;
  const surplus = income - expenses - debtPayments;
  return Math.max(0, (surplus / income) * 100);
}

export function calculateDTI(
  monthlyDebtPayments: number,
  monthlyIncome: number,
): number {
  if (monthlyIncome <= 0) return 0;
  return (monthlyDebtPayments / monthlyIncome) * 100;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
