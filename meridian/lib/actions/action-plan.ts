"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionStatus } from "@/types/database";

const setStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "completed", "dismissed"]),
});

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Marks an action complete, or puts it back.
 *
 * completed_at is set and cleared alongside the status because the database
 * has a constraint tying the two together — a "completed" row with no
 * completion time is rejected outright.
 */
export async function setActionStatus(input: {
  id: string;
  status: ActionStatus;
}): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That action could not be updated." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("action_plans")
    .update({
      status: parsed.data.status,
      completed_at:
        parsed.data.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "We could not update that just now." };

  if (parsed.data.status === "completed") {
    const { data: action } = await supabase
      .from("action_plans")
      .select("title")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (action) {
      await supabase.from("notifications").upsert(
        {
          user_id: user.id,
          type: "action_completed",
          severity: "success",
          title: "Action completed",
          message: action.title,
          href: "/dashboard",
          dedupe_key: `action_completed:${parsed.data.id}`,
        },
        { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
      );
    }
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
