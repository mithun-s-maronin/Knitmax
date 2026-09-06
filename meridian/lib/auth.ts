import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ProfileRow, UserSettingsRow } from "@/types/database";

export interface SessionContext {
  user: User;
  profile: ProfileRow | null;
  settings: UserSettingsRow | null;
}

/**
 * The signed-in user, or null.
 *
 * Always getUser(), never getSession(): the former revalidates the token with
 * Supabase, the latter trusts a cookie the client could have written.
 * Wrapped in React's cache so several components in one render share one call.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** The signed-in user, or a redirect to sign in. */
export async function requireUser(nextPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return user;
}

/** User plus the two rows every authenticated page needs. */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const [profile, settings] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  return {
    user,
    profile: profile.data ?? null,
    settings: settings.data ?? null,
  };
});

/** User plus context, or a redirect to sign in. */
export async function requireSessionContext(
  nextPath?: string,
): Promise<SessionContext> {
  const context = await getSessionContext();
  if (!context) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return context;
}
