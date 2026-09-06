import "server-only";

import { z } from "zod";

import { scoreFinancialHealth, type ScoringInput } from "@/lib/scoring";
import { formatCurrency } from "@/lib/format";

export const simulationInputSchema = z.object({
  monthly_income_change: z
    .number()
    .describe("Change to monthly income. Positive to increase, negative to reduce.")
    .default(0),
  monthly_expenses_change: z
    .number()
    .describe("Change to monthly living costs. Negative means spending less.")
    .default(0),
  monthly_savings_change: z
    .number()
    .describe("Change to the amount saved each month.")
    .default(0),
  extra_debt_payment: z
    .number()
    .describe("Additional amount put towards debt each month, on top of current repayments.")
    .default(0),
  emergency_fund_change: z
    .number()
    .describe("Change to the emergency fund balance.")
    .default(0),
  total_debt_change: z
    .number()
    .describe("Change to the total debt balance. Negative means paying some off.")
    .default(0),
});

export type SimulationInput = z.infer<typeof simulationInputSchema>;

export interface SimulationResult {
  before: { overall: number; spend: number | null; save: number | null; borrow: number | null; plan: number | null };
  after: { overall: number; spend: number | null; save: number | null; borrow: number | null; plan: number | null };
  delta: number;
  summary: string;
}

/**
 * Applies an adjustment to a copy of the user's real figures and re-runs the
 * scoring engine.
 *
 * This is what makes a "what if" answer trustworthy: the number the assistant
 * reports is the number the engine would produce, not a guess (§27, §30). The
 * user's stored data is never touched — only this in-memory copy.
 */
export function runSimulation(
  baseline: ScoringInput,
  change: Partial<SimulationInput>,
): SimulationResult {
  const n = (value: number | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;

  const adjusted: ScoringInput = {
    ...baseline,
    monthlyIncome: Math.max(baseline.monthlyIncome + n(change.monthly_income_change), 0),
    monthlyExpenses: Math.max(
      baseline.monthlyExpenses + n(change.monthly_expenses_change),
      0,
    ),
    monthlySavings: Math.max(
      baseline.monthlySavings + n(change.monthly_savings_change),
      0,
    ),
    monthlyDebtPayments: Math.max(
      baseline.monthlyDebtPayments + n(change.extra_debt_payment),
      0,
    ),
    emergencyFundAmount: Math.max(
      baseline.emergencyFundAmount + n(change.emergency_fund_change),
      0,
    ),
    totalSavings: Math.max(
      baseline.totalSavings + n(change.emergency_fund_change),
      0,
    ),
    totalDebt: Math.max(baseline.totalDebt + n(change.total_debt_change), 0),
  };

  // Essential costs cannot exceed total costs after a spending change.
  adjusted.essentialMonthlyExpenses = Math.min(
    baseline.essentialMonthlyExpenses,
    adjusted.monthlyExpenses,
  );
  // Nor can high-interest debt exceed what is left of the balance.
  adjusted.highInterestDebt = Math.min(baseline.highInterestDebt, adjusted.totalDebt);

  const before = scoreFinancialHealth(baseline);
  const after = scoreFinancialHealth(adjusted);

  const pick = (r: typeof before) => ({
    overall: r.overallScore,
    spend: r.spend.score,
    save: r.save.score,
    borrow: r.borrow.score,
    plan: r.plan.score,
  });

  const delta = after.overallScore - before.overallScore;

  return {
    before: pick(before),
    after: pick(after),
    delta,
    summary:
      delta === 0
        ? `That change leaves the overall score at ${before.overallScore}.`
        : `That change moves the overall score from ${before.overallScore} to ${after.overallScore} (${delta > 0 ? "+" : ""}${delta}).`,
  };
}

/** A one-line description of a simulation, for the transcript. */
export function describeSimulation(
  change: Partial<SimulationInput>,
  currency: string,
): string {
  const parts: string[] = [];
  const money = (value: number) => formatCurrency(Math.abs(value), currency);

  if (change.monthly_income_change)
    parts.push(
      `${change.monthly_income_change > 0 ? "earning" : "losing"} ${money(change.monthly_income_change)} a month`,
    );
  if (change.monthly_expenses_change)
    parts.push(
      `${change.monthly_expenses_change < 0 ? "cutting" : "adding"} ${money(change.monthly_expenses_change)} of monthly spending`,
    );
  if (change.monthly_savings_change)
    parts.push(
      `${change.monthly_savings_change > 0 ? "saving" : "saving"} ${money(change.monthly_savings_change)} ${change.monthly_savings_change > 0 ? "more" : "less"} a month`,
    );
  if (change.extra_debt_payment)
    parts.push(`putting ${money(change.extra_debt_payment)} a month extra at debt`);
  if (change.emergency_fund_change)
    parts.push(
      `${change.emergency_fund_change > 0 ? "adding" : "taking"} ${money(change.emergency_fund_change)} ${change.emergency_fund_change > 0 ? "to" : "from"} the emergency fund`,
    );
  if (change.total_debt_change)
    parts.push(
      `${change.total_debt_change < 0 ? "clearing" : "taking on"} ${money(change.total_debt_change)} of debt`,
    );

  return parts.length > 0 ? parts.join(", ") : "no change";
}
