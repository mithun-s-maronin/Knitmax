import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type {
  AssessmentAnswerRow,
  AssessmentDraftRow,
  AssessmentRow,
  ScoreHistoryRow,
} from "@/types/database";

export const getAssessments = cache(
  async (userId: string, limit = 50): Promise<AssessmentRow[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("assessments")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },
);

export const getAssessment = cache(
  async (
    userId: string,
    assessmentId: string,
  ): Promise<{ assessment: AssessmentRow; answers: AssessmentAnswerRow[] } | null> => {
    const supabase = await createClient();

    // The user_id filter is belt and braces — RLS already restricts this to
    // the caller's own rows — but it makes the intent explicit at the query.
    const { data: assessment } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!assessment) return null;

    const { data: answers } = await supabase
      .from("assessment_answers")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: true });

    return { assessment, answers: answers ?? [] };
  },
);

export const getScoreHistory = cache(
  async (userId: string): Promise<ScoreHistoryRow[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("score_history")
      .select("*")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: true });
    return data ?? [];
  },
);

export const getDraft = cache(
  async (userId: string): Promise<AssessmentDraftRow | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("assessment_drafts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data ?? null;
  },
);
