/**
 * The scoring engine.
 *
 * This module is pure: no React, no database, no network, no clock. Give it a
 * ScoringInput and it returns the same result every time. That is what lets
 * the assessment, the live dashboard, the what-if simulator and the tests all
 * run the identical code and get comparable numbers (§29, §59, §90).
 *
 * The engine is authoritative. The AI assistant may explain and interpret what
 * comes out of here, but every official number a user sees originates in this
 * file's call graph (§27).
 */

import { computeCore, type CoreResult } from "./calculateOverallScore";
import { generateAlerts, generateInsights, generateRecommendations } from "./generateInsights";
import { getScoreStatus } from "./getScoreStatus";
import { SCORING_VERSION } from "./scoreConfig";
import type { FinancialHealthResult, ScoringInput } from "./types";

export * from "./types";
export * from "./scoreConfig";
export * from "./helpers";
export * from "./getScoreStatus";
export { calculateSpendScore, expenseRatioScore, disposableIncomeScore, billPaymentScore } from "./calculateSpendScore";
export {
  calculateSaveScore,
  emergencyFundScore,
  savingsRateScore,
  savingsConsistencyScore,
  emergencyFundMonths,
} from "./calculateSaveScore";
export {
  calculateBorrowScore,
  debtToIncomeScore,
  debtPaymentScore,
  highInterestDebtScore,
} from "./calculateBorrowScore";
export {
  calculatePlanScore,
  goalsScore,
  protectionScore,
  longTermPlanningScore,
  reviewHabitScore,
} from "./calculatePlanScore";
export { calculateOverallScore, deriveMetrics, computeCore } from "./calculateOverallScore";
export {
  generateRecommendations,
  generateAlerts,
  generateInsights,
  buildRoadmap,
  type Roadmap,
  type RoadmapStep,
} from "./generateInsights";
export { readStoredResult, type StoredAssessmentResult } from "./fromStored";
export type { CoreResult };

/** A neutral input, so callers can build one field at a time. */
export function emptyScoringInput(currency = "USD"): ScoringInput {
  return {
    currency,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    essentialMonthlyExpenses: 0,
    monthlyDebtPayments: 0,
    monthlySavings: 0,
    emergencyFundAmount: 0,
    totalSavings: 0,
    totalDebt: 0,
    highInterestDebt: 0,
    billPayment: null,
    savingsConsistency: null,
    goals: null,
    insuranceApplicable: [],
    insuranceCovered: [],
    longTermPlanning: null,
    reviewHabit: null,
  };
}

/** Guards against a caller handing the engine a NaN or a negative amount. */
export function normaliseScoringInput(input: ScoringInput): ScoringInput {
  const amount = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
  const essential = Math.min(
    amount(input.essentialMonthlyExpenses),
    amount(input.monthlyExpenses),
  );
  return {
    ...input,
    monthlyIncome: amount(input.monthlyIncome),
    monthlyExpenses: amount(input.monthlyExpenses),
    essentialMonthlyExpenses: essential,
    monthlyDebtPayments: amount(input.monthlyDebtPayments),
    monthlySavings: amount(input.monthlySavings),
    emergencyFundAmount: amount(input.emergencyFundAmount),
    totalSavings: amount(input.totalSavings),
    totalDebt: amount(input.totalDebt),
    highInterestDebt: Math.min(amount(input.highInterestDebt), amount(input.totalDebt)),
    insuranceApplicable: Array.from(new Set(input.insuranceApplicable)),
    insuranceCovered: Array.from(
      new Set(input.insuranceCovered.filter((t) => input.insuranceApplicable.includes(t))),
    ),
  };
}

/**
 * Scores a financial profile.
 *
 * Runs the four pillars, combines them, then derives the narrative layer:
 * prioritised recommendations whose score impact is measured by re-running
 * this same engine, deterministic alerts, and per-pillar strengths and
 * weaknesses.
 */
export function scoreFinancialHealth(rawInput: ScoringInput): FinancialHealthResult {
  const input = normaliseScoringInput(rawInput);
  const core = computeCore(input);

  const recommendations = generateRecommendations(input, core);
  const { strengths, improvements, actions } = generateInsights(core, recommendations);

  return {
    scoringVersion: SCORING_VERSION,
    overallScore: core.overallScore,
    overallStatus: getScoreStatus(core.overallScore),
    measuredWeight: core.measuredWeight,
    hasInsufficientData:
      core.measuredWeight < 1 || core.pillars.some((p) => p.insufficientData),
    spend: core.spend,
    save: core.save,
    borrow: core.borrow,
    plan: core.plan,
    pillars: core.pillars,
    metrics: core.metrics,
    recommendations,
    strengths,
    improvements,
    actions,
    alerts: generateAlerts(core),
  };
}
