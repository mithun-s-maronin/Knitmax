import {
  PILLAR_DESCRIPTIONS,
  PILLAR_LABELS,
  PILLAR_WEIGHTS,
} from "./scoreConfig";
import { getScoreStatus } from "./getScoreStatus";
import type {
  Alert,
  ComponentResult,
  DerivedMetrics,
  PillarResult,
  Recommendation,
} from "./types";
import type { AssessmentRow, PillarKey } from "@/types/database";

/**
 * Rebuilds a displayable result from a stored assessment.
 *
 * A completed assessment is never re-scored. Everything on the results page —
 * the pillar scores, each component's measured value and contribution, the
 * recommendations, the alerts — comes back out of the row exactly as it was
 * written, under the scoring version recorded alongside it. That is what makes
 * an assessment from two formula revisions ago still explainable (§76, §77).
 */
export interface StoredAssessmentResult {
  scoringVersion: string;
  assessmentVersion: string;
  completedAt: string;
  currency: string;
  overallScore: number;
  overallStatus: ReturnType<typeof getScoreStatus>;
  measuredWeight: number;
  hasInsufficientData: boolean;
  pillars: PillarResult[];
  spend: PillarResult;
  save: PillarResult;
  borrow: PillarResult;
  plan: PillarResult;
  metrics: DerivedMetrics;
  recommendations: Recommendation[];
  alerts: Alert[];
}

const PILLAR_ORDER: PillarKey[] = ["spend", "save", "borrow", "plan"];

interface StoredPillar {
  key?: PillarKey;
  score?: number | null;
  weight?: number;
  effectiveWeight?: number;
  insufficientData?: boolean;
  strengths?: string[];
  weaknesses?: string[];
  recommendedActions?: string[];
  components?: Partial<ComponentResult>[];
}

function emptyPillar(key: PillarKey, score: number | null): PillarResult {
  return {
    key,
    label: PILLAR_LABELS[key],
    description: PILLAR_DESCRIPTIONS[key],
    weight: PILLAR_WEIGHTS[key],
    effectiveWeight: PILLAR_WEIGHTS[key],
    score,
    status: score === null ? null : getScoreStatus(score),
    components: {},
    breakdown: [],
    strengths: [],
    weaknesses: [],
    recommendedActions: [],
    insufficientData: score === null,
  };
}

function readPillar(stored: StoredPillar | undefined, key: PillarKey, fallback: number | null): PillarResult {
  if (!stored) return emptyPillar(key, fallback);

  const score = stored.score ?? fallback;
  const breakdown: ComponentResult[] = (stored.components ?? []).map((c) => ({
    key: c.key ?? "",
    label: c.label ?? "",
    weight: c.weight ?? 0,
    effectiveWeight: c.effectiveWeight ?? 0,
    score: c.score ?? null,
    status: c.status ?? (c.score === null ? "insufficientData" : "ok"),
    contribution: c.contribution ?? null,
    metric: c.metric ?? { label: "", value: null, display: "—" },
    explanation: c.explanation ?? "",
  }));

  return {
    key,
    label: PILLAR_LABELS[key],
    description: PILLAR_DESCRIPTIONS[key],
    weight: stored.weight ?? PILLAR_WEIGHTS[key],
    effectiveWeight: stored.effectiveWeight ?? PILLAR_WEIGHTS[key],
    score,
    status: score === null ? null : getScoreStatus(score),
    components: Object.fromEntries(
      breakdown.filter((c) => c.score !== null).map((c) => [c.key, c.score as number]),
    ),
    breakdown,
    strengths: stored.strengths ?? [],
    weaknesses: stored.weaknesses ?? [],
    recommendedActions: stored.recommendedActions ?? [],
    insufficientData: stored.insufficientData ?? score === null,
  };
}

export function readStoredResult(assessment: AssessmentRow): StoredAssessmentResult {
  const breakdown = (assessment.breakdown ?? {}) as {
    measuredWeight?: number;
    hasInsufficientData?: boolean;
    metrics?: Partial<DerivedMetrics>;
    pillars?: StoredPillar[];
    recommendations?: Recommendation[];
    alerts?: Alert[];
  };

  const storedByKey = new Map(
    (breakdown.pillars ?? []).map((p) => [p.key as PillarKey, p]),
  );

  const fallbackScores: Record<PillarKey, number | null> = {
    spend: assessment.spend_score,
    save: assessment.save_score,
    borrow: assessment.borrow_score,
    plan: assessment.plan_score,
  };

  const pillars = PILLAR_ORDER.map((key) =>
    readPillar(storedByKey.get(key), key, fallbackScores[key]),
  );

  const metrics: DerivedMetrics = {
    monthlyIncome: 0,
    annualIncome: 0,
    monthlyExpenses: 0,
    essentialMonthlyExpenses: 0,
    discretionaryMonthlyExpenses: 0,
    monthlyDebtPayments: 0,
    monthlySavings: 0,
    disposableIncome: 0,
    expenseRatio: null,
    disposableIncomeRatio: null,
    savingsRate: null,
    emergencyFundAmount: 0,
    emergencyFundMonths: null,
    totalSavings: 0,
    totalDebt: 0,
    highInterestDebt: 0,
    highInterestDebtShare: null,
    debtToIncomeRatio: null,
    debtPaymentRatio: null,
    ...(breakdown.metrics ?? {}),
  };

  const [spend, save, borrow, plan] = pillars;

  return {
    scoringVersion: assessment.scoring_version,
    assessmentVersion: assessment.assessment_version,
    completedAt: assessment.completed_at,
    currency: assessment.currency,
    overallScore: assessment.overall_score,
    overallStatus: getScoreStatus(assessment.overall_score),
    measuredWeight: breakdown.measuredWeight ?? 1,
    hasInsufficientData: breakdown.hasInsufficientData ?? false,
    pillars,
    spend,
    save,
    borrow,
    plan,
    metrics,
    recommendations: breakdown.recommendations ?? [],
    alerts: breakdown.alerts ?? [],
  };
}
