import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import {
  buildScoringInput,
  qualitativeFromSnapshot,
  totalRecords,
  type FinancialRecords,
  type RecordTotals,
} from "@/lib/calculations/fromRecords";
import { calculateNetWorth, type NetWorthBreakdown } from "@/lib/calculations/netWorth";
import { scoreFinancialHealth, type FinancialHealthResult, type ScoringInput } from "@/lib/scoring";
import type {
  ActionPlanRow,
  AssessmentRow,
  AssetRow,
  DebtRow,
  ExpenseRow,
  FinancialGoalRow,
  IncomeSourceRow,
  LiabilityRow,
  ProfileRow,
  SavingsAccountRow,
  ScoreHistoryRow,
  UserSettingsRow,
} from "@/types/database";

/**
 * Everything one user's dashboard needs, in a single round of queries.
 *
 * Read once per request and shared through React's cache, so a page with a
 * dozen components that each need "the totals" issues one set of queries
 * rather than a dozen.
 */
export interface FinancialSnapshot {
  profile: ProfileRow | null;
  settings: UserSettingsRow | null;
  currency: string;

  incomeSources: IncomeSourceRow[];
  expenses: ExpenseRow[];
  savingsAccounts: SavingsAccountRow[];
  debts: DebtRow[];
  goals: FinancialGoalRow[];
  assets: AssetRow[];
  liabilities: LiabilityRow[];
  actionPlans: ActionPlanRow[];

  latestAssessment: AssessmentRow | null;
  scoreHistory: ScoreHistoryRow[];

  totals: RecordTotals;
  netWorth: NetWorthBreakdown;

  /** The scoring input derived from the records as they stand right now. */
  liveInput: ScoringInput;
  /** The live score. Not stored — storing it would create a second source of truth. */
  liveResult: FinancialHealthResult;

  /** True once the user has entered enough to score anything at all. */
  hasRecords: boolean;
}

export const getFinancialSnapshot = cache(
  async (userId: string): Promise<FinancialSnapshot> => {
    const supabase = await createClient();

    const [
      profile,
      settings,
      incomeSources,
      expenses,
      savingsAccounts,
      debts,
      goals,
      assets,
      liabilities,
      actionPlans,
      latestAssessment,
      scoreHistory,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("income_sources").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("expenses").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("savings_accounts").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("debts").select("*").eq("user_id", userId).order("interest_rate", { ascending: false }),
      supabase.from("financial_goals").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("assets").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("liabilities").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("action_plans").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase
        .from("assessments")
        .select("*")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("score_history")
        .select("*")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: true }),
    ]);

    const currency = profile.data?.currency ?? "USD";

    const records: FinancialRecords = {
      currency,
      incomeSources: incomeSources.data ?? [],
      expenses: expenses.data ?? [],
      savingsAccounts: savingsAccounts.data ?? [],
      debts: debts.data ?? [],
    };

    // Habits and intentions cannot be derived from records; they carry forward
    // from the most recent assessment's stored input.
    const qualitative = qualitativeFromSnapshot(latestAssessment.data?.input_snapshot);
    const liveInput = buildScoringInput(records, qualitative);

    return {
      profile: profile.data ?? null,
      settings: settings.data ?? null,
      currency,
      incomeSources: records.incomeSources,
      expenses: records.expenses,
      savingsAccounts: records.savingsAccounts,
      debts: records.debts,
      goals: goals.data ?? [],
      assets: assets.data ?? [],
      liabilities: liabilities.data ?? [],
      actionPlans: actionPlans.data ?? [],
      latestAssessment: latestAssessment.data ?? null,
      scoreHistory: scoreHistory.data ?? [],
      totals: totalRecords(records),
      netWorth: calculateNetWorth({
        assets: assets.data ?? [],
        liabilities: liabilities.data ?? [],
        debts: records.debts,
        savingsAccounts: records.savingsAccounts,
      }),
      liveInput,
      liveResult: scoreFinancialHealth(liveInput),
      hasRecords:
        records.incomeSources.length > 0 ||
        records.expenses.length > 0 ||
        records.savingsAccounts.length > 0 ||
        records.debts.length > 0,
    };
  },
);
