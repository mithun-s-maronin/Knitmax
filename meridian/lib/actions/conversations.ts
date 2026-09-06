"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ConversationResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function renameConversation(input: {
  id: string;
  title: string;
}): Promise<ConversationResult> {
  const user = await requireUser();

  const parsed = z
    .object({ id: z.uuid(), title: z.string().trim().min(1).max(200) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "That title cannot be used." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_conversations")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "We could not rename that." };

  revalidatePath("/dashboard/ai");
  return { ok: true };
}

/** Deletes one conversation and, by cascade, every message in it (§49, §71). */
export async function deleteConversation(id: string): Promise<ConversationResult> {
  const user = await requireUser();
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, error: "That conversation could not be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "We could not delete that conversation." };

  revalidatePath("/dashboard/ai");
  return { ok: true };
}

export async function deleteAllConversations(): Promise<ConversationResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "We could not clear your conversations." };

  revalidatePath("/dashboard/ai");
  return { ok: true };
}
