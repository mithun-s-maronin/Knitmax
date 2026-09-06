"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ASSESSMENT_VERSION,
  SCORING_VERSION,
  scoreFinancialHealth,
  type FinancialHealthResult,
  type ScoringInput,
} from "@/lib/scoring";
import {
  answersForStorage,
  answersToScoringInput,
} from "@/lib/assessment/toScoringInput";
import {
  draftSchema,
  submissionSchema,
  validateAllSections,
} from "@/lib/assessment/schema";
import type { AnswerMap } from "@/lib/assessment/questions";
import {
  recordNetWorthSnapshot,
  syncActionPlan,
  syncAlerts,
  syncMilestones,
} from "@/lib/server/sync";
import { toJson } from "@/lib/utils";
import type { AgeRange, EmploymentStatus } from "@/types/database";

export interface AssessmentActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  savedAt?: string;
  revision?: number;
}

/**
 * Saves the in-progress draft.
 *
 * `clientRevision` is a monotonic counter the client bumps on every change.
 * The server keeps the highest it has seen, so a slow request that lands out
 * of order cannot overwrite newer answers with older ones (§74).
 */
export async function saveDraft(payload: unknown): Promise<AssessmentActionState> {
  const user = await requireUser("/assessment");

  const parsed = draftSchema.safeParse(payload);
  if (!parsed.success) return { error: "That draft could not be saved." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("assessment_drafts")
    .select("client_revision")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing && existing.client_revision > parsed.data.clientRevision) {
    return {
      error: "A newer version of this draft is already saved.",
      revision: existing.client_revision,
    };
  }

  const { error } = await supabase.from("assessment_drafts").upsert(
    {
      user_id: user.id,
      assessment_version: ASSESSMENT_VERSION,
      answers: toJson(parsed.data.answers),
      current_step: parsed.data.currentStep,
      client_revision: parsed.data.clientRevision,
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: "We could not save your progress just now." };

  return { savedAt: new Date().toISOString(), revision: parsed.data.clientRevision };
}

export async function discardDraft(): Promise<void> {
  const user = await requireUser("/assessment");
  const supabase = await createClient();
  await supabase.from("assessment_drafts").delete().eq("user_id", user.id);
  revalidatePath("/assessment");
}

/**
 * Records a completed assessment.
 *
 * Everything the score depends on is written together: the assessment row with
 * its full component breakdown and the exact input it was scored from, every
 * answer, the score history point, the refreshed action plan, alerts and
 * milestones. The stored row is then immutable — a later formula change
 * cannot alter it, and this row is what history and reports read (§12, §76).
 */
export async function submitAssessment(payload: unknown): Promise<AssessmentActionState> {
  const user = await requireUser("/assessment");

  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Some of those answers did not look right. Please check them." };
  }

  const answers = parsed.data.answers as AnswerMap;

  // The same rules the client applied, applied again here. A hand-crafted
  // request cannot skip a required question or slip past a contradiction.
  const errors = validateAllSections(answers);
  if (Object.keys(errors).length > 0) {
    return { fieldErrors: errors, error: "Some answers still need attention." };
  }

  const input = answersToScoringInput(answers);
  const result = scoreFinancialHealth(input);

  const supabase = await createClient();

  const { data: previous } = await supabase
    .from("assessments")
    .select("id, overall_score")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .insert({
      user_id: user.id,
      assessment_version: ASSESSMENT_VERSION,
      scoring_version: SCORING_VERSION,
      source: "assessment",
      currency: input.currency,
      overall_score: result.overallScore,
      spend_score: result.spend.score,
      save_score: result.save.score,
      borrow_score: result.borrow.score,
      plan_score: result.plan.score,
      breakdown: toJson(buildBreakdown(result)),
      input_snapshot: toJson(input),
    })
    .select("id")
    .single();

  if (assessmentError || !assessment) {
    return { error: "We could not save your assessment. Please try again." };
  }

  const storedAnswers = answersForStorage(answers);
  if (storedAnswers.length > 0) {
    await supabase.from("assessment_answers").insert(
      storedAnswers.map((a) => ({
        assessment_id: assessment.id,
        user_id: user.id,
        section: a.section,
        question_id: a.question_id,
        question: a.question,
        answer: a.answer,
        answer_value: toJson(a.answer_value),
      })),
    );
  }

  await supabase.from("score_history").insert({
    user_id: user.id,
    assessment_id: assessment.id,
    overall_score: result.overallScore,
    spend_score: result.spend.score,
    save_score: result.save.score,
    borrow_score: result.borrow.score,
    plan_score: result.plan.score,
  });

  await applyProfileAnswers(supabase, user.id, answers);

  // A first assessment leaves the user with a dashboard and no records to
  // explore. Seed the ledger from what they just told us — clearly labelled,
  // and only when there is nothing there to overwrite.
  await seedRecordsIfEmpty(supabase, user.id, input);

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
    previousBestScore: previous?.overall_score ?? null,
    isFirstAssessment: !previous,
  });

  await supabase.from("assessment_drafts").delete().eq("user_id", user.id);

  revalidatePath("/dashboard", "layout");
  revalidatePath("/assessment");
  redirect(`/results/${assessment.id}`);
}

/** The full audit trail of one scoring run, for the transparency panel (§77, §78). */
function buildBreakdown(result: FinancialHealthResult) {
  return {
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
      components: pillar.breakdown.map((c) => ({
        key: c.key,
        label: c.label,
        weight: c.weight,
        effectiveWeight: c.effectiveWeight,
        score: c.score,
        status: c.status,
        contribution: c.contribution,
        metric: c.metric,
        explanation: c.explanation,
      })),
    })),
    recommendations: result.recommendations,
    alerts: result.alerts,
  };
}

type Client = Awaited<ReturnType<typeof createClient>>;

/** Copies the profile answers onto the profile rows. */
async function applyProfileAnswers(
  supabase: Client,
  userId: string,
  answers: AnswerMap,
): Promise<void> {
  const currency = typeof answers.currency === "string" ? answers.currency : null;
  if (currency) {
    await supabase.from("profiles").update({ currency }).eq("id", userId);
  }

  const dependents =
    typeof answers.dependents === "number"
      ? answers.dependents
      : Number(answers.dependents) || 0;

  await supabase
    .from("financial_profiles")
    .update({
      age_range: (answers.age_range as AgeRange) ?? null,
      employment_status: (answers.employment_status as EmploymentStatus) ?? null,
      dependents: Math.min(Math.max(Math.round(dependents), 0), 30),
    })
    .eq("user_id", userId);
}

/**
 * Seeds the financial records from an assessment, but only into empty tables.
 *
 * Each row says where it came from, so nothing looks like a figure the user
 * entered themselves, and every one of them is editable and deletable.
 */
async function seedRecordsIfEmpty(
  supabase: Client,
  userId: string,
  input: ScoringInput,
): Promise<void> {
  const FROM_ASSESSMENT = "Created from your assessment — edit or replace with your real figures.";

  const [income, expenses, savings, debts] = await Promise.all([
    supabase.from("income_sources").select("id").eq("user_id", userId).limit(1),
    supabase.from("expenses").select("id").eq("user_id", userId).limit(1),
    supabase.from("savings_accounts").select("id").eq("user_id", userId).limit(1),
    supabase.from("debts").select("id").eq("user_id", userId).limit(1),
  ]);

  if ((income.data?.length ?? 0) === 0 && input.monthlyIncome > 0) {
    await supabase.from("income_sources").insert({
      user_id: userId,
      name: "Monthly income",
      type: "primary",
      amount: input.monthlyIncome,
      frequency: "monthly",
      notes: FROM_ASSESSMENT,
    });
  }

  if ((expenses.data?.length ?? 0) === 0 && input.monthlyExpenses > 0) {
    const discretionary = Math.max(
      input.monthlyExpenses - input.essentialMonthlyExpenses,
      0,
    );
    const rows = [];
    if (input.essentialMonthlyExpenses > 0) {
      rows.push({
        user_id: userId,
        name: "Essential living costs",
        category: "housing" as const,
        amount: input.essentialMonthlyExpenses,
        frequency: "monthly" as const,
        is_essential: true,
        notes: FROM_ASSESSMENT,
      });
    }
    if (discretionary > 0) {
      rows.push({
        user_id: userId,
        name: "Other spending",
        category: "other" as const,
        amount: discretionary,
        frequency: "monthly" as const,
        is_essential: false,
        notes: FROM_ASSESSMENT,
      });
    }
    if (rows.length > 0) await supabase.from("expenses").insert(rows);
  }

  if ((savings.data?.length ?? 0) === 0 && input.totalSavings > 0) {
    const other = Math.max(input.totalSavings - input.emergencyFundAmount, 0);
    const rows = [];
    if (input.emergencyFundAmount > 0) {
      rows.push({
        user_id: userId,
        name: "Emergency fund",
        type: "emergency_fund" as const,
        balance: input.emergencyFundAmount,
        monthly_contribution: input.monthlySavings,
        is_emergency_fund: true,
        notes: FROM_ASSESSMENT,
      });
    }
    if (other > 0) {
      rows.push({
        user_id: userId,
        name: "Other savings",
        type: "general_savings" as const,
        balance: other,
        monthly_contribution: input.emergencyFundAmount > 0 ? 0 : input.monthlySavings,
        is_emergency_fund: false,
        notes: FROM_ASSESSMENT,
      });
    }
    if (rows.length > 0) await supabase.from("savings_accounts").insert(rows);
  }

  if ((debts.data?.length ?? 0) === 0 && input.totalDebt > 0) {
    const cheap = Math.max(input.totalDebt - input.highInterestDebt, 0);
    const share = input.totalDebt > 0 ? input.highInterestDebt / input.totalDebt : 0;
    const rows = [];

    if (input.highInterestDebt > 0) {
      rows.push({
        user_id: userId,
        name: "High-interest debt",
        type: "credit_card" as const,
        balance: input.highInterestDebt,
        // The threshold rate, which is the least the answer can imply. The
        // note asks for the real one.
        interest_rate: 12,
        monthly_payment: Math.round(input.monthlyDebtPayments * share * 100) / 100,
        notes: `${FROM_ASSESSMENT} Set the actual interest rate to get an accurate payoff plan.`,
      });
    }
    if (cheap > 0) {
      rows.push({
        user_id: userId,
        name: "Other debt",
        type: "other" as const,
        balance: cheap,
        interest_rate: 0,
        monthly_payment:
          Math.round(input.monthlyDebtPayments * (1 - share) * 100) / 100,
        notes: `${FROM_ASSESSMENT} Set the actual interest rate to get an accurate payoff plan.`,
      });
    }
    if (rows.length > 0) await supabase.from("debts").insert(rows);
  }

  await recordNetWorthSnapshot(supabase, userId, {
    totalAssets: input.totalSavings,
    totalLiabilities: input.totalDebt,
    netWorth: input.totalSavings - input.totalDebt,
  });
}
