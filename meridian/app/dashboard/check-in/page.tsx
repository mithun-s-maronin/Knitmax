import Link from "next/link";
import type { Metadata } from "next";
import { CalendarCheck } from "lucide-react";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckInForm } from "@/components/check-in/check-in-form";
import { requireUser } from "@/lib/auth";
import { getDashboardView } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Monthly check-in",
  description: "Update your figures in a couple of minutes and see where you stand.",
};

export default async function CheckInPage() {
  const user = await requireUser("/dashboard/check-in");
  const { snapshot, stored } = await getDashboardView(user.id);

  const supabase = await createClient();
  const { data: lastCheckIn } = await supabase
    .from("check_ins")
    .select("period, created_at")
    .eq("user_id", user.id)
    .order("period", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!stored && !snapshot.hasRecords) {
    return (
      <PageShell>
        <PageHeader title="Monthly check-in" />
        <EmptyState
          icon={CalendarCheck}
          title="Take your assessment first"
          description="A check-in updates figures you have already given us. Once you have a baseline, this is the two-minute version each month."
          action={
            <Button asChild className="mt-2">
              <Link href="/assessment">Start my assessment</Link>
            </Button>
          }
          className="mt-7 py-20"
        />
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <PageHeader
        title="Monthly check-in"
        description={
          lastCheckIn
            ? `Your last check-in was ${formatDate(lastCheckIn.created_at, "long")}. Update what has moved since.`
            : "The quick version of the assessment. Update the four figures that move most, and see where that leaves your score."
        }
      />

      <div className="mt-7">
        <CheckInForm
          baseline={snapshot.liveInput}
          currency={snapshot.currency}
          current={{
            monthlyIncome: snapshot.totals.monthlyIncome,
            monthlyExpenses: snapshot.totals.monthlyExpenses,
            monthlySavings: snapshot.totals.monthlySavings,
            emergencyFund: snapshot.totals.emergencyFundAmount,
          }}
        />
      </div>
    </PageShell>
  );
}
