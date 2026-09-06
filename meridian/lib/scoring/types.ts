import type {
  ActionHorizon,
  PillarKey,
  PillarOrOverall,
  Priority,
  Severity,
} from "@/types/database";

import type {
  BILL_PAYMENT_SCORES,
  GOALS_SCORES,
  InsuranceType,
  LONG_TERM_PLANNING_SCORES,
  REVIEW_HABIT_SCORES,
  SAVINGS_CONSISTENCY_SCORES,
} from "./scoreConfig";
import type { ScoreStatus } from "./getScoreStatus";

export type BillPaymentAnswer = keyof typeof BILL_PAYMENT_SCORES;
export type SavingsConsistencyAnswer = keyof typeof SAVINGS_CONSISTENCY_SCORES;
export type GoalsAnswer = keyof typeof GOALS_SCORES;
export type LongTermPlanningAnswer = keyof typeof LONG_TERM_PLANNING_SCORES;
export type ReviewHabitAnswer = keyof typeof REVIEW_HABIT_SCORES;

/**
 * Everything the engine needs, and nothing it does not.
 *
 * This is the single door into scoring: the assessment builds one, the live
 * financial records build one, and the what-if simulator builds one from a
 * copy of the records. All three then run the identical engine, which is why
 * a simulated score is directly comparable to a real one (§29).
 *
 * `monthlyExpenses` deliberately EXCLUDES debt repayments — they are counted
 * separately in `monthlyDebtPayments`, so the disposable income formula in
 * §7.2 does not subtract them twice.
 */
export interface ScoringInput {
  currency: string;

  monthlyIncome: number;
  /** Living costs excluding debt repayments. */
  monthlyExpenses: number;
  /** The part of monthlyExpenses that is unavoidable. */
  essentialMonthlyExpenses: number;
  monthlyDebtPayments: number;
  monthlySavings: number;

  emergencyFundAmount: number;
  totalSavings: number;

  totalDebt: number;
  /** Balance carried on debts at or above the high-interest threshold. */
  highInterestDebt: number;

  billPayment: BillPaymentAnswer | null;
  savingsConsistency: SavingsConsistencyAnswer | null;
  goals: GoalsAnswer | null;
  /** Insurance types that apply to this person's circumstances. */
  insuranceApplicable: InsuranceType[];
  /** The subset of those they actually hold. */
  insuranceCovered: InsuranceType[];
  longTermPlanning: LongTermPlanningAnswer | null;
  reviewHabit: ReviewHabitAnswer | null;
}

export type ComponentStatus = "ok" | "insufficientData";

export interface MetricValue {
  label: string;
  /** The measured value, or null when it could not be measured. */
  value: number | null;
  /** The same value formatted for a person. */
  display: string;
  /** What a full-marks value looks like. */
  target?: string;
}

export interface ComponentResult {
  key: string;
  label: string;
  /** The configured weight within its pillar. */
  weight: number;
  /**
   * The weight actually applied. When a component cannot be measured it is
   * dropped and the remaining weights are scaled up to fill the gap, rather
   * than scoring it zero and punishing someone for a question that does not
   * apply to them.
   */
  effectiveWeight: number;
  score: number | null;
  status: ComponentStatus;
  /** score x effectiveWeight — what this component added to the pillar. */
  contribution: number | null;
  metric: MetricValue;
  explanation: string;
}

export interface PillarResult {
  key: PillarKey;
  label: string;
  description: string;
  weight: number;
  effectiveWeight: number;
  /** Rounded 0-100, or null when nothing in the pillar could be measured. */
  score: number | null;
  status: ScoreStatus | null;
  /** Component scores keyed by name, as required by the shared result shape. */
  components: Record<string, number>;
  /** The same components with their metrics, weights and explanations. */
  breakdown: ComponentResult[];
  strengths: string[];
  weaknesses: string[];
  recommendedActions: string[];
  insufficientData: boolean;
}

/** The numbers everything downstream quotes, derived once. */
export interface DerivedMetrics {
  monthlyIncome: number;
  annualIncome: number;
  monthlyExpenses: number;
  essentialMonthlyExpenses: number;
  discretionaryMonthlyExpenses: number;
  monthlyDebtPayments: number;
  monthlySavings: number;
  disposableIncome: number;
  expenseRatio: number | null;
  disposableIncomeRatio: number | null;
  savingsRate: number | null;
  emergencyFundAmount: number;
  emergencyFundMonths: number | null;
  totalSavings: number;
  totalDebt: number;
  highInterestDebt: number;
  highInterestDebtShare: number | null;
  debtToIncomeRatio: number | null;
  debtPaymentRatio: number | null;
}

export interface Recommendation {
  key: string;
  title: string;
  description: string;
  /** Why this matters, in plain language. */
  why: string;
  pillar: PillarOrOverall;
  priority: Priority;
  horizon: ActionHorizon;
  /**
   * Points the overall score would gain, measured by re-running this same
   * engine against an adjusted copy of the input. Null when the change cannot
   * be expressed as a deterministic adjustment — never an estimate.
   */
  estimatedImpact: number | null;
}

export interface Insight {
  key: string;
  kind: "strength" | "improvement" | "action";
  title: string;
  detail: string;
  pillar: PillarOrOverall;
  severity: Severity;
}

export interface Alert {
  key: string;
  severity: Severity;
  title: string;
  message: string;
  href?: string;
}

/**
 * The result of one scoring run.
 *
 * `overallScore` is always a number so callers never have to guard it, but
 * `measuredWeight` says how much of the model could actually be measured —
 * when it is 0 the UI shows "not enough information yet" rather than a score.
 */
export interface FinancialHealthResult {
  scoringVersion: string;
  overallScore: number;
  overallStatus: ScoreStatus;
  /** Share of the pillar weighting that was measurable, 0-1. */
  measuredWeight: number;
  hasInsufficientData: boolean;

  spend: PillarResult;
  save: PillarResult;
  borrow: PillarResult;
  plan: PillarResult;
  /** The same four, in display order. */
  pillars: PillarResult[];

  metrics: DerivedMetrics;
  recommendations: Recommendation[];
  strengths: Insight[];
  improvements: Insight[];
  actions: Insight[];
  alerts: Alert[];
}
