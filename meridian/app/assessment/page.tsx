import type { Metadata } from "next";

import { AssessmentFlow } from "@/components/assessment/assessment-flow";
import { requireSessionContext } from "@/lib/auth";
import { getDraft } from "@/lib/data/assessments";
import { createClient } from "@/lib/supabase/server";
import type { AnswerMap } from "@/lib/assessment/questions";

export const metadata: Metadata = {
  title: "Your assessment",
  description: "Six short sections. Your answers save as you go.",
};

export default async function AssessmentPage() {
  const { user, profile } = await requireSessionContext("/assessment");
  const draft = await getDraft(user.id);

  // Pre-fill the parts we already know, so a returning user is not asked
  // twice for the same thing.
  const supabase = await createClient();
  const { data: financialProfile } = await supabase
    .from("financial_profiles")
    .select("age_range, employment_status, dependents")
    .eq("user_id", user.id)
    .maybeSingle();

  const seeded: AnswerMap = {
    currency: profile?.currency ?? "USD",
    age_range: financialProfile?.age_range ?? null,
    employment_status: financialProfile?.employment_status ?? null,
    dependents: financialProfile?.dependents ?? 0,
  };

  const draftAnswers = (draft?.answers ?? {}) as AnswerMap;
  const initialAnswers: AnswerMap = { ...seeded, ...draftAnswers };

  return (
    <AssessmentFlow
      initialAnswers={initialAnswers}
      initialStep={draft?.current_step ?? 0}
      initialRevision={draft?.client_revision ?? 0}
      hasServerDraft={Boolean(draft)}
    />
  );
}
