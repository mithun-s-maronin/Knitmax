"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface SettingsResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export async function completeOnboarding(): Promise<SettingsResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, onboarding_completed_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error) return { ok: false, error: "We could not save that." };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Tell us what to call you.").max(120),
  country: z.string().regex(/^[A-Z]{2}$/, "Choose a country."),
  currency: z.string().regex(/^[A-Z]{3}$/, "Choose a currency."),
});

export async function updateProfile(input: unknown): Promise<SettingsResult> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check those details." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      country: parsed.data.country,
      currency: parsed.data.currency,
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: "We could not save your profile." };

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Profile saved." };
}

const preferencesSchema = z.object({
  ai_data_permission: z.boolean().optional(),
  ai_conversation_memory: z.boolean().optional(),
  notifications_enabled: z.boolean().optional(),
  score_change_alerts: z.boolean().optional(),
  goal_milestone_alerts: z.boolean().optional(),
  monthly_checkin_reminder: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

/** Updates one or more preference switches, including the AI data permission (§70). */
export async function updatePreferences(input: unknown): Promise<SettingsResult> {
  const user = await requireUser();

  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That setting could not be saved." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" });

  if (error) return { ok: false, error: "We could not save that setting." };

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Saved." };
}
