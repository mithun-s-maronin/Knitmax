import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getFinancialSnapshot } from "@/lib/data/records";
import { calculateGoalProgress } from "@/lib/calculations/goals";
import { readStoredResult } from "@/lib/scoring";
import { formatCurrency, formatMonths, formatPercent } from "@/lib/format";
import type { ScoringInput } from "@/lib/scoring";

export interface FinancialContext {
  /** True when the user allows the assistant to see their finances. */
  permitted: boolean;
  /** The rendered context block, empty when not permitted. */
  text: string;
  /** The live scoring input, for the simulation tool. Null when not permitted. */
  scoringInput: ScoringInput | null;
  currency: string;
}

/**
 * Builds the assistant's view of one user's finances — on the server, from the
 * database, for the authenticated user only.
 *
 * Two properties matter here. The client never supplies any of this, so a
 * crafted request cannot make the assistant reason about someone else's
 * numbers or invented ones (§69). And when the user has turned off the AI data
 * permission, this returns nothing personal at all: the assistant is not asked
 * to ignore the data, it simply never receives it (§70).
 */
export async function buildFinancialContext(
  userId: string,
): Promise<FinancialContext> {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("ai_data_permission")
    .eq("user_id", userId)
    .maybeSingle();

  if (settings?.ai_data_permission === false) {
    return { permitted: false, text: "", scoringInput: null, currency: "USD" };
  }

  const snapshot = await getFinancialSnapshot(userId);
  const currency = snapshot.currency;
  const money = (value: number) => formatCurrency(value, currency);

  const stored = snapshot.latestAssessment
    ? readStoredResult(snapshot.latestAssessment)
    : null;

  const lines: string[] = [];

  lines.push("<financial_context>");
  lines.push(
    "These are the user's real, stored figures. Every number in this block came from the deterministic scoring engine or the user's own records. Quote them; do not recompute them and do not invent any others.",
  );

  if (stored) {
    lines.push("");
    lines.push("## Official score (from the scoring engine)");
    lines.push(`Assessed: ${stored.completedAt}`);
    lines.push(`Scoring version: ${stored.scoringVersion}`);
    lines.push(
      `Overall: ${stored.overallScore}/100 (${stored.overallStatus.label})`,
    );
    for (const pillar of stored.pillars) {
      lines.push(
        `${pillar.label}: ${pillar.score ?? "not measured"}/100, weight ${Math.round(pillar.weight * 100)}%`,
      );
      for (const component of pillar.breakdown) {
        lines.push(
          `  - ${component.label}: ${
            component.status === "ok"
              ? `${Math.round(component.score ?? 0)}/100`
              : "insufficient data"
          }; measured ${component.metric.label.toLowerCase()} = ${component.metric.display}${
            component.metric.target ? `; target ${component.metric.target}` : ""
          }; weight within pillar ${Math.round(component.effectiveWeight * 100)}%`,
        );
      }
    }
  } else {
    lines.push("");
    lines.push(
      "## Official score\nThe user has not completed an assessment yet, so there is no score. Encourage them to take one; do not estimate a score for them.",
    );
  }

  const m = snapshot.liveResult.metrics;
  lines.push("");
  lines.push("## Current figures (from their records)");
  lines.push(`Currency: ${currency}`);
  lines.push(`Monthly income: ${money(m.monthlyIncome)}`);
  lines.push(
    `Monthly living costs: ${money(m.monthlyExpenses)} (essential ${money(m.essentialMonthlyExpenses)})`,
  );
  lines.push(`Monthly debt repayments: ${money(m.monthlyDebtPayments)}`);
  lines.push(`Left over each month: ${money(m.disposableIncome)}`);
  lines.push(`Monthly savings: ${money(m.monthlySavings)}`);
  lines.push(`Savings rate: ${formatPercent(m.savingsRate, 1)}`);
  lines.push(`Total savings: ${money(m.totalSavings)}`);
  lines.push(
    `Emergency fund: ${money(m.emergencyFundAmount)} = ${formatMonths(m.emergencyFundMonths)} of essential costs`,
  );
  lines.push(`Total debt: ${money(m.totalDebt)}`);
  lines.push(`High-interest debt (12% APR or above): ${money(m.highInterestDebt)}`);
  lines.push(`Debt-to-income: ${formatPercent(m.debtToIncomeRatio, 1)}`);
  lines.push(`Debt payments as a share of income: ${formatPercent(m.debtPaymentRatio, 1)}`);
  lines.push(
    `Net worth: ${money(snapshot.netWorth.netWorth)} (assets ${money(snapshot.netWorth.totalAssets)}, liabilities ${money(snapshot.netWorth.totalLiabilities)})`,
  );

  if (snapshot.debts.length > 0) {
    lines.push("");
    lines.push("## Debts");
    for (const debt of snapshot.debts) {
      lines.push(
        `- ${debt.name}: ${money(Number(debt.balance))} at ${Number(debt.interest_rate).toFixed(2)}% APR, paying ${money(Number(debt.monthly_payment))} a month`,
      );
    }
  }

  const activeGoals = snapshot.goals.filter((g) => g.status === "active");
  if (activeGoals.length > 0) {
    lines.push("");
    lines.push("## Goals");
    for (const goal of activeGoals) {
      const progress = calculateGoalProgress(goal, snapshot.totals.monthlySavings);
      lines.push(
        `- ${goal.name}: ${money(Number(goal.current_amount))} of ${money(Number(goal.target_amount))} (${formatPercent(progress.progress)})${
          goal.target_date ? `, target ${goal.target_date}` : ""
        }${
          progress.requiredMonthlyContribution !== null
            ? `, needs ${money(progress.requiredMonthlyContribution)}/month to land on time`
            : ""
        }`,
      );
    }
  }

  if (snapshot.scoreHistory.length > 1) {
    lines.push("");
    lines.push("## Recent score history");
    for (const row of snapshot.scoreHistory.slice(-6)) {
      lines.push(`- ${row.recorded_at.slice(0, 10)}: ${row.overall_score}`);
    }
  }

  const pendingActions = snapshot.actionPlans.filter((a) => a.status === "pending");
  if (pendingActions.length > 0) {
    lines.push("");
    lines.push("## Outstanding actions in their plan");
    for (const action of pendingActions.slice(0, 8)) {
      lines.push(
        `- [${action.priority}] ${action.title}${
          action.impact_points !== null
            ? ` (worth ${Math.round(Number(action.impact_points))} points, measured)`
            : ""
        }`,
      );
    }
  }

  lines.push("</financial_context>");

  return {
    permitted: true,
    text: lines.join("\n"),
    scoringInput: snapshot.liveInput,
    currency,
  };
}
