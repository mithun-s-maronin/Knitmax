import type { Priority } from "@/types/database";

import { computeCore, type CoreResult } from "./calculateOverallScore";
import { round } from "./helpers";
import { THRESHOLDS } from "./scoreConfig";
import type {
  Alert,
  Insight,
  Recommendation,
  ScoringInput,
} from "./types";

/**
 * A candidate recommendation.
 *
 * `adjust` describes the change as a transformation of the scoring input. The
 * engine then re-runs itself against that adjusted input and reports the real
 * difference in the overall score. Nothing here estimates an impact — if a
 * change cannot be expressed as an input adjustment, its impact is null and
 * the UI says so rather than inventing a number (§23, §30).
 */
interface Candidate {
  key: string;
  when: (m: CoreResult["metrics"], core: CoreResult, input: ScoringInput) => boolean;
  title: string;
  description: string;
  why: string;
  pillar: Recommendation["pillar"];
  priority: Priority;
  horizon: Recommendation["horizon"];
  adjust?: (input: ScoringInput, m: CoreResult["metrics"]) => ScoringInput;
}

const CANDIDATES: Candidate[] = [
  {
    key: "close_monthly_shortfall",
    when: (m) => m.monthlyIncome > 0 && m.disposableIncome < 0,
    title: "Close the gap between what you earn and what you spend",
    description:
      "Your outgoings are larger than your income, so the shortfall is being covered by savings or credit each month.",
    why: "Every other improvement is built on this. While the month ends short, saving and debt repayment both go backwards.",
    pillar: "spend",
    priority: "high",
    horizon: "immediate",
    adjust: (input, m) => ({
      ...input,
      monthlyExpenses: Math.max(input.monthlyExpenses + m.disposableIncome, 0),
    }),
  },
  {
    key: "build_starter_emergency_fund",
    when: (m) => m.essentialMonthlyExpenses > 0 && (m.emergencyFundMonths ?? 0) < 1,
    title: "Build a one-month emergency buffer",
    description:
      "Set aside one month of essential costs in an account you do not touch for anything else.",
    why: "One month of cover is the difference between an unexpected bill being an inconvenience and it becoming new debt.",
    pillar: "save",
    priority: "high",
    horizon: "short_term",
    adjust: (input, m) => ({
      ...input,
      emergencyFundAmount: Math.max(
        input.emergencyFundAmount,
        m.essentialMonthlyExpenses,
      ),
      totalSavings: Math.max(input.totalSavings, m.essentialMonthlyExpenses),
    }),
  },
  {
    key: "grow_emergency_fund_to_three",
    when: (m) => {
      const months = m.emergencyFundMonths;
      return m.essentialMonthlyExpenses > 0 && months !== null && months >= 1 && months < 3;
    },
    title: "Grow your emergency fund to three months",
    description:
      "Three months of essential costs is the point at which a job change or a health setback stops being a financial emergency.",
    why: "It is the single biggest lever on your Save score, which carries the most weight of the four pillars.",
    pillar: "save",
    priority: "high",
    horizon: "short_term",
    adjust: (input, m) => ({
      ...input,
      emergencyFundAmount: Math.max(
        input.emergencyFundAmount,
        m.essentialMonthlyExpenses * 3,
      ),
      totalSavings: Math.max(input.totalSavings, m.essentialMonthlyExpenses * 3),
    }),
  },
  {
    key: "complete_emergency_fund",
    when: (m) => {
      const months = m.emergencyFundMonths;
      return m.essentialMonthlyExpenses > 0 && months !== null && months >= 3 && months < 6;
    },
    title: "Take your emergency fund to six months",
    description:
      "You already have a real buffer. Six months of essentials completes it and frees you to take more risk elsewhere.",
    why: "A complete fund scores full marks on the heaviest component of the heaviest pillar.",
    pillar: "save",
    priority: "medium",
    horizon: "long_term",
    adjust: (input, m) => ({
      ...input,
      emergencyFundAmount: Math.max(
        input.emergencyFundAmount,
        m.essentialMonthlyExpenses * 6,
      ),
      totalSavings: Math.max(input.totalSavings, m.essentialMonthlyExpenses * 6),
    }),
  },
  {
    key: "start_saving",
    when: (m) => m.monthlyIncome > 0 && m.monthlySavings <= 0 && m.disposableIncome > 0,
    title: "Start saving something every month",
    description:
      "Move a fixed amount to savings the day you are paid, before the month has a chance to absorb it.",
    why: "You already finish the month with something left. Turning that into a standing transfer is the whole change.",
    pillar: "save",
    priority: "high",
    horizon: "immediate",
    adjust: (input, m) => ({
      ...input,
      monthlySavings: Math.min(m.disposableIncome, m.monthlyIncome * 0.05),
      savingsConsistency: "every_month",
    }),
  },
  {
    key: "increase_savings_rate",
    when: (m) => {
      const rate = m.savingsRate;
      return rate !== null && rate > 0 && rate < THRESHOLDS.savingsRateTarget;
    },
    title: "Push your savings rate towards 20%",
    description:
      "Raise your standing transfer by a set amount each time your income rises, so the increase never reaches your current account.",
    why: "Twenty percent is where the Save score reaches full marks, and where goals start arriving years rather than decades away.",
    pillar: "save",
    priority: "medium",
    horizon: "short_term",
    adjust: (input, m) => ({
      ...input,
      monthlySavings: Math.min(
        m.monthlyIncome * THRESHOLDS.savingsRateTarget,
        Math.max(m.monthlySavings + Math.max(m.disposableIncome, 0), m.monthlySavings),
      ),
    }),
  },
  {
    key: "automate_savings",
    when: (_m, _core, input) =>
      input.savingsConsistency !== null && input.savingsConsistency !== "every_month",
    title: "Make saving automatic rather than a monthly decision",
    description:
      "Set up a standing transfer for the day after payday so saving stops depending on what is left over.",
    why: "Consistency is a fifth of your Save score, and it is the cheapest part of it to fix.",
    pillar: "save",
    priority: "medium",
    horizon: "immediate",
    adjust: (input) => ({ ...input, savingsConsistency: "every_month" }),
  },
  {
    key: "clear_high_interest_debt",
    when: (m) => m.highInterestDebt > 0,
    title: "Deal with your high-interest debt first",
    description: `Direct every spare payment at balances charging ${THRESHOLDS.highInterestRate}% or more, paying only the minimum on everything else. Refinancing them below ${THRESHOLDS.highInterestRate}% has the same effect on your score.`,
    why: "Expensive debt compounds against you faster than almost any saving compounds for you.",
    pillar: "borrow",
    priority: "high",
    horizon: "short_term",
    adjust: (input) => ({ ...input, highInterestDebt: 0 }),
  },
  {
    key: "reduce_debt_payment_burden",
    when: (m) => (m.debtPaymentRatio ?? 0) > 0.36,
    title: "Bring your monthly repayments below a third of your income",
    description:
      "Talk to your largest lender about a longer term or a lower rate. A smaller monthly commitment buys back the room to save.",
    why: "Repayments this large leave nothing for savings, which is why the strain shows up in two pillars at once.",
    pillar: "borrow",
    priority: "high",
    horizon: "short_term",
    adjust: (input, m) => ({
      ...input,
      monthlyDebtPayments: Math.min(input.monthlyDebtPayments, m.monthlyIncome * 0.36),
    }),
  },
  {
    key: "reduce_total_debt",
    when: (m) => (m.debtToIncomeRatio ?? 0) > 0.4,
    title: "Reduce what you owe overall",
    description:
      "Set a target of cutting your total balance by a fifth over the next year, and put every windfall against it.",
    why: "Debt-to-income is the heaviest component of the Borrow pillar, and it only moves when the balance does.",
    pillar: "borrow",
    priority: "medium",
    horizon: "long_term",
    adjust: (input) => ({
      ...input,
      totalDebt: input.totalDebt * 0.8,
      highInterestDebt: Math.min(input.highInterestDebt, input.totalDebt * 0.8),
    }),
  },
  {
    key: "reduce_expense_ratio",
    when: (m) => (m.expenseRatio ?? 0) > 0.7,
    title: "Bring living costs below 70% of your income",
    description:
      "Take the two largest discretionary categories and set a hard monthly cap on each.",
    why: "The expense ratio is half of your Spend score, and it is the part you can act on this month.",
    pillar: "spend",
    priority: "medium",
    horizon: "short_term",
    adjust: (input, m) => ({
      ...input,
      monthlyExpenses: Math.min(input.monthlyExpenses, m.monthlyIncome * 0.7),
    }),
  },
  {
    key: "pay_bills_on_time",
    when: (_m, _core, input) =>
      input.billPayment !== null && input.billPayment !== "always",
    title: "Get every bill onto automatic payment",
    description:
      "Set up direct debits for the essentials, timed for the day after you are paid.",
    why: "Late payments cost you twice — in fees now, and in the rate you are offered later.",
    pillar: "spend",
    priority: "high",
    horizon: "immediate",
    adjust: (input) => ({ ...input, billPayment: "always" }),
  },
  {
    key: "set_clear_goals",
    when: (_m, _core, input) =>
      input.goals !== null && input.goals !== "clear_and_tracking",
    title: "Turn your intentions into goals with amounts and dates",
    description:
      "Add one goal here with a target amount and a target date, and let the progress bar do the tracking.",
    why: "Goals are the heaviest part of the Plan pillar, and the only part that also changes what you do day to day.",
    pillar: "plan",
    priority: "medium",
    horizon: "short_term",
    adjust: (input) => ({ ...input, goals: "clear_and_tracking" }),
  },
  {
    key: "close_protection_gap",
    when: (_m, _core, input) =>
      input.insuranceApplicable.length > 0 &&
      input.insuranceApplicable.some((t) => !input.insuranceCovered.includes(t)),
    title: "Close the gap in your insurance cover",
    description:
      "Get a quote for the cover you are missing. It is usually cheaper than people expect, and it protects everything else you have built.",
    why: "A single uninsured event can undo years of saving, which is why protection carries a quarter of the Plan pillar.",
    pillar: "plan",
    priority: "medium",
    horizon: "short_term",
    adjust: (input) => ({
      ...input,
      insuranceCovered: Array.from(new Set(input.insuranceApplicable)),
    }),
  },
  {
    key: "make_long_term_plan",
    when: (_m, _core, input) =>
      input.longTermPlanning !== null && input.longTermPlanning !== "detailed_plan",
    title: "Write down a long-term plan",
    description:
      "One page is enough: where you want to be in ten years, what it costs, and what you need to put aside each month to get there.",
    why: "Long-term planning is a quarter of the Plan pillar, and retirement is the goal that suffers most from being left implicit.",
    pillar: "plan",
    priority: "medium",
    horizon: "long_term",
    adjust: (input) => ({ ...input, longTermPlanning: "detailed_plan" }),
  },
  {
    key: "monthly_review",
    when: (_m, _core, input) =>
      input.reviewHabit !== null &&
      input.reviewHabit !== "weekly" &&
      input.reviewHabit !== "monthly",
    title: "Put a monthly money review in your calendar",
    description:
      "Twenty minutes a month is enough to catch a subscription you forgot and a bill that crept up.",
    why: "Reviewing monthly is what stops small drifts becoming the reason next year's score is lower.",
    pillar: "plan",
    priority: "low",
    horizon: "immediate",
    adjust: (input) => ({ ...input, reviewHabit: "monthly" }),
  },
];

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/**
 * Builds the prioritised recommendations for a scoring run.
 *
 * Each candidate that applies is measured by re-running the engine against an
 * adjusted input, so the "+4 points" a user sees is the number the engine
 * would actually produce if they made that change.
 */
export function generateRecommendations(
  input: ScoringInput,
  core: CoreResult,
): Recommendation[] {
  const applicable = CANDIDATES.filter((c) => c.when(core.metrics, core, input));

  const recommendations = applicable.map<Recommendation>((candidate) => {
    let estimatedImpact: number | null = null;

    if (candidate.adjust) {
      const adjusted = candidate.adjust(input, core.metrics);
      const projected = computeCore(adjusted);
      const delta = projected.overallScore - core.overallScore;
      estimatedImpact = delta > 0 ? round(delta, 0) : null;
    }

    return {
      key: candidate.key,
      title: candidate.title,
      description: candidate.description,
      why: candidate.why,
      pillar: candidate.pillar,
      priority: candidate.priority,
      horizon: candidate.horizon,
      estimatedImpact,
    };
  });

  return recommendations.sort((a, b) => {
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (byPriority !== 0) return byPriority;
    return (b.estimatedImpact ?? -1) - (a.estimatedImpact ?? -1);
  });
}

/**
 * Deterministic alerts (§35, §73).
 *
 * These are computed from the numbers, not written by a model, so the
 * important warnings still appear regardless of what else on the page is
 * switched off.
 */
export function generateAlerts(core: CoreResult): Alert[] {
  const m = core.metrics;
  const alerts: Alert[] = [];

  if (m.monthlyIncome > 0 && m.disposableIncome < 0) {
    alerts.push({
      key: "negative_disposable_income",
      severity: "critical",
      title: "Your expenses exceed your income",
      message:
        "Living costs and debt payments together come to more than you earn each month. This is the first thing to fix.",
      href: "/dashboard/spend",
    });
  }

  if (m.emergencyFundMonths !== null && m.emergencyFundMonths < 1) {
    alerts.push({
      key: "emergency_fund_below_one_month",
      severity: "warning",
      title: "Your emergency fund is under one month",
      message:
        "An unexpected bill would have to go on credit. A one-month buffer is the highest-value thing you can build next.",
      href: "/dashboard/save",
    });
  }

  if (m.savingsRate !== null && m.savingsRate > 0 && m.savingsRate < 0.05) {
    alerts.push({
      key: "low_savings_rate",
      severity: "info",
      title: "There is room to raise your savings rate",
      message: `You are saving ${round((m.savingsRate ?? 0) * 100, 1)}% of your income. Even reaching 10% would move your Save score noticeably.`,
      href: "/dashboard/save",
    });
  }

  if ((m.debtPaymentRatio ?? 0) > 0.4) {
    alerts.push({
      key: "high_debt_burden",
      severity: "critical",
      title: "Debt repayments are taking too much of your income",
      message: `${round((m.debtPaymentRatio ?? 0) * 100, 1)}% of your monthly income goes on repayments. Restructuring the largest balance is worth a conversation with your lender.`,
      href: "/dashboard/borrow",
    });
  }

  if (m.totalDebt > 0 && (m.highInterestDebtShare ?? 0) >= 0.5) {
    alerts.push({
      key: "high_interest_majority",
      severity: "warning",
      title: "Most of your debt is expensive",
      message: `More than half your balance is at ${THRESHOLDS.highInterestRate}% APR or above, so repayments are mostly servicing interest.`,
      href: "/dashboard/borrow",
    });
  }

  if (m.monthlyIncome > 0 && m.disposableIncome >= 0 && m.monthlySavings <= 0) {
    alerts.push({
      key: "surplus_not_saved",
      severity: "info",
      title: "You have a surplus that is not being saved",
      message:
        "You finish the month with money left over but nothing set aside. A standing transfer would turn that into progress.",
      href: "/dashboard/save",
    });
  }

  return alerts;
}

/** Strengths, areas to improve, and actions, drawn from the pillar results. */
export function generateInsights(core: CoreResult, recommendations: Recommendation[]) {
  const strengths: Insight[] = [];
  const improvements: Insight[] = [];

  for (const pillar of core.pillars) {
    for (const [i, text] of pillar.strengths.entries()) {
      strengths.push({
        key: `${pillar.key}_strength_${i}`,
        kind: "strength",
        title: text,
        detail: pillar.label,
        pillar: pillar.key,
        severity: "success",
      });
    }
    for (const [i, text] of pillar.weaknesses.entries()) {
      improvements.push({
        key: `${pillar.key}_weakness_${i}`,
        kind: "improvement",
        title: text,
        detail: pillar.label,
        pillar: pillar.key,
        severity: "warning",
      });
    }
  }

  const actions: Insight[] = recommendations.map((r) => ({
    key: `action_${r.key}`,
    kind: "action",
    title: r.title,
    detail: r.description,
    pillar: r.pillar,
    severity: r.priority === "high" ? "warning" : "info",
  }));

  return { strengths, improvements, actions };
}

export interface RoadmapStep {
  key: string;
  title: string;
  description: string;
  pillar: Recommendation["pillar"];
  priority: Priority;
  /** The overall score before this step. */
  from: number;
  /** The overall score after it, with every earlier step already applied. */
  to: number;
  gain: number;
}

export interface Roadmap {
  currentScore: number;
  projectedScore: number;
  targetScore: number;
  reachesTarget: boolean;
  steps: RoadmapStep[];
}

/**
 * The path to a better score (§30).
 *
 * Steps are applied cumulatively — each one's gain is measured against the
 * input with every earlier step already in place, so the numbers add up to the
 * projected total instead of double-counting overlapping changes. Every figure
 * comes from re-running the engine.
 */
export function buildRoadmap(
  input: ScoringInput,
  core: CoreResult,
  targetScore?: number,
): Roadmap {
  const target =
    targetScore ?? Math.min(core.overallScore + 10, 100);

  let working = input;
  let workingCore = core;
  const steps: RoadmapStep[] = [];
  const used = new Set<string>();

  // Greedy: at each stage take whichever remaining change is worth the most
  // right now. Recomputing after every step is what keeps the totals honest.
  for (let i = 0; i < 8; i += 1) {
    let best: { candidate: Candidate; next: ScoringInput; nextCore: CoreResult; gain: number } | null =
      null;

    for (const candidate of CANDIDATES) {
      if (used.has(candidate.key)) continue;
      if (!candidate.adjust) continue;
      if (!candidate.when(workingCore.metrics, workingCore, working)) continue;

      const next = candidate.adjust(working, workingCore.metrics);
      const nextCore = computeCore(next);
      const gain = nextCore.overallScore - workingCore.overallScore;

      if (gain > 0 && (!best || gain > best.gain)) {
        best = { candidate, next, nextCore, gain };
      }
    }

    if (!best) break;

    steps.push({
      key: best.candidate.key,
      title: best.candidate.title,
      description: best.candidate.description,
      pillar: best.candidate.pillar,
      priority: best.candidate.priority,
      from: workingCore.overallScore,
      to: best.nextCore.overallScore,
      gain: best.gain,
    });

    used.add(best.candidate.key);
    working = best.next;
    workingCore = best.nextCore;

    if (workingCore.overallScore >= target) break;
  }

  return {
    currentScore: core.overallScore,
    projectedScore: workingCore.overallScore,
    targetScore: target,
    reachesTarget: workingCore.overallScore >= target,
    steps,
  };
}
