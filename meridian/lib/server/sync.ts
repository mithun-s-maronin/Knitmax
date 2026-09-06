import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { FinancialHealthResult } from "@/lib/scoring";

type Client = SupabaseClient<Database>;

/**
 * Brings the stored action plan into line with the current recommendations.
 *
 * Recommendations are keyed, so an action the user has already completed is
 * left alone rather than being resurrected on every recalculation, and one
 * that no longer applies is dismissed rather than deleted — the record of
 * having done it survives (§24, §50).
 */
export async function syncActionPlan(
  supabase: Client,
  userId: string,
  result: FinancialHealthResult,
  assessmentId: string | null,
): Promise<void> {
  const { data: existing } = await supabase
    .from("action_plans")
    .select("*")
    .eq("user_id", userId);

  const byKey = new Map(
    (existing ?? [])
      .filter((row) => row.recommendation_key)
      .map((row) => [row.recommendation_key as string, row]),
  );

  const currentKeys = new Set(result.recommendations.map((r) => r.key));

  const inserts = [];
  for (const recommendation of result.recommendations) {
    const current = byKey.get(recommendation.key);

    if (!current) {
      inserts.push({
        user_id: userId,
        assessment_id: assessmentId,
        recommendation_key: recommendation.key,
        title: recommendation.title,
        description: recommendation.description,
        rationale: recommendation.why,
        priority: recommendation.priority,
        category: recommendation.pillar,
        horizon: recommendation.horizon,
        impact_points: recommendation.estimatedImpact,
      });
      continue;
    }

    // A completed action stays completed. A dismissed one stays dismissed.
    if (current.status !== "pending") continue;

    await supabase
      .from("action_plans")
      .update({
        title: recommendation.title,
        description: recommendation.description,
        rationale: recommendation.why,
        priority: recommendation.priority,
        horizon: recommendation.horizon,
        impact_points: recommendation.estimatedImpact,
        assessment_id: assessmentId,
      })
      .eq("id", current.id);
  }

  if (inserts.length > 0) {
    await supabase.from("action_plans").insert(inserts);
  }

  // Anything still pending that the numbers no longer support is done with.
  const stale = (existing ?? []).filter(
    (row) =>
      row.status === "pending" &&
      row.recommendation_key &&
      !currentKeys.has(row.recommendation_key),
  );

  for (const row of stale) {
    await supabase.from("action_plans").update({ status: "dismissed" }).eq("id", row.id);
  }
}

/**
 * Writes the deterministic alerts as notifications.
 *
 * Each alert carries a dedupe key, and the unique index on (user_id,
 * dedupe_key) means re-running this on every page load cannot spam the bell.
 */
export async function syncAlerts(
  supabase: Client,
  userId: string,
  result: FinancialHealthResult,
  options: { enabled: boolean },
): Promise<void> {
  if (!options.enabled || result.alerts.length === 0) return;

  const today = new Date().toISOString().slice(0, 10);

  await supabase.from("notifications").upsert(
    result.alerts.map((alert) => ({
      user_id: userId,
      type: alert.severity === "info" ? ("opportunity" as const) : ("alert" as const),
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      href: alert.href ?? null,
      // Scoped to the day so a warning can reappear if it is still true
      // tomorrow, without repeating within a single session.
      dedupe_key: `${alert.key}:${today}`,
    })),
    { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
  );
}

interface MilestoneCandidate {
  key: string;
  title: string;
  description: string;
  earned: boolean;
}

/**
 * Awards milestones the user has newly reached (§65).
 *
 * The unique constraint on (user_id, key) makes this idempotent, so a
 * milestone is celebrated once and never again.
 */
export async function syncMilestones(
  supabase: Client,
  userId: string,
  result: FinancialHealthResult,
  context: { previousBestScore: number | null; isFirstAssessment: boolean },
): Promise<string[]> {
  const months = result.metrics.emergencyFundMonths ?? 0;
  const improvement =
    context.previousBestScore === null
      ? 0
      : result.overallScore - context.previousBestScore;

  const candidates: MilestoneCandidate[] = [
    {
      key: "first_assessment",
      title: "First assessment complete",
      description: "You have a baseline. Everything from here is measured against it.",
      earned: context.isFirstAssessment,
    },
    {
      key: "emergency_fund_1_month",
      title: "One month of cover",
      description: "Your emergency fund covers a month of essential costs.",
      earned: months >= 1,
    },
    {
      key: "emergency_fund_3_months",
      title: "Three months of cover",
      description: "A setback is no longer an emergency.",
      earned: months >= 3,
    },
    {
      key: "emergency_fund_6_months",
      title: "Six months of cover",
      description: "Your emergency fund is complete.",
      earned: months >= 6,
    },
    {
      key: "score_improved_10",
      title: "Ten points up",
      description: "Your score has improved by ten points or more.",
      earned: improvement >= 10,
    },
    {
      key: "debt_free",
      title: "Debt free",
      description: "You owe nothing at all.",
      earned: result.metrics.totalDebt === 0 && !context.isFirstAssessment,
    },
    {
      key: "savings_rate_20",
      title: "Saving a fifth",
      description: "You are saving 20% or more of your income.",
      earned: (result.metrics.savingsRate ?? 0) >= 0.2,
    },
  ];

  const earned = candidates.filter((c) => c.earned);
  if (earned.length === 0) return [];

  const { data: inserted } = await supabase
    .from("milestones")
    .upsert(
      earned.map((m) => ({
        user_id: userId,
        key: m.key,
        title: m.title,
        description: m.description,
      })),
      { onConflict: "user_id,key", ignoreDuplicates: true },
    )
    .select("key, title, description");

  if (inserted && inserted.length > 0) {
    await supabase.from("notifications").upsert(
      inserted.map((m) => ({
        user_id: userId,
        type: "milestone" as const,
        severity: "success" as const,
        title: m.title,
        message: m.description,
        href: "/dashboard",
        dedupe_key: `milestone:${m.key}`,
      })),
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
    );
  }

  return (inserted ?? []).map((m) => m.key);
}

/** Records where net worth stands, at most once a day. */
export async function recordNetWorthSnapshot(
  supabase: Client,
  userId: string,
  breakdown: { totalAssets: number; totalLiabilities: number; netWorth: number },
): Promise<void> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { data: today } = await supabase
    .from("net_worth_snapshots")
    .select("id")
    .eq("user_id", userId)
    .gte("recorded_at", since.toISOString())
    .limit(1)
    .maybeSingle();

  if (today) return;

  await supabase.from("net_worth_snapshots").insert({
    user_id: userId,
    total_assets: breakdown.totalAssets,
    total_liabilities: breakdown.totalLiabilities,
    net_worth: breakdown.netWorth,
  });
}
