import { divideOrNull, round, roundScore } from "./helpers";
import { PILLAR_WEIGHTS, SCORING_VERSION, THRESHOLDS } from "./scoreConfig";
import { calculateSpendScore } from "./calculateSpendScore";
import { calculateSaveScore } from "./calculateSaveScore";
import { calculateBorrowScore } from "./calculateBorrowScore";
import { calculatePlanScore } from "./calculatePlanScore";
import { emergencyFundMonths } from "./calculateSaveScore";
import type { DerivedMetrics, PillarResult, ScoringInput } from "./types";

/** The pillars and the overall score, without the narrative layer. */
export interface CoreResult {
  scoringVersion: string;
  overallScore: number;
  measuredWeight: number;
  spend: PillarResult;
  save: PillarResult;
  borrow: PillarResult;
  plan: PillarResult;
  pillars: PillarResult[];
  metrics: DerivedMetrics;
}

/**
 * The overall score (§4).
 *
 *   Spend x 0.25 + Save x 0.30 + Borrow x 0.25 + Plan x 0.20
 *
 * The pillar scores are rounded before they are combined, so the arithmetic a
 * user can do from the four numbers on screen reproduces the overall score
 * exactly — a transparency page that does not add up is worse than none (§78).
 *
 * A pillar that could not be measured at all is dropped and the remaining
 * weights are renormalised, rather than being counted as a zero.
 */
export function calculateOverallScore(pillars: {
  spend: number | null;
  save: number | null;
  borrow: number | null;
  plan: number | null;
}): { score: number; measuredWeight: number } {
  const entries = (
    [
      ["spend", pillars.spend],
      ["save", pillars.save],
      ["borrow", pillars.borrow],
      ["plan", pillars.plan],
    ] as const
  ).filter((entry): entry is readonly [keyof typeof PILLAR_WEIGHTS, number] =>
    entry[1] !== null,
  );

  const measuredWeight = entries.reduce(
    (sum, [key]) => sum + PILLAR_WEIGHTS[key],
    0,
  );

  if (entries.length === 0 || measuredWeight <= 0) {
    return { score: 0, measuredWeight: 0 };
  }

  const weighted = entries.reduce(
    (sum, [key, value]) => sum + value * (PILLAR_WEIGHTS[key] / measuredWeight),
    0,
  );

  return { score: roundScore(weighted), measuredWeight: round(measuredWeight, 4) };
}

/** Every ratio the rest of the product quotes, derived once from the input. */
export function deriveMetrics(input: ScoringInput): DerivedMetrics {
  const disposableIncome =
    input.monthlyIncome - input.monthlyExpenses - input.monthlyDebtPayments;

  return {
    monthlyIncome: input.monthlyIncome,
    annualIncome: input.monthlyIncome * 12,
    monthlyExpenses: input.monthlyExpenses,
    essentialMonthlyExpenses: input.essentialMonthlyExpenses,
    discretionaryMonthlyExpenses: Math.max(
      input.monthlyExpenses - input.essentialMonthlyExpenses,
      0,
    ),
    monthlyDebtPayments: input.monthlyDebtPayments,
    monthlySavings: input.monthlySavings,
    disposableIncome,
    expenseRatio: divideOrNull(input.monthlyExpenses, input.monthlyIncome),
    disposableIncomeRatio: divideOrNull(disposableIncome, input.monthlyIncome),
    savingsRate: divideOrNull(input.monthlySavings, input.monthlyIncome),
    emergencyFundAmount: input.emergencyFundAmount,
    emergencyFundMonths: emergencyFundMonths(input),
    totalSavings: input.totalSavings,
    totalDebt: input.totalDebt,
    highInterestDebt: input.highInterestDebt,
    highInterestDebtShare:
      input.totalDebt > 0 ? input.highInterestDebt / input.totalDebt : 0,
    debtToIncomeRatio:
      input.totalDebt <= 0
        ? 0
        : divideOrNull(input.totalDebt, input.monthlyIncome * 12),
    debtPaymentRatio:
      input.totalDebt <= 0
        ? 0
        : divideOrNull(input.monthlyDebtPayments, input.monthlyIncome),
  };
}

/**
 * Runs the four pillars and combines them.
 *
 * Deliberately free of narrative: the recommendation engine calls this many
 * times against adjusted inputs to measure the real effect of a change, so it
 * has to stay cheap and free of recursion.
 */
export function computeCore(input: ScoringInput): CoreResult {
  const spend = calculateSpendScore(input);
  const save = calculateSaveScore(input);
  const borrow = calculateBorrowScore(input);
  const plan = calculatePlanScore(input);

  const { score, measuredWeight } = calculateOverallScore({
    spend: spend.score,
    save: save.score,
    borrow: borrow.score,
    plan: plan.score,
  });

  const withEffectiveWeights = [spend, save, borrow, plan].map((pillar) => ({
    ...pillar,
    effectiveWeight:
      pillar.score === null || measuredWeight <= 0
        ? 0
        : round(pillar.weight / measuredWeight, 4),
  }));

  const [spendR, saveR, borrowR, planR] = withEffectiveWeights;

  return {
    scoringVersion: SCORING_VERSION,
    overallScore: score,
    measuredWeight,
    spend: spendR,
    save: saveR,
    borrow: borrowR,
    plan: planR,
    pillars: withEffectiveWeights,
    metrics: deriveMetrics(input),
  };
}

/** The high-interest threshold, re-exported so callers do not hard-code 12. */
export const HIGH_INTEREST_RATE = THRESHOLDS.highInterestRate;
