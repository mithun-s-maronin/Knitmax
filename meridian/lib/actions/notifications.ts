"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!z.uuid().safeParse(id).success) return { ok: false };

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function clearNotifications(): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const supabase = await createClient();

  await supabase.from("notifications").delete().eq("user_id", user.id);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
