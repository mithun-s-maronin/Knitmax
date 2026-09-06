import Link from "next/link";

import { DashboardSidebar } from "@/components/dashboard/nav/sidebar";
import { MobileNav } from "@/components/dashboard/nav/mobile-nav";
import { NotificationCenter } from "@/components/dashboard/notification-center";
import { UserMenu } from "@/components/dashboard/user-menu";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { requireSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Rendered per request. These pages are entirely one user's data.
 *
 * Declared rather than inferred: without Supabase configured at build
 * time the auth check short-circuits before it touches cookies, and Next
 * would otherwise prerender these as static.
 */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, settings } = await requireSessionContext("/dashboard");

  const supabase = await createClient();
  const { data: notifications } = settings?.notifications_enabled === false
    ? { data: [] }
    : await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

  return (
    <div className="flex min-h-dvh">
      <DashboardSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
            <div className="lg:hidden">
              <Logo showWordmark={false} />
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
                <Link href="/assessment">New assessment</Link>
              </Button>
              <ThemeToggle />
              <NotificationCenter notifications={notifications ?? []} />
              <UserMenu
                name={profile?.full_name ?? null}
                email={profile?.email ?? user.email ?? null}
                avatarUrl={profile?.avatar_url ?? null}
              />
            </div>
          </div>
        </header>

        <main id="main" className="flex-1 pb-24 lg:pb-0">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
