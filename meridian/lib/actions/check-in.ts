"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFinancialSnapshot } from "@/lib/data/records";
import { planScenarioChanges } from "@/lib/calculations/scenario";
import { calculateNetWorth } from "@/lib/calculations/netWorth";
import { buildScoringInput, qualitativeFromSnapshot } from "@/lib/calculations/fromRecords";
import {
  ASSESSMENT_VERSION,
  SCORING_VERSION,
  scoreFinancialHealth,
} from "@/lib/scoring";
import {
  recordNetWorthSnapshot,
  syncActionPlan,
  syncAlerts,
  syncMilestones,
} from "@/lib/server/sync";
import { toJson } from "@/lib/utils";

const checkInSchema = z.object({
  monthlyIncome: z.coerce.number().min(0).max(1e12),
  monthlyExpenses: z.coerce.number().min(0).max(1e12),
  monthlySavings: z.coerce.number().min(0).max(1e12),
  emergencyFund: z.coerce.number().min(0).max(1e12),
  notes: z.string().trim().max(2000).optional(),
  recordAssessment: z.boolean().default(true),
});

export interface CheckInResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * The monthly check-in (§34).
 *
 * It updates the live records and, if asked, records a new assessment from
 * them. It never edits a previous assessment — a check-in adds a point to the
 * history, it does not move an existing one.
 */
export async function submitCheckIn(input: unknown): Promise<CheckInResult> {
  const user = await requireUser("/dashboard/check-in");

  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    }
    return { ok: false, error: "Check those figures.", fieldErrors };
  }

  const snapshot = await getFinancialSnapshot(user.id);
  const supabase = await createClient();
  const totals = snapshot.totals;

  // The form collects absolute figures; the planner works in deltas.
  const adjustments = {
    monthlyIncomeChange: parsed.data.monthlyIncome - totals.monthlyIncome,
    monthlyExpensesChange: parsed.data.monthlyExpenses - totals.monthlyExpenses,
    monthlySavingsChange: parsed.data.monthlySavings - totals.monthlySavings,
    extraDebtPayment: 0,
    emergencyFundChange: parsed.data.emergencyFund - totals.emergencyFundAmount,
  };

  const changes = planScenarioChanges(
    {
      incomeSources: snapshot.incomeSources,
      expenses: snapshot.expenses,
      savingsAccounts: snapshot.savingsAccounts,
      debts: snapshot.debts,
    },
    adjustments,
  );

  for (const change of changes) {
    if (change.id) {
      await supabase
        .from(change.table)
        // Table and field both come from the planner's closed list; RLS
        // confines the write to this user either way.
        .update({ [change.field]: change.to } as never)
        .eq("id", change.id)
        .eq("user_id", user.id);
      continue;
    }

    if (change.table === "income_sources") {
      await supabase.from("income_sources").insert({
        user_id: user.id,
        name: change.recordName,
        type: "secondary",
        amount: change.to,
        frequency: "monthly",
        notes: "Added during a monthly check-in.",
      });
    }

    if (change.table === "savings_accounts") {
      await supabase.from("savings_accounts").insert({
        user_id: user.id,
        name: change.recordName,
        type: "emergency_fund",
        is_emergency_fund: true,
        balance: change.field === "balance" ? change.to : 0,
        monthly_contribution: change.field === "monthly_contribution" ? change.to : 0,
        notes: "Added during a monthly check-in.",
      });
    }
  }

  // The first of the current month, so there is one check-in per period.
  const period = new Date();
  period.setDate(1);
  const periodKey = period.toISOString().slice(0, 10);

  let assessmentId: string | null = null;

  if (parsed.data.recordAssessment) {
    // Re-read the records rather than reusing the request-cached snapshot,
    // which still holds the pre-update figures.
    const [income, expenses, savings, debts] = await Promise.all([
      supabase.from("income_sources").select("*").eq("user_id", user.id),
      supabase.from("expenses").select("*").eq("user_id", user.id),
      supabase.from("savings_accounts").select("*").eq("user_id", user.id),
      supabase.from("debts").select("*").eq("user_id", user.id),
    ]);

    const scoringInput = buildScoringInput(
      {
        currency: snapshot.currency,
        incomeSources: income.data ?? [],
        expenses: expenses.data ?? [],
        savingsAccounts: savings.data ?? [],
        debts: debts.data ?? [],
      },
      qualitativeFromSnapshot(snapshot.latestAssessment?.input_snapshot),
    );

    const result = scoreFinancialHealth(scoringInput);

    const { data: assessment } = await supabase
      .from("assessments")
      .insert({
        user_id: user.id,
        assessment_version: ASSESSMENT_VERSION,
        scoring_version: SCORING_VERSION,
        source: "check_in",
        currency: snapshot.currency,
        overall_score: result.overallScore,
        spend_score: result.spend.score,
        save_score: result.save.score,
        borrow_score: result.borrow.score,
        plan_score: result.plan.score,
        breakdown: toJson({
          scoringVersion: result.scoringVersion,
          overallScore: result.overallScore,
          measuredWeight: result.measuredWeight,
          hasInsufficientData: result.hasInsufficientData,
          metrics: result.metrics,
          pillars: result.pillars.map((pillar) => ({
            key: pillar.key,
            label: pillar.label,
            score: pillar.score,
            weight: pillar.weight,
            effectiveWeight: pillar.effectiveWeight,
            insufficientData: pillar.insufficientData,
            strengths: pillar.strengths,
            weaknesses: pillar.weaknesses,
            recommendedActions: pillar.recommendedActions,
            components: pillar.breakdown,
          })),
          recommendations: result.recommendations,
          alerts: result.alerts,
        }),
        input_snapshot: toJson(scoringInput),
      })
      .select("id")
      .single();

    if (assessment) {
      assessmentId = assessment.id;

      await supabase.from("score_history").insert({
        user_id: user.id,
        assessment_id: assessment.id,
        overall_score: result.overallScore,
        spend_score: result.spend.score,
        save_score: result.save.score,
        borrow_score: result.borrow.score,
        plan_score: result.plan.score,
      });

      const { data: settings } = await supabase
        .from("user_settings")
        .select("notifications_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      await syncActionPlan(supabase, user.id, result, assessment.id);
      await syncAlerts(supabase, user.id, result, {
        enabled: settings?.notifications_enabled ?? true,
      });
      await syncMilestones(supabase, user.id, result, {
        previousBestScore: snapshot.latestAssessment?.overall_score ?? null,
        isFirstAssessment: !snapshot.latestAssessment,
      });
    }

    await recordNetWorthSnapshot(
      supabase,
      user.id,
      calculateNetWorth({
        savingsAccounts: savings.data ?? [],
        debts: debts.data ?? [],
        assets: snapshot.assets,
        liabilities: snapshot.liabilities,
      }),
    );
  }

  await supabase.from("check_ins").upsert(
    {
      user_id: user.id,
      period: periodKey,
      notes: parsed.data.notes ?? null,
      assessment_id: assessmentId,
      changes: toJson({
        before: {
          monthlyIncome: totals.monthlyIncome,
          monthlyExpenses: totals.monthlyExpenses,
          monthlySavings: totals.monthlySavings,
          emergencyFund: totals.emergencyFundAmount,
        },
        after: {
          monthlyIncome: parsed.data.monthlyIncome,
          monthlyExpenses: parsed.data.monthlyExpenses,
          monthlySavings: parsed.data.monthlySavings,
          emergencyFund: parsed.data.emergencyFund,
        },
        records: changes,
      }),
    },
    { onConflict: "user_id,period" },
  );

  revalidatePath("/dashboard", "layout");

  if (assessmentId) redirect(`/results/${assessmentId}`);
  redirect("/dashboard?checked_in=1");
}
