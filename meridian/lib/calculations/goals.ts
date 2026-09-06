import type { FinancialGoalRow } from "@/types/database";

export interface GoalProgress {
  /** 0-1. */
  progress: number;
  remaining: number;
  /** Contribution needed each month to hit the target date, or null. */
  requiredMonthlyContribution: number | null;
  monthsRemaining: number | null;
  /** When the goal would complete at its current pace, or null. */
  projectedCompletion: Date | null;
  isComplete: boolean;
  isOverdue: boolean;
}

const MS_PER_DAY = 86_400_000;

/** Whole months between two dates, never negative. */
export function monthsBetween(from: Date, to: Date): number {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) +
    (to.getDate() >= from.getDate() ? 0 : -1);
  return Math.max(months, 0);
}

/**
 * Progress on a goal, and what it would take to finish it.
 *
 * `requiredMonthlyContribution` answers "what do I need to put aside";
 * `projectedCompletion` answers "when does this land at my current pace".
 * Both return null rather than a guess when the inputs cannot support them.
 */
export function calculateGoalProgress(
  goal: Pick<
    FinancialGoalRow,
    "target_amount" | "current_amount" | "target_date" | "status"
  >,
  monthlyContribution = 0,
  now: Date = new Date(),
): GoalProgress {
  const target = Number(goal.target_amount) || 0;
  const current = Number(goal.current_amount) || 0;
  const remaining = Math.max(target - current, 0);
  const progress = target > 0 ? Math.min(current / target, 1) : 0;
  const isComplete = goal.status === "completed" || remaining <= 0;

  const targetDate = goal.target_date ? new Date(goal.target_date) : null;
  const validTarget =
    targetDate && !Number.isNaN(targetDate.getTime()) ? targetDate : null;

  const monthsRemaining = validTarget ? monthsBetween(now, validTarget) : null;

  const requiredMonthlyContribution =
    !isComplete && monthsRemaining !== null && monthsRemaining > 0
      ? remaining / monthsRemaining
      : !isComplete && monthsRemaining === 0
        ? remaining
        : null;

  let projectedCompletion: Date | null = null;
  if (!isComplete && monthlyContribution > 0) {
    const months = Math.ceil(remaining / monthlyContribution);
    projectedCompletion = new Date(now);
    projectedCompletion.setMonth(projectedCompletion.getMonth() + months);
  }

  return {
    progress,
    remaining,
    requiredMonthlyContribution,
    monthsRemaining,
    projectedCompletion,
    isComplete,
    isOverdue:
      !isComplete && validTarget !== null && validTarget.getTime() < now.getTime() - MS_PER_DAY,
  };
}

/** Emergency fund target: essential monthly costs times the months wanted (§36). */
export function emergencyFundTarget(
  essentialMonthlyExpenses: number,
  targetMonths: number,
): { target: number; monthsToTarget: (monthlySaving: number) => number | null } {
  const target = Math.max(essentialMonthlyExpenses, 0) * Math.max(targetMonths, 0);

  return {
    target,
    monthsToTarget: (monthlySaving: number) => {
      if (monthlySaving <= 0) return null;
      return Math.ceil(target / monthlySaving);
    },
  };
}
