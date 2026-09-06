import type { Metadata } from "next";
import { Target } from "lucide-react";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { GoalCard } from "@/components/financial-data/goal-card";
import { AddGoalButton } from "@/components/financial-data/add-goal-button";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { getFinancialSnapshot } from "@/lib/data/records";
import { calculateGoalProgress } from "@/lib/calculations/goals";
import { formatCurrency, formatPercent } from "@/lib/format";

export const metadata: Metadata = {
  title: "Goals",
  description: "Targets with an amount and a date, and what it takes to hit them.",
};

export default async function GoalsPage() {
  const user = await requireUser("/dashboard/goals");
  const snapshot = await getFinancialSnapshot(user.id);
  const currency = snapshot.currency;

  const active = snapshot.goals.filter(
    (g) => g.status === "active" || g.status === "paused",
  );
  const completed = snapshot.goals.filter((g) => g.status === "completed");

  const totalTarget = active.reduce((sum, g) => sum + Number(g.target_amount), 0);
  const totalSaved = active.reduce((sum, g) => sum + Number(g.current_amount), 0);

  const monthlyNeeded = active.reduce((sum, goal) => {
    const progress = calculateGoalProgress(goal);
    return sum + (progress.requiredMonthlyContribution ?? 0);
  }, 0);

  return (
    <PageShell>
      <PageHeader
        title="Goals"
        description="A goal with a number and a date is what turns saving into progress you can see — and it is the heaviest part of your Plan score."
        actions={<AddGoalButton currency={currency} />}
      />

      {snapshot.goals.length > 0 ? (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Active goals"
            value={String(active.length)}
            hint={completed.length > 0 ? `${completed.length} completed` : undefined}
          />
          <MetricCard
            label="Total targeted"
            value={formatCurrency(totalTarget, currency)}
          />
          <MetricCard
            label="Saved towards them"
            value={formatCurrency(totalSaved, currency)}
            hint={
              totalTarget > 0
                ? `${formatPercent(totalSaved / totalTarget)} of the way`
                : undefined
            }
          />
          <MetricCard
            label="Needed each month"
            value={formatCurrency(monthlyNeeded, currency)}
            hint="To hit every date"
            explanation="The sum of what each goal with a target date needs per month from today to land on time."
          />
        </div>
      ) : null}

      {active.length === 0 && completed.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Start with one. An emergency fund of three months' essential costs is the goal that moves your score the most."
          action={<AddGoalButton currency={currency} className="mt-2" />}
          className="mt-7 py-16"
        />
      ) : (
        <>
          {active.length > 0 ? (
            <section className="mt-8" aria-labelledby="active-goals">
              <h2 id="active-goals" className="text-lg font-semibold tracking-[-0.015em]">
                In progress
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {active.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    currency={currency}
                    monthlyContribution={snapshot.totals.monthlySavings}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {completed.length > 0 ? (
            <section className="mt-10" aria-labelledby="completed-goals">
              <h2 id="completed-goals" className="text-lg font-semibold tracking-[-0.015em]">
                Completed
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {completed.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    currency={currency}
                    monthlyContribution={snapshot.totals.monthlySavings}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
