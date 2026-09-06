"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFinancialSnapshot } from "@/lib/data/records";
import { recordNetWorthSnapshot } from "@/lib/server/sync";
import {
  RECORD_SCHEMAS,
  toFieldErrors,
  type RecordTable,
} from "@/lib/validation/records";

export interface RecordActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

const tableSchema = z.enum([
  "income_sources",
  "expenses",
  "savings_accounts",
  "debts",
  "financial_goals",
  "assets",
  "liabilities",
]);

const idSchema = z.uuid();

/** Tables whose changes move net worth, so a fresh snapshot is worth taking. */
const NET_WORTH_TABLES: RecordTable[] = [
  "savings_accounts",
  "debts",
  "assets",
  "liabilities",
];

function revalidateRecordViews() {
  // Every dashboard route derives from these records, so the whole segment is
  // refreshed rather than trying to guess which pages a change touched.
  revalidatePath("/dashboard", "layout");
}

/**
 * Creates or updates one financial record.
 *
 * The table name is checked against a fixed list before it reaches a query, so
 * a crafted request cannot address a table this action was never meant to
 * touch, and RLS confines every write to the caller's own rows regardless.
 */
export async function saveRecord(input: {
  table: string;
  id?: string | null;
  values: unknown;
}): Promise<RecordActionState> {
  const user = await requireUser();

  const table = tableSchema.safeParse(input.table);
  if (!table.success) return { ok: false, error: "Unknown record type." };

  const schema = RECORD_SCHEMAS[table.data];
  const parsed = schema.safeParse(input.values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some of those details need attention.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const values = parsed.data as Record<string, unknown>;

  // A completed goal needs a completion time; the database enforces the pair.
  if (table.data === "financial_goals") {
    values.completed_at =
      values.status === "completed" ? new Date().toISOString() : null;
  }

  if (input.id) {
    const id = idSchema.safeParse(input.id);
    if (!id.success) return { ok: false, error: "That record could not be found." };

    const { error } = await supabase
      .from(table.data)
      // The table name and the shape of `values` are correlated at runtime by
      // RECORD_SCHEMAS, but TypeScript cannot follow that correlation through a
      // dynamic table name. Everything reaching here has already been parsed by
      // that table's own schema, the database re-checks it with CHECK
      // constraints, and RLS confines the write to this user's rows.
      .update(values as never)
      .eq("id", id.data)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: "We could not save that change." };
    }
  } else {
    const { data, error } = await supabase
      .from(table.data)
      // See the note on the update path above.
      .insert({ ...values, user_id: user.id } as never)
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: "We could not save that record." };
    }
    input.id = data.id;
  }

  if (NET_WORTH_TABLES.includes(table.data)) {
    const snapshot = await getFinancialSnapshot(user.id);
    await recordNetWorthSnapshot(supabase, user.id, snapshot.netWorth);
  }

  revalidateRecordViews();
  return { ok: true, id: input.id ?? undefined };
}

/** Deletes one financial record. Nothing historical is reachable from here. */
export async function deleteRecord(input: {
  table: string;
  id: string;
}): Promise<RecordActionState> {
  const user = await requireUser();

  const table = tableSchema.safeParse(input.table);
  const id = idSchema.safeParse(input.id);
  if (!table.success || !id.success) {
    return { ok: false, error: "That record could not be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(table.data)
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "We could not delete that record." };

  revalidateRecordViews();
  return { ok: true };
}

/** Adds to a goal's saved amount, and completes it when it reaches the target. */
export async function contributeToGoal(input: {
  id: string;
  amount: number;
}): Promise<RecordActionState> {
  const user = await requireUser();

  const parsed = z
    .object({ id: z.uuid(), amount: z.coerce.number().finite() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "That contribution is not valid." };

  const supabase = await createClient();
  const { data: goal } = await supabase
    .from("financial_goals")
    .select("*")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!goal) return { ok: false, error: "That goal could not be found." };

  const next = Math.min(
    Math.max(Number(goal.current_amount) + parsed.data.amount, 0),
    Number(goal.target_amount),
  );
  const completed = next >= Number(goal.target_amount);

  const { error } = await supabase
    .from("financial_goals")
    .update({
      current_amount: next,
      status: completed ? "completed" : goal.status === "completed" ? "active" : goal.status,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", goal.id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "We could not record that." };

  if (completed && goal.status !== "completed") {
    await supabase.from("notifications").upsert(
      {
        user_id: user.id,
        type: "goal_milestone",
        severity: "success",
        title: "Goal reached",
        message: `${goal.name} is fully funded.`,
        href: "/dashboard/goals",
        dedupe_key: `goal_completed:${goal.id}`,
      },
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
    );
  }

  revalidateRecordViews();
  return { ok: true };
}
