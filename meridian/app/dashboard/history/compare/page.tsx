import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreComparison } from "@/components/history/score-comparison";
import { ComparisonPicker } from "@/components/history/comparison-picker";
import { requireUser } from "@/lib/auth";
import { getAssessment, getAssessments } from "@/lib/data/assessments";
import { readStoredResult } from "@/lib/scoring";
import { formatDate } from "@/lib/format";
import { GitCompare } from "lucide-react";

export const metadata: Metadata = { title: "Compare assessments" };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const user = await requireUser("/dashboard/history/compare");
  const params = await searchParams;
  const assessments = await getAssessments(user.id);

  if (assessments.length < 2) {
    return (
      <PageShell>
        <PageHeader title="Compare assessments" />
        <EmptyState
          icon={GitCompare}
          title="You need two assessments to compare"
          description="Take another assessment and you will be able to see exactly which pillars moved, and by how much."
          action={
            <Button asChild className="mt-2">
              <Link href="/assessment">Take another assessment</Link>
            </Button>
          }
          className="mt-7 py-20"
        />
      </PageShell>
    );
  }

  const beforeId = params.a ?? assessments[1].id;
  const afterId = params.b ?? assessments[0].id;

  const [before, after] = await Promise.all([
    getAssessment(user.id, beforeId),
    getAssessment(user.id, afterId),
  ]);

  if (!before || !after) {
    return (
      <PageShell>
        <PageHeader title="Compare assessments" />
        <p className="mt-7 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          One of those assessments could not be found. Pick two from the list below.
        </p>
        <ComparisonPicker
          assessments={assessments.map((a) => ({
            id: a.id,
            label: `${formatDate(a.completed_at, "long")} · ${a.overall_score}`,
          }))}
          beforeId={assessments[1].id}
          afterId={assessments[0].id}
          className="mt-6"
        />
      </PageShell>
    );
  }

  const beforeResult = readStoredResult(before.assessment);
  const afterResult = readStoredResult(after.assessment);

  const pillars = afterResult.pillars.map((pillar) => ({
    label: pillar.label,
    before: beforeResult.pillars.find((p) => p.key === pillar.key)?.score ?? null,
    after: pillar.score,
  }));

  const sameVersion = beforeResult.scoringVersion === afterResult.scoringVersion;

  return (
    <PageShell>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/dashboard/history">
          <ArrowLeft className="size-4" />
          All assessments
        </Link>
      </Button>

      <PageHeader
        title="Compare assessments"
        description="Both scores are shown, not just the change — a difference on its own does not tell you where you are."
      />

      <ComparisonPicker
        assessments={assessments.map((a) => ({
          id: a.id,
          label: `${formatDate(a.completed_at, "long")} · ${a.overall_score}`,
        }))}
        beforeId={beforeId}
        afterId={afterId}
        className="mt-7"
      />

      <ScoreComparison
        className="mt-6"
        beforeLabel="Earlier"
        afterLabel="Later"
        beforeDate={beforeResult.completedAt}
        afterDate={afterResult.completedAt}
        overall={{
          label: "Overall",
          before: beforeResult.overallScore,
          after: afterResult.overallScore,
        }}
        pillars={pillars}
      />

      {!sameVersion ? (
        <p className="mt-5 rounded-xl border border-score-fair/35 bg-score-fair/[0.08] p-4 text-sm text-pretty">
          These two were scored under different versions of the formulas
          ({beforeResult.scoringVersion} and {afterResult.scoringVersion}). Each
          keeps the score it was given at the time, so part of the difference may
          come from the change in method rather than a change in your finances.
        </p>
      ) : null}

      <section className="mt-9" aria-labelledby="metric-changes">
        <h2 id="metric-changes" className="text-lg font-semibold tracking-[-0.015em]">
          What changed underneath
        </h2>
        <div className="surface mt-4 divide-y">
          {(
            [
              ["Monthly income", "monthlyIncome", "currency"],
              ["Monthly expenses", "monthlyExpenses", "currency"],
              ["Monthly savings", "monthlySavings", "currency"],
              ["Emergency fund", "emergencyFundAmount", "currency"],
              ["Total debt", "totalDebt", "currency"],
              ["Savings rate", "savingsRate", "percent"],
              ["Emergency fund months", "emergencyFundMonths", "months"],
              ["Debt-to-income", "debtToIncomeRatio", "percent"],
            ] as const
          ).map(([label, key, kind]) => {
            const b = beforeResult.metrics[key];
            const a = afterResult.metrics[key];
            return (
              <MetricRow
                key={key}
                label={label}
                before={typeof b === "number" ? b : null}
                after={typeof a === "number" ? a : null}
                kind={kind}
                currency={afterResult.currency}
              />
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}

function MetricRow({
  label,
  before,
  after,
  kind,
  currency,
}: {
  label: string;
  before: number | null;
  after: number | null;
  kind: "currency" | "percent" | "months";
  currency: string;
}) {
  const render = (value: number | null) => {
    if (value === null) return "—";
    if (kind === "currency") {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (kind === "percent") return `${(value * 100).toFixed(1)}%`;
    return `${value.toFixed(1)} months`;
  };

  const delta = before !== null && after !== null ? after - before : null;
  // For debt, down is the improvement.
  const invert = label.toLowerCase().includes("debt") || label.toLowerCase().includes("expenses");
  const good = delta === null || delta === 0 ? null : invert ? delta < 0 : delta > 0;

  return (
    <div className="flex items-center gap-4 p-4">
      <span className="min-w-0 flex-1 text-sm">{label}</span>
      <span className="tabular text-sm text-muted-foreground">{render(before)}</span>
      <span className="tabular text-sm font-medium">{render(after)}</span>
      <span
        className={
          good === null
            ? "w-6 text-right text-xs text-muted-foreground"
            : good
              ? "w-6 text-right text-xs text-score-excellent"
              : "w-6 text-right text-xs text-destructive"
        }
        aria-hidden
      >
        {delta === null || delta === 0 ? "—" : delta > 0 ? "↑" : "↓"}
      </span>
    </div>
  );
}
