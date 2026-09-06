import { clamp, divideOrNull, round } from "./helpers";
import {
  BORROW_WEIGHTS,
  PILLAR_DESCRIPTIONS,
  PILLAR_LABELS,
  PILLAR_WEIGHTS,
  THRESHOLDS,
} from "./scoreConfig";
import { getScoreStatus } from "./getScoreStatus";
import { combineComponents } from "./combine";
import type { ComponentResult, PillarResult, ScoringInput } from "./types";

const pct = (v: number | null) => (v === null ? "Not available" : `${round(v * 100, 1)}%`);

/**
 * Debt-to-income (§9.1). Total debt against annual income.
 *
 *   20% or less -> 100    45% -> 50    70% or more -> 0
 */
export function debtToIncomeScore(ratio: number): number {
  if (ratio <= THRESHOLDS.debtToIncomeIdeal) return 100;
  if (ratio >= THRESHOLDS.debtToIncomeFloor) return 0;
  return clamp(
    100 -
      ((ratio - THRESHOLDS.debtToIncomeIdeal) /
        (THRESHOLDS.debtToIncomeFloor - THRESHOLDS.debtToIncomeIdeal)) *
        100,
    0,
    100,
  );
}

/**
 * Debt payment burden (§9.2). Monthly repayments against monthly income.
 *
 *   10% or less -> 100    30% -> 50    50% or more -> 0
 */
export function debtPaymentScore(ratio: number): number {
  if (ratio <= THRESHOLDS.debtPaymentIdeal) return 100;
  if (ratio >= THRESHOLDS.debtPaymentFloor) return 0;
  return clamp(
    100 -
      ((ratio - THRESHOLDS.debtPaymentIdeal) /
        (THRESHOLDS.debtPaymentFloor - THRESHOLDS.debtPaymentIdeal)) *
        100,
    0,
    100,
  );
}

/**
 * High-interest exposure (§9.3). Debt at 12% APR or above, as a share of all
 * debt. No debt at all scores full marks rather than dividing by zero.
 */
export function highInterestDebtScore(
  highInterestDebt: number,
  totalDebt: number,
): number {
  if (totalDebt <= 0) return 100;
  return clamp(100 - (highInterestDebt / totalDebt) * 100, 0, 100);
}

/**
 * Borrow pillar (§9).
 *
 *   Debt-to-income 45% + payment burden 35% + high-interest share 20%
 *
 * Someone with no debt scores 100 outright: all three components are defined
 * as full marks, so having borrowed nothing is never penalised, and a zero
 * income does not make this pillar unmeasurable (§11).
 */
export function calculateBorrowScore(input: ScoringInput): PillarResult {
  const debtFree = input.totalDebt <= 0;
  const annualIncome = input.monthlyIncome * 12;

  const dtiRatio = debtFree ? 0 : divideOrNull(input.totalDebt, annualIncome);
  const paymentRatio = debtFree
    ? 0
    : divideOrNull(input.monthlyDebtPayments, input.monthlyIncome);
  const highInterestShare = debtFree
    ? 0
    : divideOrNull(input.highInterestDebt, input.totalDebt);

  const components: ComponentResult[] = [
    {
      key: "debtToIncome",
      label: "Debt-to-income ratio",
      weight: BORROW_WEIGHTS.debtToIncome,
      effectiveWeight: 0,
      score: debtFree ? 100 : dtiRatio === null ? null : debtToIncomeScore(dtiRatio),
      status: debtFree || dtiRatio !== null ? "ok" : "insufficientData",
      contribution: null,
      metric: {
        label: "Total debt against annual income",
        value: debtFree ? 0 : dtiRatio,
        display: debtFree ? "No debt" : pct(dtiRatio),
        target: "20% or less",
      },
      explanation: debtFree
        ? "You carry no debt at all."
        : dtiRatio === null
          ? "We need your income before we can measure this."
          : dtiRatio <= 0.2
            ? "What you owe is small relative to what you earn in a year."
            : dtiRatio < 0.5
              ? "Your total debt is a significant multiple of your monthly income."
              : "Your debt is large relative to your annual income, which limits your options.",
    },
    {
      key: "debtPayment",
      label: "Debt payment burden",
      weight: BORROW_WEIGHTS.debtPayment,
      effectiveWeight: 0,
      score: debtFree
        ? 100
        : paymentRatio === null
          ? null
          : debtPaymentScore(paymentRatio),
      status: debtFree || paymentRatio !== null ? "ok" : "insufficientData",
      contribution: null,
      metric: {
        label: "Repayments as a share of income",
        value: debtFree ? 0 : paymentRatio,
        display: debtFree ? "No repayments" : pct(paymentRatio),
        target: "10% or less",
      },
      explanation: debtFree
        ? "Nothing of your income is committed to repayments."
        : paymentRatio === null
          ? "We need your income before we can measure this."
          : paymentRatio <= 0.1
            ? "Repayments take a small, comfortable slice of your income."
            : paymentRatio < 0.36
              ? "Repayments take a noticeable share of each month's income."
              : "Repayments dominate your month before anything else is paid.",
    },
    {
      key: "highInterestDebt",
      label: "High-interest debt",
      weight: BORROW_WEIGHTS.highInterestDebt,
      effectiveWeight: 0,
      score: highInterestDebtScore(input.highInterestDebt, input.totalDebt),
      status: "ok",
      contribution: null,
      metric: {
        label: `Share of debt at ${THRESHOLDS.highInterestRate}% APR or above`,
        value: debtFree ? 0 : highInterestShare,
        display: debtFree ? "No debt" : pct(highInterestShare),
        target: "None",
      },
      explanation: debtFree
        ? "You carry no debt at all."
        : highInterestShare !== null && highInterestShare <= 0
          ? "None of your debt is expensive."
          : highInterestShare !== null && highInterestShare < 0.5
            ? "Part of your debt is at a rate that compounds quickly against you."
            : "Most of your debt is expensive, so repayments barely dent the balance.",
    },
  ];

  const { score, components: resolved } = combineComponents(components);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendedActions: string[] = [];

  if (debtFree) {
    strengths.push("You carry no debt, so none of your income is pre-committed.");
  } else {
    if (dtiRatio !== null && dtiRatio <= 0.2) {
      strengths.push("Your total debt is small relative to your annual income.");
    }
    if (paymentRatio !== null && paymentRatio <= 0.1) {
      strengths.push("Repayments take only a small share of your monthly income.");
    }
    if (input.highInterestDebt <= 0) {
      strengths.push("None of your debt is at a high interest rate.");
    }

    if (dtiRatio !== null && dtiRatio > 0.4) {
      weaknesses.push(
        `Your debt is ${pct(dtiRatio)} of a year's income, which is a heavy load to carry.`,
      );
    }
    if (paymentRatio !== null && paymentRatio > 0.36) {
      weaknesses.push(
        `Repayments take ${pct(paymentRatio)} of your monthly income.`,
      );
      recommendedActions.push(
        "Ask your largest lender about a longer term or lower rate to cut the monthly commitment.",
      );
    }
    if (highInterestShare !== null && highInterestShare > 0) {
      weaknesses.push(
        `${pct(highInterestShare)} of your debt is at ${THRESHOLDS.highInterestRate}% APR or above.`,
      );
      recommendedActions.push(
        "Direct every spare payment at the highest-rate balance first, paying minimums on the rest.",
      );
    }
  }

  return {
    key: "borrow",
    label: PILLAR_LABELS.borrow,
    description: PILLAR_DESCRIPTIONS.borrow,
    weight: PILLAR_WEIGHTS.borrow,
    effectiveWeight: 0,
    score,
    status: score === null ? null : getScoreStatus(score),
    components: Object.fromEntries(
      resolved.filter((c) => c.score !== null).map((c) => [c.key, c.score as number]),
    ),
    breakdown: resolved,
    strengths,
    weaknesses,
    recommendedActions,
    insufficientData: score === null || resolved.some((c) => c.status !== "ok"),
  };
}
