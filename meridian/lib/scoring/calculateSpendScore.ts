import { clamp, divideOrNull, round } from "./helpers";
import {
  BILL_PAYMENT_SCORES,
  PILLAR_DESCRIPTIONS,
  PILLAR_LABELS,
  PILLAR_WEIGHTS,
  SPEND_WEIGHTS,
  THRESHOLDS,
} from "./scoreConfig";
import { getScoreStatus } from "./getScoreStatus";
import { combineComponents } from "./combine";
import type { ComponentResult, PillarResult, ScoringInput } from "./types";

const pct = (v: number | null) => (v === null ? "Not available" : `${round(v * 100, 1)}%`);

/**
 * Expense-to-income ratio (§7.1).
 *
 *   50% or less -> 100     70% -> 60      90% -> 20
 *   60%         ->  80     80% -> 40     100% or more -> 0
 */
export function expenseRatioScore(ratio: number): number {
  const percent = ratio * 100;
  if (percent <= THRESHOLDS.expenseRatioIdeal * 100) return 100;
  if (percent >= THRESHOLDS.expenseRatioFloor * 100) return 0;
  return clamp(100 - (percent - 50) * 2, 0, 100);
}

/**
 * Disposable income as a share of income (§7.2).
 *
 * Breaking even exactly still earns a floor of 20 — having nothing left over
 * is not the same failure as spending more than you earn, which scores 0.
 */
export function disposableIncomeScore(ratio: number): number {
  if (ratio < 0) return 0;
  if (ratio >= THRESHOLDS.disposableIncomeTarget) return 100;
  return clamp(
    THRESHOLDS.disposableIncomeBaseline +
      (ratio / THRESHOLDS.disposableIncomeTarget) *
        (100 - THRESHOLDS.disposableIncomeBaseline),
    0,
    100,
  );
}

/** Bill payment ability (§7.3). */
export function billPaymentScore(
  answer: keyof typeof BILL_PAYMENT_SCORES | null,
): number | null {
  if (answer === null) return null;
  return BILL_PAYMENT_SCORES[answer] ?? null;
}

/**
 * Spend pillar (§7).
 *
 *   Expense ratio 50% + disposable income 30% + bill payment 20%
 */
export function calculateSpendScore(input: ScoringInput): PillarResult {
  const expenseRatio = divideOrNull(input.monthlyExpenses, input.monthlyIncome);
  const disposableIncome =
    input.monthlyIncome - input.monthlyExpenses - input.monthlyDebtPayments;
  const disposableRatio = divideOrNull(disposableIncome, input.monthlyIncome);
  const bill = billPaymentScore(input.billPayment);

  const components: ComponentResult[] = [
    {
      key: "expenseRatio",
      label: "Expense-to-income ratio",
      weight: SPEND_WEIGHTS.expenseRatio,
      effectiveWeight: 0,
      score: expenseRatio === null ? null : expenseRatioScore(expenseRatio),
      status: expenseRatio === null ? "insufficientData" : "ok",
      contribution: null,
      metric: {
        label: "Expenses as a share of income",
        value: expenseRatio,
        display: pct(expenseRatio),
        target: "50% or less",
      },
      explanation:
        expenseRatio === null
          ? "We need your monthly income before we can measure this."
          : expenseRatio <= 0.5
            ? "Half or less of your income goes on living costs, which leaves real room to move."
            : expenseRatio < 0.85
              ? "A large share of your income is committed before anything else happens."
              : "Almost everything you earn is spoken for by living costs.",
    },
    {
      key: "disposableIncome",
      label: "Disposable income",
      weight: SPEND_WEIGHTS.disposableIncome,
      effectiveWeight: 0,
      score: disposableRatio === null ? null : disposableIncomeScore(disposableRatio),
      status: disposableRatio === null ? "insufficientData" : "ok",
      contribution: null,
      metric: {
        label: "Left after living costs and debt payments",
        value: disposableRatio,
        display: pct(disposableRatio),
        target: "30% or more",
      },
      explanation:
        disposableRatio === null
          ? "We need your monthly income before we can measure this."
          : disposableRatio < 0
            ? "You are spending more each month than you bring in."
            : disposableRatio >= 0.3
              ? "You keep a healthy margin each month after everything is paid."
              : "There is not much left once living costs and debt payments are covered.",
    },
    {
      key: "billPayment",
      label: "Bill payment ability",
      weight: SPEND_WEIGHTS.billPayment,
      effectiveWeight: 0,
      score: bill,
      status: bill === null ? "insufficientData" : "ok",
      contribution: null,
      metric: {
        label: "Paying bills on time",
        value: bill,
        display:
          input.billPayment === null
            ? "Not answered"
            : {
                always: "Always",
                usually: "Usually",
                sometimes: "Sometimes",
                rarely: "Rarely",
                never: "Never",
              }[input.billPayment],
        target: "Always",
      },
      explanation:
        bill === null
          ? "Not answered yet."
          : bill >= 100
            ? "You pay everything on time, which protects you from fees and credit damage."
            : bill >= 75
              ? "You usually pay on time; closing the occasional gap is worth real money in fees."
              : "Missed payments are costing you in fees and, over time, in borrowing costs.",
    },
  ];

  const { score, components: resolved } = combineComponents(components);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendedActions: string[] = [];

  if (expenseRatio !== null && expenseRatio <= 0.5) {
    strengths.push("Your living costs take half or less of what you earn.");
  }
  if (disposableRatio !== null && disposableRatio >= 0.3) {
    strengths.push("You finish each month with a meaningful surplus.");
  }
  if (bill !== null && bill >= 100) {
    strengths.push("Every bill gets paid on time.");
  }

  if (expenseRatio !== null && expenseRatio > 0.7) {
    weaknesses.push(
      `Living costs take ${pct(expenseRatio)} of your income, which leaves little room for saving.`,
    );
    recommendedActions.push(
      "Pick the two largest non-essential categories and set a specific monthly cap for each.",
    );
  }
  if (disposableRatio !== null && disposableRatio < 0) {
    weaknesses.push("You are spending more than you earn each month.");
    recommendedActions.push(
      "Close the monthly shortfall first — every other improvement depends on it.",
    );
  } else if (disposableRatio !== null && disposableRatio < 0.1) {
    weaknesses.push("Very little is left over once everything is paid.");
    recommendedActions.push(
      "Find one recurring cost you can cancel or renegotiate this month.",
    );
  }
  if (bill !== null && bill < 75) {
    weaknesses.push("Bills are not reliably paid on time.");
    recommendedActions.push(
      "Automate the essential bills for the day after you are paid.",
    );
  }

  return {
    key: "spend",
    label: PILLAR_LABELS.spend,
    description: PILLAR_DESCRIPTIONS.spend,
    weight: PILLAR_WEIGHTS.spend,
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
