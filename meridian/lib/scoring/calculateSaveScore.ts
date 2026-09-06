import { clamp, divideOrNull, round } from "./helpers";
import {
  PILLAR_DESCRIPTIONS,
  PILLAR_LABELS,
  PILLAR_WEIGHTS,
  SAVE_WEIGHTS,
  SAVINGS_CONSISTENCY_SCORES,
  THRESHOLDS,
} from "./scoreConfig";
import { getScoreStatus } from "./getScoreStatus";
import { combineComponents } from "./combine";
import type { ComponentResult, PillarResult, ScoringInput } from "./types";

const pct = (v: number | null) => (v === null ? "Not available" : `${round(v * 100, 1)}%`);

/**
 * Emergency fund cover (§8.1).
 *
 *   0 months -> 0    3 months -> 50    6 months or more -> 100
 */
export function emergencyFundScore(months: number): number {
  if (months >= THRESHOLDS.emergencyFundTargetMonths) return 100;
  return clamp((months / THRESHOLDS.emergencyFundTargetMonths) * 100, 0, 100);
}

/**
 * Savings rate (§8.2).
 *
 *   0% -> 0    10% -> 50    20% or more -> 100
 */
export function savingsRateScore(rate: number): number {
  if (rate <= 0) return 0;
  if (rate >= THRESHOLDS.savingsRateTarget) return 100;
  return clamp((rate / THRESHOLDS.savingsRateTarget) * 100, 0, 100);
}

/** Savings consistency (§8.3). */
export function savingsConsistencyScore(
  answer: keyof typeof SAVINGS_CONSISTENCY_SCORES | null,
): number | null {
  if (answer === null) return null;
  return SAVINGS_CONSISTENCY_SCORES[answer] ?? null;
}

/** Months of essential expenses the emergency fund covers, or null. */
export function emergencyFundMonths(input: ScoringInput): number | null {
  // An empty fund is a measured zero, not missing data — §11 is explicit that
  // no savings means an emergency fund score of 0.
  if (input.emergencyFundAmount <= 0) return 0;
  return divideOrNull(input.emergencyFundAmount, input.essentialMonthlyExpenses);
}

/**
 * Save pillar (§8).
 *
 *   Emergency fund 45% + savings rate 35% + consistency 20%
 */
export function calculateSaveScore(input: ScoringInput): PillarResult {
  const months = emergencyFundMonths(input);
  const savingsRate = divideOrNull(input.monthlySavings, input.monthlyIncome);
  const consistency = savingsConsistencyScore(input.savingsConsistency);

  const components: ComponentResult[] = [
    {
      key: "emergencyFund",
      label: "Emergency fund",
      weight: SAVE_WEIGHTS.emergencyFund,
      effectiveWeight: 0,
      score: months === null ? null : emergencyFundScore(months),
      status: months === null ? "insufficientData" : "ok",
      contribution: null,
      metric: {
        label: "Months of essential costs covered",
        value: months,
        display: months === null ? "Not available" : `${round(months, 1)} months`,
        target: "6 months",
      },
      explanation:
        months === null
          ? "We need your essential monthly costs before we can measure this."
          : months >= 6
            ? "You could cover half a year of essentials without any income."
            : months >= 3
              ? "You have a real buffer, though not yet a full one."
              : months >= 1
                ? "You have a little cover, but a single large bill would use it up."
                : "An unexpected bill would have to go on credit.",
    },
    {
      key: "savingsRate",
      label: "Savings rate",
      weight: SAVE_WEIGHTS.savingsRate,
      effectiveWeight: 0,
      score: savingsRate === null ? null : savingsRateScore(savingsRate),
      status: savingsRate === null ? "insufficientData" : "ok",
      contribution: null,
      metric: {
        label: "Share of income saved each month",
        value: savingsRate,
        display: pct(savingsRate),
        target: "20% or more",
      },
      explanation:
        savingsRate === null
          ? "We need your monthly income before we can measure this."
          : savingsRate >= 0.2
            ? "You are saving at a rate that compounds meaningfully over time."
            : savingsRate > 0
              ? "You are saving, but slowly enough that goals stay a long way off."
              : "Nothing is being set aside at the moment.",
    },
    {
      key: "savingsConsistency",
      label: "Savings consistency",
      weight: SAVE_WEIGHTS.savingsConsistency,
      effectiveWeight: 0,
      score: consistency,
      status: consistency === null ? "insufficientData" : "ok",
      contribution: null,
      metric: {
        label: "How reliably you save",
        value: consistency,
        display:
          input.savingsConsistency === null
            ? "Not answered"
            : {
                every_month: "Every month",
                most_months: "Most months",
                occasionally: "Occasionally",
                rarely: "Rarely",
                never: "Never",
              }[input.savingsConsistency],
        target: "Every month",
      },
      explanation:
        consistency === null
          ? "Not answered yet."
          : consistency >= 100
            ? "Saving is a habit rather than something left to whatever remains."
            : consistency >= 75
              ? "You save most months; making it automatic would close the gap."
              : "Saving happens when there is something left, which usually means rarely.",
    },
  ];

  const { score, components: resolved } = combineComponents(components);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendedActions: string[] = [];

  if (months !== null && months >= 6) {
    strengths.push("Your emergency fund covers six months of essentials.");
  } else if (months !== null && months >= 3) {
    strengths.push("You already hold three months of essential costs in reserve.");
  }
  if (savingsRate !== null && savingsRate >= 0.2) {
    strengths.push(`You save ${pct(savingsRate)} of your income.`);
  }
  if (consistency !== null && consistency >= 100) {
    strengths.push("You save every month without fail.");
  }

  if (months !== null && months < 1) {
    weaknesses.push("You have less than one month of essential costs saved.");
    recommendedActions.push(
      "Build a starter buffer of one month of essentials before anything else.",
    );
  } else if (months !== null && months < 3) {
    weaknesses.push("Your emergency fund covers less than three months.");
    recommendedActions.push("Set a standing transfer to grow the fund to three months.");
  }
  if (savingsRate !== null && savingsRate < 0.05) {
    weaknesses.push("Very little of your income is being saved.");
    recommendedActions.push(
      "Move a fixed amount to savings on payday, before it can be spent.",
    );
  }
  if (consistency !== null && consistency < 75) {
    weaknesses.push("Saving is not yet a regular habit.");
    recommendedActions.push("Automate the transfer so consistency is not a decision.");
  }

  return {
    key: "save",
    label: PILLAR_LABELS.save,
    description: PILLAR_DESCRIPTIONS.save,
    weight: PILLAR_WEIGHTS.save,
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
