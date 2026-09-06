import "server-only";

import { formatCurrency, formatMonths, formatPercent } from "@/lib/format";
import type { StoredAssessmentResult } from "@/lib/scoring";
import type { DashboardInsight } from "@/components/dashboard/ai-insight-panel";

/**
 * Builds the dashboard insights from the stored score (§28, §73).
 *
 * Deterministic on purpose: these appear whether or not the AI assistant is
 * configured, and they can never disagree with the score, because they are
 * read from it.
 */
export function buildDashboardInsights(
  result: StoredAssessmentResult,
): DashboardInsight[] {
  const insights: DashboardInsight[] = [];
  const m = result.metrics;
  const currency = result.currency;

  // The weakest measured pillar is almost always the most useful thing to say.
  const weakest = [...result.pillars]
    .filter((p) => p.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];

  if (weakest && (weakest.score ?? 100) < 80) {
    const worstComponent = [...weakest.breakdown]
      .filter((c) => c.status === "ok" && c.score !== null)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];

    insights.push({
      key: "weakest_pillar",
      headline: `${weakest.label} is the pillar holding your score back, at ${weakest.score} out of 100.`,
      detail: worstComponent
        ? `${worstComponent.label} is the weakest part of it — your ${worstComponent.metric.label.toLowerCase()} is ${worstComponent.metric.display}${
            worstComponent.metric.target ? `, against a target of ${worstComponent.metric.target}` : ""
          }. It carries ${Math.round(worstComponent.effectiveWeight * 100)}% of this pillar, and ${weakest.label} is ${Math.round(weakest.weight * 100)}% of your overall score.`
        : weakest.description,
      prompt: `Why is my ${weakest.label} score ${weakest.score}, and what would improve it fastest?`,
    });
  }

  // The single most valuable next action, with the measured impact.
  const best = result.recommendations.find((r) => r.estimatedImpact !== null);
  if (best) {
    insights.push({
      key: "best_action",
      headline: `${best.title} — worth about ${best.estimatedImpact} points.`,
      detail: `${best.description} That figure comes from re-running the scoring engine with the change applied, not from an estimate.`,
      prompt: `Help me plan how to do this: ${best.title}`,
    });
  }

  // Something concrete about where the money actually goes.
  if (m.monthlyIncome > 0) {
    insights.push({
      key: "cash_shape",
      headline:
        m.disposableIncome < 0
          ? `You are spending ${formatCurrency(Math.abs(m.disposableIncome), currency)} more than you earn each month.`
          : `You finish each month with ${formatCurrency(m.disposableIncome, currency)} left over.`,
      detail:
        m.disposableIncome < 0
          ? `Living costs take ${formatPercent(m.expenseRatio, 0)} of your income and repayments take another ${formatPercent(m.debtPaymentRatio, 0)}. Closing this gap comes before anything else.`
          : `You save ${formatPercent(m.savingsRate, 1)} of your income and your emergency fund covers ${formatMonths(m.emergencyFundMonths)} of essential costs.`,
      prompt:
        m.disposableIncome < 0
          ? "My expenses exceed my income. Walk me through how to close the gap."
          : "Analyse my spending and tell me where the easiest savings are.",
    });
  }

  return insights.slice(0, 2);
}
