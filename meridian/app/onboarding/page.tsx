import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { requireSessionContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Welcome" };

/**
 * Rendered per request. Onboarding state is per user.
 *
 * Declared rather than inferred: without Supabase configured at build
 * time the auth check short-circuits before it touches cookies, and Next
 * would otherwise prerender these as static.
 */
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { profile, settings } = await requireSessionContext("/onboarding");

  // Already been through it — no reason to see it again.
  if (settings?.onboarding_completed_at) redirect("/dashboard");

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null;

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="aurora pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden />
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <ThemeToggle />
      </header>
      <main id="main" className="flex-1">
        <OnboardingFlow firstName={firstName} />
      </main>
    </div>
  );
}
