import { toMonthly } from "@/lib/format";
import {
  THRESHOLDS,
  emptyScoringInput,
  type ScoringInput,
} from "@/lib/scoring";
import type {
  DebtRow,
  ExpenseRow,
  IncomeSourceRow,
  SavingsAccountRow,
} from "@/types/database";

/** The stored records a scoring input is derived from. */
export interface FinancialRecords {
  currency: string;
  incomeSources: IncomeSourceRow[];
  expenses: ExpenseRow[];
  savingsAccounts: SavingsAccountRow[];
  debts: DebtRow[];
}

/**
 * The parts of a scoring input that cannot be derived from records.
 *
 * Habits and intentions only come from the questionnaire, so the live score
 * carries them forward from the most recent assessment.
 */
export type QualitativeAnswers = Pick<
  ScoringInput,
  | "billPayment"
  | "savingsConsistency"
  | "goals"
  | "insuranceApplicable"
  | "insuranceCovered"
  | "longTermPlanning"
  | "reviewHabit"
>;

export const EMPTY_QUALITATIVE: QualitativeAnswers = {
  billPayment: null,
  savingsConsistency: null,
  goals: null,
  insuranceApplicable: [],
  insuranceCovered: [],
  longTermPlanning: null,
  reviewHabit: null,
};

const n = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export interface RecordTotals {
  monthlyIncome: number;
  monthlyExpenses: number;
  essentialMonthlyExpenses: number;
  discretionaryMonthlyExpenses: number;
  monthlyDebtPayments: number;
  monthlySavings: number;
  totalSavings: number;
  emergencyFundAmount: number;
  totalDebt: number;
  highInterestDebt: number;
  /** Monthly spend per expense category, for the analytics charts. */
  expensesByCategory: Record<string, number>;
}

/**
 * Totals the stored records into monthly figures.
 *
 * Two things are deliberate here. Expenses filed under "debt repayments" are
 * excluded from monthly expenses — repayments come from the debts table, and
 * counting both would subtract them twice from disposable income. And one-off
 * amounts contribute nothing to a monthly total, so a single large purchase
 * does not masquerade as a recurring cost.
 */
export function totalRecords(records: FinancialRecords): RecordTotals {
  const monthlyIncome = records.incomeSources
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + toMonthly(n(s.amount), s.frequency), 0);

  const livingExpenses = records.expenses.filter((e) => e.category !== "debt_payments");

  const monthlyExpenses = livingExpenses.reduce(
    (sum, e) => sum + toMonthly(n(e.amount), e.frequency),
    0,
  );

  const essentialMonthlyExpenses = livingExpenses
    .filter((e) => e.is_essential)
    .reduce((sum, e) => sum + toMonthly(n(e.amount), e.frequency), 0);

  const expensesByCategory: Record<string, number> = {};
  for (const expense of records.expenses) {
    const monthly = toMonthly(n(expense.amount), expense.frequency);
    if (monthly <= 0) continue;
    expensesByCategory[expense.category] =
      (expensesByCategory[expense.category] ?? 0) + monthly;
  }

  const monthlyDebtPayments = records.debts.reduce(
    (sum, d) => sum + n(d.monthly_payment),
    0,
  );

  const monthlySavings = records.savingsAccounts.reduce(
    (sum, a) => sum + n(a.monthly_contribution),
    0,
  );

  const totalSavings = records.savingsAccounts.reduce((sum, a) => sum + n(a.balance), 0);

  const emergencyFundAmount = records.savingsAccounts
    .filter((a) => a.is_emergency_fund || a.type === "emergency_fund")
    .reduce((sum, a) => sum + n(a.balance), 0);

  const totalDebt = records.debts.reduce((sum, d) => sum + n(d.balance), 0);

  const highInterestDebt = records.debts
    .filter((d) => n(d.interest_rate) >= THRESHOLDS.highInterestRate)
    .reduce((sum, d) => sum + n(d.balance), 0);

  return {
    monthlyIncome,
    monthlyExpenses,
    essentialMonthlyExpenses,
    discretionaryMonthlyExpenses: Math.max(
      monthlyExpenses - essentialMonthlyExpenses,
      0,
    ),
    monthlyDebtPayments,
    monthlySavings,
    totalSavings,
    emergencyFundAmount,
    totalDebt,
    highInterestDebt,
    expensesByCategory,
  };
}

/**
 * Builds a scoring input from live records plus the habits carried forward
 * from the last assessment. This is what the dashboard, the recalculation
 * prompt and the what-if simulator all score.
 */
export function buildScoringInput(
  records: FinancialRecords,
  qualitative: QualitativeAnswers = EMPTY_QUALITATIVE,
): ScoringInput {
  const totals = totalRecords(records);

  return {
    ...emptyScoringInput(records.currency),
    monthlyIncome: totals.monthlyIncome,
    monthlyExpenses: totals.monthlyExpenses,
    essentialMonthlyExpenses: totals.essentialMonthlyExpenses,
    monthlyDebtPayments: totals.monthlyDebtPayments,
    monthlySavings: totals.monthlySavings,
    emergencyFundAmount: totals.emergencyFundAmount,
    totalSavings: totals.totalSavings,
    totalDebt: totals.totalDebt,
    highInterestDebt: totals.highInterestDebt,
    ...qualitative,
  };
}

/** Reads the qualitative answers back out of a stored input snapshot. */
export function qualitativeFromSnapshot(snapshot: unknown): QualitativeAnswers {
  if (!snapshot || typeof snapshot !== "object") return EMPTY_QUALITATIVE;
  const s = snapshot as Partial<ScoringInput>;

  return {
    billPayment: s.billPayment ?? null,
    savingsConsistency: s.savingsConsistency ?? null,
    goals: s.goals ?? null,
    insuranceApplicable: Array.isArray(s.insuranceApplicable) ? s.insuranceApplicable : [],
    insuranceCovered: Array.isArray(s.insuranceCovered) ? s.insuranceCovered : [],
    longTermPlanning: s.longTermPlanning ?? null,
    reviewHabit: s.reviewHabit ?? null,
  };
}

/** True when the records differ enough from a stored snapshot to matter (§75). */
export function recordsDifferFromSnapshot(
  live: ScoringInput,
  snapshot: unknown,
  tolerance = 0.01,
): boolean {
  if (!snapshot || typeof snapshot !== "object") return false;
  const stored = snapshot as Partial<ScoringInput>;

  const fields: (keyof ScoringInput)[] = [
    "monthlyIncome",
    "monthlyExpenses",
    "essentialMonthlyExpenses",
    "monthlyDebtPayments",
    "monthlySavings",
    "emergencyFundAmount",
    "totalSavings",
    "totalDebt",
    "highInterestDebt",
  ];

  return fields.some((field) => {
    const a = Number(live[field] ?? 0);
    const b = Number(stored[field] ?? 0);
    const scale = Math.max(Math.abs(a), Math.abs(b), 1);
    return Math.abs(a - b) / scale > tolerance;
  });
}
