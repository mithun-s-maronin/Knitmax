import { clamp, round } from "./helpers";
import {
  GOALS_SCORES,
  INSURANCE_LABELS,
  LONG_TERM_PLANNING_SCORES,
  PILLAR_DESCRIPTIONS,
  PILLAR_LABELS,
  PILLAR_WEIGHTS,
  PLAN_WEIGHTS,
  REVIEW_HABIT_SCORES,
  type InsuranceType,
} from "./scoreConfig";
import { getScoreStatus } from "./getScoreStatus";
import { combineComponents } from "./combine";
import type { ComponentResult, PillarResult, ScoringInput } from "./types";

/** Financial goals (§10.1). */
export function goalsScore(answer: keyof typeof GOALS_SCORES | null): number | null {
  if (answer === null) return null;
  return GOALS_SCORES[answer] ?? null;
}

/**
 * Insurance and protection (§10.2).
 *
 * Only the types that actually apply to someone are counted. A person with no
 * car and no property is not marked down for having no vehicle or property
 * cover — the denominator is what applies to them, not a fixed list of four.
 * When nothing applies the component is unmeasurable rather than zero.
 */
export function protectionScore(
  applicable: InsuranceType[],
  covered: InsuranceType[],
): number | null {
  const relevant = Array.from(new Set(applicable));
  if (relevant.length === 0) return null;
  const held = new Set(covered);
  const matched = relevant.filter((t) => held.has(t)).length;
  return clamp((matched / relevant.length) * 100, 0, 100);
}

/** Long-term planning (§10.3). */
export function longTermPlanningScore(
  answer: keyof typeof LONG_TERM_PLANNING_SCORES | null,
): number | null {
  if (answer === null) return null;
  return LONG_TERM_PLANNING_SCORES[answer] ?? null;
}

/** Financial review habits (§10.4). */
export function reviewHabitScore(
  answer: keyof typeof REVIEW_HABIT_SCORES | null,
): number | null {
  if (answer === null) return null;
  return REVIEW_HABIT_SCORES[answer] ?? null;
}

/**
 * Plan pillar (§10).
 *
 *   Goals 35% + protection 25% + long-term planning 25% + review habit 15%
 */
export function calculatePlanScore(input: ScoringInput): PillarResult {
  const goals = goalsScore(input.goals);
  const relevant = Array.from(new Set(input.insuranceApplicable));
  const held = new Set(input.insuranceCovered);
  const covered = relevant.filter((t) => held.has(t));
  const protection = protectionScore(input.insuranceApplicable, input.insuranceCovered);
  const longTerm = longTermPlanningScore(input.longTermPlanning);
  const review = reviewHabitScore(input.reviewHabit);

  const components: ComponentResult[] = [
    {
      key: "goals",
      label: "Financial goals",
      weight: PLAN_WEIGHTS.goals,
      effectiveWeight: 0,
      score: goals,
      status: goals === null ? "insufficientData" : "ok",
      contribution: null,
      metric: {
        label: "Clarity of your goals",
        value: goals,
        display:
          input.goals === null
            ? "Not answered"
            : {
                clear_and_tracking: "Clear goals, tracking progress",
                clear: "Clear goals",
                general: "General intentions only",
                none: "No clear goals",
              }[input.goals],
        target: "Clear goals with progress tracked",
      },
      explanation:
        goals === null
          ? "Not answered yet."
          : goals >= 100
            ? "You know what you are aiming at and you can see how far along you are."
            : goals >= 75
              ? "Your goals are clear; tracking progress against them is the missing half."
              : goals >= 50
                ? "You have intentions rather than targets, which makes progress hard to see."
                : "Without a target there is nothing for saving decisions to serve.",
    },
    {
      key: "protection",
      label: "Insurance and protection",
      weight: PLAN_WEIGHTS.protection,
      effectiveWeight: 0,
      score: protection,
      status: protection === null ? "insufficientData" : "ok",
      contribution: null,
      metric: {
        label: "Relevant cover you hold",
        value: protection === null ? null : round(protection / 100, 3),
        display:
          relevant.length === 0
            ? "No cover types selected"
            : `${covered.length} of ${relevant.length} (${relevant
                .map((t) => INSURANCE_LABELS[t])
                .join(", ")})`,
        target: "Every type that applies to you",
      },
      explanation:
        protection === null
          ? "Tell us which kinds of cover apply to you and we can measure this."
          : protection >= 100
            ? "Every kind of cover that applies to you is in place."
            : protection >= 50
              ? "Some of the cover you need is missing, which leaves a gap a single event could expose."
              : "Most of the protection relevant to you is missing.",
    },
    {
      key: "longTermPlanning",
      label: "Long-term planning",
      weight: PLAN_WEIGHTS.longTermPlanning,
      effectiveWeight: 0,
      score: longTerm,
      status: longTerm === null ? "insufficientData" : "ok",
      contribution: null,
      metric: {
        label: "Planning for the long term",
        value: longTerm,
        display:
          input.longTermPlanning === null
            ? "Not answered"
            : {
                detailed_plan: "Yes, a detailed plan",
                basic_plan: "Yes, a basic plan",
                thinking_about_it: "Thinking about it",
                no_plan: "No plan",
              }[input.longTermPlanning],
        target: "A detailed plan",
      },
      explanation:
        longTerm === null
          ? "Not answered yet."
          : longTerm >= 100
            ? "You have a worked-out view of your long-term finances."
            : longTerm >= 75
              ? "You have the outline of a long-term plan."
              : "Retirement and other long-horizon needs are not yet planned for.",
    },
    {
      key: "reviewHabit",
      label: "Financial review habit",
      weight: PLAN_WEIGHTS.reviewHabit,
      effectiveWeight: 0,
      score: review,
      status: review === null ? "insufficientData" : "ok",
      contribution: null,
      metric: {
        label: "How often you review your finances",
        value: review,
        display:
          input.reviewHabit === null
            ? "Not answered"
            : {
                weekly: "Weekly",
                monthly: "Monthly",
                every_few_months: "Every few months",
                rarely: "Rarely",
                never: "Never",
              }[input.reviewHabit],
        target: "At least monthly",
      },
      explanation:
        review === null
          ? "Not answered yet."
          : review >= 85
            ? "You look at your finances often enough to catch problems early."
            : review >= 60
              ? "You check in occasionally; monthly is where most people start noticing drift."
              : "Problems have time to grow before you see them.",
    },
  ];

  const { score, components: resolved } = combineComponents(components);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendedActions: string[] = [];

  if (goals !== null && goals >= 100) {
    strengths.push("You have clear goals and you track progress against them.");
  }
  if (protection !== null && protection >= 100) {
    strengths.push("You hold every kind of cover that applies to you.");
  }
  if (longTerm !== null && longTerm >= 75) {
    strengths.push("You are actively planning for the long term.");
  }
  if (review !== null && review >= 85) {
    strengths.push("You review your finances at least monthly.");
  }

  if (goals !== null && goals < 75) {
    weaknesses.push("Your goals are not specific enough to plan against.");
    recommendedActions.push(
      "Write down one goal with an amount and a date, and track it here.",
    );
  }
  if (protection !== null && protection < 100) {
    const missing = relevant.filter((t) => !held.has(t)).map((t) => INSURANCE_LABELS[t]);
    weaknesses.push(`You are missing cover for: ${missing.join(", ")}.`);
    recommendedActions.push(`Get a quote for ${missing[0]?.toLowerCase()} cover this month.`);
  }
  if (longTerm !== null && longTerm < 75) {
    weaknesses.push("There is no worked-out plan for the long term.");
    recommendedActions.push(
      "Sketch a one-page view of where you want to be in ten years and what it costs.",
    );
  }
  if (review !== null && review < 60) {
    weaknesses.push("You rarely review your finances.");
    recommendedActions.push("Put a 20-minute monthly review in your calendar.");
  }

  return {
    key: "plan",
    label: PILLAR_LABELS.plan,
    description: PILLAR_DESCRIPTIONS.plan,
    weight: PILLAR_WEIGHTS.plan,
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
