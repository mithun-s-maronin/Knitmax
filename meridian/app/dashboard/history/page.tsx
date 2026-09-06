import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ChartLine, GitCompare, Trophy } from "lucide-react";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ScoreHistoryChart } from "@/components/charts/score-history-chart";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { AssessmentList } from "@/components/history/assessment-list";
import { requireUser } from "@/lib/auth";
import { getAssessments } from "@/lib/data/assessments";
import { getDashboardView } from "@/lib/data/dashboard";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "History",
  description: "Every assessment you have completed, kept exactly as it was scored.",
};

export default async function HistoryPage() {
  const user = await requireUser("/dashboard/history");
  const [assessments, view] = await Promise.all([
    getAssessments(user.id),
    getDashboardView(user.id),
  ]);

  const { snapshot } = view;
  const history = snapshot.scoreHistory;

  if (assessments.length === 0) {
    return (
      <PageShell>
        <PageHeader title="History" />
        <EmptyState
          icon={ChartLine}
          title="Nothing to look back on yet"
          description="Once you complete your first assessment it is kept here permanently, and a trend line builds from the second one onwards."
          action={
            <Button asChild className="mt-2">
              <Link href="/assessment">
                Start my assessment
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
          className="mt-7 py-20"
        />
      </PageShell>
    );
  }

  const first = history[0];
  const latest = history.at(-1);
  const best = history.reduce(
    (max, row) => Math.max(max, row.overall_score),
    0,
  );
  const sinceStart =
    first && latest ? latest.overall_score - first.overall_score : null;

  return (
    <PageShell>
      <PageHeader
        title="History"
        description="Every completed assessment, with the scoring version that produced it. These records are permanent — they cannot be edited or recalculated, so a score from a year ago still means what it meant then."
        actions={
          assessments.length > 1 ? (
            <Button asChild variant="outline">
              <Link
                href={`/dashboard/history/compare?a=${assessments[1].id}&b=${assessments[0].id}`}
              >
                <GitCompare className="size-4" />
                Compare two
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Current score"
          value={String(latest?.overall_score ?? "—")}
          hint={latest ? formatDate(latest.recorded_at) : undefined}
        />
        <MetricCard label="Best so far" value={String(best)} />
        <MetricCard
          label="Since your first"
          value={sinceStart === null ? "—" : `${sinceStart > 0 ? "+" : ""}${sinceStart}`}
          hint={first ? `from ${first.overall_score}` : undefined}
        />
        <MetricCard
          label="Assessments"
          value={String(assessments.length)}
          hint="All kept permanently"
        />
      </div>

      <div className="mt-7">
        <ScoreHistoryChart history={history} height={320} />
      </div>

      {view.netWorthSnapshots.length > 1 ? (
        <div className="mt-5">
          <NetWorthChart
            snapshots={view.netWorthSnapshots}
            currency={snapshot.currency}
          />
        </div>
      ) : view.netWorthSnapshots.length === 1 ? (
        <p className="mt-5 rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
          Net worth is currently{" "}
          {formatCurrency(
            Number(view.netWorthSnapshots[0].net_worth),
            snapshot.currency,
          )}
          . A trend line appears once there is more than one reading.
        </p>
      ) : null}

      {view.milestones.length > 0 ? (
        <section className="mt-9" aria-labelledby="milestones-heading">
          <h2 id="milestones-heading" className="text-lg font-semibold tracking-[-0.015em]">
            Milestones
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Reached once, and kept.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {view.milestones.map((milestone) => (
              <li key={milestone.id} className="surface flex gap-3 p-4">
                <Trophy className="mt-0.5 size-4 shrink-0 text-score-excellent-ink" />
                <div className="min-w-0">
                  <p className="font-medium">{milestone.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                    {milestone.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(milestone.achieved_at, "long")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-9" aria-labelledby="assessments-heading">
        <h2 id="assessments-heading" className="text-lg font-semibold tracking-[-0.015em]">
          Your assessments
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Open any one to see the answers and the full breakdown as it stood.
        </p>
        <AssessmentList assessments={assessments} className="mt-4" />
      </section>
    </PageShell>
  );
}
