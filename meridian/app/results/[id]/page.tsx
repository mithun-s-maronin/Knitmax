import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  ChartLine,
  CircleAlert,
  SlidersHorizontal,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InsightGroup } from "@/components/dashboard/insight-card";
import { PillarDetail } from "@/components/dashboard/pillar-detail";
import { RecommendationCard } from "@/components/dashboard/recommendation-card";
import { ActionPlan } from "@/components/dashboard/action-plan";
import { PillarScoreCard } from "@/components/score/pillar-score-card";
import { ScoreGauge } from "@/components/score/score-gauge";
import { ScoreTransparency } from "@/components/results/score-transparency";
import { Reveal } from "@/components/marketing/reveal";
import { requireUser } from "@/lib/auth";
import { getAssessment } from "@/lib/data/assessments";
import { createClient } from "@/lib/supabase/server";
import { getScoreSummary, readStoredResult } from "@/lib/scoring";
import { formatCurrency, formatDate, formatMonths, formatPercent } from "@/lib/format";

export const metadata: Metadata = {
  title: "Your results",
  description: "Your Financial Health Score, and exactly how it was calculated.",
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/results/${id}`);

  const record = await getAssessment(user.id, id);
  if (!record) notFound();

  const result = readStoredResult(record.assessment);
  const { metrics } = result;

  const supabase = await createClient();
  const [{ data: actions }, { data: previous }] = await Promise.all([
    supabase
      .from("action_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("priority")
      .order("created_at", { ascending: false }),
    supabase
      .from("assessments")
      .select("id, overall_score, completed_at")
      .eq("user_id", user.id)
      .lt("completed_at", record.assessment.completed_at)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const delta = previous ? result.overallScore - previous.overall_score : null;

  const strengths = result.pillars.flatMap((p) =>
    p.strengths.map((text, i) => ({
      key: `${p.key}-s-${i}`,
      kind: "strength" as const,
      title: text,
      detail: p.label,
      pillar: p.key,
      severity: "success" as const,
    })),
  );
  const improvements = result.pillars.flatMap((p) =>
    p.weaknesses.map((text, i) => ({
      key: `${p.key}-w-${i}`,
      kind: "improvement" as const,
      title: text,
      detail: p.label,
      pillar: p.key,
      severity: "warning" as const,
    })),
  );
  const actionInsights = result.recommendations.map((r) => ({
    key: `a-${r.key}`,
    kind: "action" as const,
    title: r.title,
    detail: r.description,
    pillar: r.pillar,
    severity: "info" as const,
  }));

  const keyMetrics = [
    {
      label: "Monthly income",
      value: formatCurrency(metrics.monthlyIncome, result.currency),
    },
    {
      label: "Left after everything",
      value: formatCurrency(metrics.disposableIncome, result.currency),
    },
    { label: "Savings rate", value: formatPercent(metrics.savingsRate, 1) },
    {
      label: "Emergency fund",
      value: formatMonths(metrics.emergencyFundMonths),
    },
    {
      label: "Total debt",
      value: formatCurrency(metrics.totalDebt, result.currency),
    },
    {
      label: "Debt-to-income",
      value: formatPercent(metrics.debtToIncomeRatio, 1),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
      {/* ------------------------------------------------------------ Hero */}
      <section className="relative py-14 text-center sm:py-20">
        <div className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 opacity-60" aria-hidden />

        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Your financial health score
        </p>

        <div className="mt-8 flex justify-center">
          <ScoreGauge
            score={result.overallScore}
            size="lg"
            insufficientData={result.measuredWeight === 0}
          />
        </div>

        <p className="mx-auto mt-7 max-w-xl text-lg text-muted-foreground text-pretty">
          {getScoreSummary(result.overallScore)}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Badge variant="muted">
            Completed {formatDate(result.completedAt, "long")}
          </Badge>
          {delta !== null ? (
            <Badge
              variant="outline"
              className={
                delta > 0
                  ? "border-score-excellent/35 text-score-excellent"
                  : delta < 0
                    ? "border-destructive/35 text-destructive"
                    : undefined
              }
            >
              {delta > 0 ? "+" : ""}
              {delta} since your last assessment
            </Badge>
          ) : (
            <Badge variant="muted">Your first assessment</Badge>
          )}
        </div>

        {result.hasInsufficientData ? (
          <Alert variant="info" className="mx-auto mt-8 max-w-2xl text-left">
            <CircleAlert />
            <AlertTitle>Some things could not be measured</AlertTitle>
            <AlertDescription>
              Parts of the model needed information we did not have. They were
              left out rather than scored as zero, and the remaining weights
              were scaled up. The breakdown below shows exactly which.
            </AlertDescription>
          </Alert>
        ) : null}
      </section>

      {/* --------------------------------------------------------- Pillars */}
      <section aria-labelledby="pillars-heading">
        <h2 id="pillars-heading" className="text-xl font-semibold tracking-[-0.015em]">
          Your four pillars
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Where the score came from, and which part is holding it back.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {result.pillars.map((pillar, index) => (
            <PillarScoreCard
              key={pillar.key}
              pillar={pillar}
              index={index}
              href={`/dashboard/${pillar.key}`}
            />
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- Key metrics */}
      <section className="mt-14" aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="text-xl font-semibold tracking-[-0.015em]">
          The numbers behind it
        </h2>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {keyMetrics.map((metric) => (
            <div key={metric.label} className="surface p-4">
              <dt className="text-xs text-muted-foreground">{metric.label}</dt>
              <dd className="mt-1.5 text-xl font-semibold tabular tracking-tight">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* -------------------------------------------------------- Insights */}
      <Reveal className="mt-14">
        <section aria-labelledby="insights-heading">
          <h2 id="insights-heading" className="text-xl font-semibold tracking-[-0.015em]">
            Personalised insights
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <InsightGroup
              kind="strength"
              insights={strengths}
              emptyMessage="Nothing is at full marks yet — the actions below are where to start."
            />
            <InsightGroup
              kind="improvement"
              insights={improvements}
              emptyMessage="Nothing is pulling your score down."
            />
            <InsightGroup
              kind="action"
              insights={actionInsights}
              emptyMessage="No action needed right now."
            />
          </div>
        </section>
      </Reveal>

      {/* ------------------------------------------------- Recommendations */}
      {result.recommendations.length > 0 ? (
        <Reveal className="mt-14">
          <section aria-labelledby="recommendations-heading">
            <h2
              id="recommendations-heading"
              className="text-xl font-semibold tracking-[-0.015em]"
            >
              What to do, in order
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              The point figures are measured, not estimated — we re-ran the
              scoring engine with each change applied to see what it is actually
              worth.
            </p>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {result.recommendations.slice(0, 6).map((recommendation) => (
                <RecommendationCard
                  key={recommendation.key}
                  recommendation={recommendation}
                />
              ))}
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* ----------------------------------------------------- Action plan */}
      <Reveal className="mt-14">
        <section aria-labelledby="plan-heading">
          <h2 id="plan-heading" className="text-xl font-semibold tracking-[-0.015em]">
            Your action plan
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tick things off as you go. This list follows you across devices.
          </p>
          <div className="mt-6">
            <ActionPlan actions={actions ?? []} />
          </div>
        </section>
      </Reveal>

      {/* --------------------------------------------------- Pillar detail */}
      <Reveal className="mt-14">
        <section aria-labelledby="detail-heading" className="space-y-8">
          <div>
            <h2 id="detail-heading" className="text-xl font-semibold tracking-[-0.015em]">
              Pillar by pillar
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              What is working, what is not, and what to do about each.
            </p>
          </div>

          {result.pillars.map((pillar) => (
            <div key={pillar.key}>
              <h3 className="mb-3 flex items-baseline gap-3 text-base font-semibold">
                {pillar.label}
                <span className="text-sm font-normal tabular text-muted-foreground">
                  {pillar.score ?? "—"} / 100
                </span>
              </h3>
              <PillarDetail pillar={pillar} />
            </div>
          ))}
        </section>
      </Reveal>

      {/* --------------------------------------------------- Transparency */}
      <Reveal className="mt-14">
        <ScoreTransparency
          pillars={result.pillars}
          overallScore={result.overallScore}
          scoringVersion={result.scoringVersion}
          measuredWeight={result.measuredWeight}
        />
      </Reveal>

      {/* ---------------------------------------------------- What's next */}
      <section className="mt-14" aria-labelledby="next-heading">
        <h2 id="next-heading" className="text-xl font-semibold tracking-[-0.015em]">
          Where to go next
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              href: "/dashboard/ai",
              icon: Bot,
              title: "Ask about your score",
              body: "Have the assistant explain any part of this in your own terms.",
            },
            {
              href: "/dashboard/simulator",
              icon: SlidersHorizontal,
              title: "Try a change",
              body: "See what saving more or clearing a debt would do to your score.",
            },
            {
              href: "/dashboard/history",
              icon: ChartLine,
              title: "Track the trend",
              body: "Every assessment is kept, so progress is visible over time.",
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="surface group p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <card.icon className="size-5 text-primary" />
              <p className="mt-3.5 font-semibold">{card.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">{card.body}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/dashboard">
              Go to my dashboard
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard/reports">
              <CalendarCheck className="size-4" />
              Generate a report
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
