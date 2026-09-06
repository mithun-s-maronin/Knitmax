/**
 * Every weight, threshold and band the scoring engine uses, in one place.
 *
 * Changing a number here changes future scores only. Completed assessments
 * store the scoring version that produced them and are re-read through that
 * version's engine, so history never shifts under a formula change (§12, §76).
 */

import type { PillarKey } from "@/types/database";

/** The question set. Bump when questions are added, removed or reworded. */
export const ASSESSMENT_VERSION = "v1.0";

/** The formulas. Bump when any weight or curve below changes. */
export const SCORING_VERSION = "v1.0";

/** Pillar weights in the overall score. These must sum to 1. */
export const PILLAR_WEIGHTS: Record<PillarKey, number> = {
  spend: 0.25,
  save: 0.3,
  borrow: 0.25,
  plan: 0.2,
};

export const PILLAR_LABELS: Record<PillarKey, string> = {
  spend: "Spend",
  save: "Save",
  borrow: "Borrow",
  plan: "Plan",
};

export const PILLAR_DESCRIPTIONS: Record<PillarKey, string> = {
  spend: "How sustainably you manage everyday spending.",
  save: "Your savings habit and how much resilience it has bought you.",
  borrow: "Whether the debt you carry is sustainable.",
  plan: "How prepared you are for what comes next.",
};

/** Component weights within each pillar. Each group must sum to 1. */
export const SPEND_WEIGHTS = {
  expenseRatio: 0.5,
  disposableIncome: 0.3,
  billPayment: 0.2,
} as const;

export const SAVE_WEIGHTS = {
  emergencyFund: 0.45,
  savingsRate: 0.35,
  savingsConsistency: 0.2,
} as const;

export const BORROW_WEIGHTS = {
  debtToIncome: 0.45,
  debtPayment: 0.35,
  highInterestDebt: 0.2,
} as const;

export const PLAN_WEIGHTS = {
  goals: 0.35,
  protection: 0.25,
  longTermPlanning: 0.25,
  reviewHabit: 0.15,
} as const;

/** Score bands. */
export const SCORE_RANGES = {
  excellent: { min: 80, max: 100 },
  good: { min: 65, max: 79 },
  fair: { min: 50, max: 64 },
  needsImprovement: { min: 35, max: 49 },
  critical: { min: 0, max: 34 },
} as const;

export type ScoreStatusKey = keyof typeof SCORE_RANGES;

export const SCORE_STATUS_LABELS: Record<ScoreStatusKey, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  needsImprovement: "Needs Improvement",
  critical: "Critical",
};

/** Curve thresholds, named so the formulas read as prose. */
export const THRESHOLDS = {
  /** At or below this share of income going out, spending scores full marks. */
  expenseRatioIdeal: 0.5,
  /** At or above this, spending scores nothing. */
  expenseRatioFloor: 1.0,

  /** Disposable income at or above this share of income scores full marks. */
  disposableIncomeTarget: 0.3,
  /** A profile that merely breaks even still earns this much. */
  disposableIncomeBaseline: 20,

  /** Months of essential expenses that count as a complete emergency fund. */
  emergencyFundTargetMonths: 6,

  /** Saving this share of income scores full marks. */
  savingsRateTarget: 0.2,

  /** Total debt at or below this multiple of annual income scores full marks. */
  debtToIncomeIdeal: 0.2,
  /** At or above this, debt-to-income scores nothing. */
  debtToIncomeFloor: 0.7,

  /** Debt payments at or below this share of income score full marks. */
  debtPaymentIdeal: 0.1,
  /** At or above this, the payment burden scores nothing. */
  debtPaymentFloor: 0.5,

  /** An interest rate at or above this counts as high-interest debt. */
  highInterestRate: 12,
} as const;

/** Answer-to-score maps for the questionnaire components. */
export const BILL_PAYMENT_SCORES = {
  always: 100,
  usually: 75,
  sometimes: 50,
  rarely: 25,
  never: 0,
} as const;

export const SAVINGS_CONSISTENCY_SCORES = {
  every_month: 100,
  most_months: 75,
  occasionally: 50,
  rarely: 25,
  never: 0,
} as const;

export const GOALS_SCORES = {
  clear_and_tracking: 100,
  clear: 75,
  general: 50,
  none: 0,
} as const;

export const LONG_TERM_PLANNING_SCORES = {
  detailed_plan: 100,
  basic_plan: 75,
  thinking_about_it: 40,
  no_plan: 0,
} as const;

export const REVIEW_HABIT_SCORES = {
  weekly: 100,
  monthly: 85,
  every_few_months: 60,
  rarely: 30,
  never: 0,
} as const;

/** Insurance types the protection component can consider. */
export const INSURANCE_TYPES = ["health", "life", "vehicle", "property"] as const;
export type InsuranceType = (typeof INSURANCE_TYPES)[number];

export const INSURANCE_LABELS: Record<InsuranceType, string> = {
  health: "Health",
  life: "Life",
  vehicle: "Vehicle",
  property: "Property or home",
};
