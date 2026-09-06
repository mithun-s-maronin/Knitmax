"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFinancialSnapshot } from "@/lib/data/records";
import { planScenarioChanges, type ScenarioAdjustments } from "@/lib/calculations/scenario";
import { calculateNetWorth } from "@/lib/calculations/netWorth";
import { recordNetWorthSnapshot } from "@/lib/server/sync";
import { toJson } from "@/lib/utils";

const adjustmentsSchema = z.object({
  monthlyIncomeChange: z.number().finite(),
  monthlyExpensesChange: z.number().finite(),
  monthlySavingsChange: z.number().finite(),
  extraDebtPayment: z.number().finite(),
  emergencyFundChange: z.number().finite(),
});

export interface ApplyScenarioResult {
  ok: boolean;
  error?: string;
  applied?: number;
}

/**
 * Applies a simulated scenario to the user's real records (§29).
 *
 * The plan is recomputed here from the stored records; the client's preview is
 * never trusted. Completed assessments are untouched — this changes the live
 * ledger only, and the dashboard will then offer a recalculation rather than
 * silently restating an old score.
 */
export async function applyScenario(input: {
  adjustments: unknown;
  name?: string;
}): Promise<ApplyScenarioResult> {
  const user = await requireUser();

  const parsed = adjustmentsSchema.safeParse(input.adjustments);
  if (!parsed.success) return { ok: false, error: "That scenario is not valid." };

  const adjustments = parsed.data as ScenarioAdjustments;
  const snapshot = await getFinancialSnapshot(user.id);
  const supabase = await createClient();

  const changes = planScenarioChanges(
    {
      incomeSources: snapshot.incomeSources,
      expenses: snapshot.expenses,
      savingsAccounts: snapshot.savingsAccounts,
      debts: snapshot.debts,
    },
    adjustments,
  );

  if (changes.length === 0) {
    return { ok: false, error: "There is nothing here that could be applied." };
  }

  const NOTE = "Set by applying a what-if scenario.";
  let applied = 0;

  for (const change of changes) {
    if (change.id) {
      const { error } = await supabase
        .from(change.table)
        // The table comes from a fixed set in planScenarioChanges and the
        // field from the same closed list; RLS confines the write regardless.
        .update({ [change.field]: change.to } as never)
        .eq("id", change.id)
        .eq("user_id", user.id);
      if (!error) applied += 1;
      continue;
    }

    // A change with no target record creates one, clearly labelled.
    if (change.table === "income_sources") {
      const { error } = await supabase.from("income_sources").insert({
        user_id: user.id,
        name: change.recordName,
        type: "secondary",
        amount: change.to,
        frequency: "monthly",
        notes: NOTE,
      });
      if (!error) applied += 1;
    }

    if (change.table === "savings_accounts") {
      const { error } = await supabase.from("savings_accounts").insert({
        user_id: user.id,
        name: change.recordName,
        type: "emergency_fund",
        is_emergency_fund: true,
        balance: change.field === "balance" ? change.to : 0,
        monthly_contribution: change.field === "monthly_contribution" ? change.to : 0,
        notes: NOTE,
      });
      if (!error) applied += 1;
    }
  }

  // Keep a record of the scenario that was applied.
  await supabase.from("simulations").insert({
    user_id: user.id,
    name: input.name?.slice(0, 120) || "Applied scenario",
    adjustments: toJson(adjustments),
    baseline_scores: toJson({
      overall: snapshot.liveResult.overallScore,
      spend: snapshot.liveResult.spend.score,
      save: snapshot.liveResult.save.score,
      borrow: snapshot.liveResult.borrow.score,
      plan: snapshot.liveResult.plan.score,
    }),
    projected_scores: toJson({}),
    applied_at: new Date().toISOString(),
  });

  // getFinancialSnapshot is request-cached, so re-reading it here would hand
  // back the pre-write figures. Query the affected tables directly instead.
  const [{ data: savings }, { data: debts }, { data: assets }, { data: liabilities }] =
    await Promise.all([
      supabase.from("savings_accounts").select("*").eq("user_id", user.id),
      supabase.from("debts").select("*").eq("user_id", user.id),
      supabase.from("assets").select("*").eq("user_id", user.id),
      supabase.from("liabilities").select("*").eq("user_id", user.id),
    ]);

  await recordNetWorthSnapshot(
    supabase,
    user.id,
    calculateNetWorth({
      savingsAccounts: savings ?? [],
      debts: debts ?? [],
      assets: assets ?? [],
      liabilities: liabilities ?? [],
    }),
  );

  revalidatePath("/dashboard", "layout");
  return { ok: true, applied };
}
