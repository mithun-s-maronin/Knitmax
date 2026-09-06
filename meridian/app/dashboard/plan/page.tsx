import Link from "next/link";
import type { Metadata } from "next";
import { Target } from "lucide-react";

import { PillarPageShell } from "@/components/dashboard/pillar-page-shell";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getDashboardView } from "@/lib/data/dashboard";
import { calculateGoalProgress } from "@/lib/calculations/goals";
import { GOAL_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Plan" };

export default async function PlanPage() {
  const user = await requireUser("/dashboard/plan");
  const { snapshot, stored } = await getDashboardView(user.id);
  const currency = snapshot.currency;

  const activeGoals = snapshot.goals.filter((g) => g.status === "active");

  return (
    <PillarPageShell
      pillar={stored?.plan ?? null}
      assessedAt={stored ? formatDate(stored.completedAt, "long") : null}
    >
      <section className="mt-9" aria-labelledby="goals-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 id="goals-heading" className="text-lg font-semibold tracking-[-0.015em]">
              Your goals
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Goals with an amount and a date are what the Plan pillar rewards.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/goals">Manage goals</Link>
          </Button>
        </div>

        {activeGoals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Add one goal with a target amount and a date. It is the single biggest lever on your Plan score, and it changes what you do day to day."
            action={
              <Button asChild className="mt-2">
                <Link href="/dashboard/goals">Add a goal</Link>
              </Button>
            }
            className="mt-4"
          />
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {activeGoals.map((goal) => {
              const progress = calculateGoalProgress(goal, snapshot.totals.monthlySavings);
              return (
                <li key={goal.id} className="surface p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate font-medium">{goal.name}</p>
                    <p className="text-sm tabular text-muted-foreground">
                      {formatPercent(progress.progress)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {GOAL_CATEGORY_LABELS[goal.category]}
                    {goal.target_date ? ` · by ${formatDate(goal.target_date)}` : ""}
                  </p>
                  <Progress
                    value={progress.progress * 100}
                    className="mt-3 h-1.5"
                    indicatorClassName="bg-pillar-plan"
                    aria-label={`${goal.name} progress`}
                  />
                  <p className="mt-2.5 text-sm tabular">
                    {formatCurrency(Number(goal.current_amount), currency)}{" "}
                    <span className="text-muted-foreground">
                      of {formatCurrency(Number(goal.target_amount), currency)}
                    </span>
                  </p>
                  {progress.requiredMonthlyContribution !== null ? (
                    <p className="mt-1.5 text-xs text-muted-foreground text-pretty">
                      {formatCurrency(progress.requiredMonthlyContribution, currency)} a
                      month to hit the date
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PillarPageShell>
  );
}
