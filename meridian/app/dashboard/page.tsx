import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ChartLine, Sparkles, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { AiInsightPanel } from "@/components/dashboard/ai-insight-panel";
import { RecalculatePrompt } from "@/components/dashboard/recalculate-prompt";
import { ActionPlan } from "@/components/dashboard/action-plan";
import { PillarScoreCard } from "@/components/score/pillar-score-card";
import { ScoreGauge } from "@/components/score/score-gauge";
import { ScoreHistoryChart } from "@/components/charts/score-history-chart";
import { requireSessionContext } from "@/lib/auth";
import { getDashboardView } from "@/lib/data/dashboard";
import { buildDashboardInsights } from "@/lib/server/insights";
import { getScoreSummary } from "@/lib/scoring";
import { formatCurrency, formatDate, formatMonths, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const { user, profile } = await requireSessionContext("/dashboard");
  const view = await getDashboardView(user.id);
  const { snapshot, stored } = view;
  const currency = snapshot.currency;

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  // ---- No assessment yet: one clear thing to do -------------------------
  if (!stored) {
    return (
      <PageShell>
        <PageHeader
          title={firstName ? `Welcome, ${firstName}` : "Welcome to Meridian"}
          description="You are one short assessment away from your Financial Health Score."
        />
        <div className="mt-8">
          <EmptyState
            icon={Sparkles}
            title="Take your first assessment"
            description="Six short sections covering income, spending, saving, debt and planning. It saves as you go, so you can stop and come back."
            action={
              <Button asChild size="lg" className="mt-2">
                <Link href="/assessment">
                  Start my assessment
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
            className="py-20"
          />
        </div>
      </PageShell>
    );
  }

  const m = stored.metrics;
  const insights = buildDashboardInsights(stored);

  const previous = snapshot.scoreHistory.at(-2) ?? null;
  const delta = previous ? stored.overallScore - previous.overall_score : null;

  const recentMilestone = view.milestones[0];

  return (
    <PageShell>
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : "Your overview"}
        description={`Last assessed ${formatDate(stored.completedAt, "long")}.`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/simulator">Try a change</Link>
            </Button>
            <Button asChild>
              <Link href="/assessment">New assessment</Link>
            </Button>
          </>
        }
      />

      {view.needsRecalculation ? (
        <div className="mt-7">
          <RecalculatePrompt
            lastAssessedAt={stored.completedAt}
            liveScore={snapshot.liveResult.overallScore}
            storedScore={stored.overallScore}
          />
        </div>
      ) : null}

      {/* ---- Score and headline metrics ---- */}
      <div className="mt-7 grid gap-5 lg:grid-cols-[auto_1fr] lg:items-start">
        <div className="surface flex flex-col items-center p-6 lg:w-72">
          <ScoreGauge
            score={stored.overallScore}
            size="md"
            insufficientData={stored.measuredWeight === 0}
          />
          {delta !== null ? (
            <Badge
              variant="outline"
              className={
                delta > 0
                  ? "mt-4 border-score-excellent/35 text-score-excellent-ink"
                  : delta < 0
                    ? "mt-4 border-destructive/35 text-destructive-ink"
                    : "mt-4"
              }
            >
              {delta > 0 ? "+" : ""}
              {delta} since last time
            </Badge>
          ) : null}
          <p className="mt-4 text-center text-sm text-muted-foreground text-pretty">
            {getScoreSummary(stored.overallScore)}
          </p>
          <Button asChild variant="ghost" size="sm" className="mt-3">
            <Link href={`/results/${snapshot.latestAssessment?.id}`}>
              See the full breakdown
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Monthly income"
            value={formatCurrency(m.monthlyIncome, currency)}
            hint="After tax, all sources"
          />
          <MetricCard
            label="Left each month"
            value={formatCurrency(m.disposableIncome, currency)}
            hint="After living costs and repayments"
            explanation="Income minus monthly expenses minus debt repayments. This is the money that can go towards savings and goals."
          />
          <MetricCard
            label="Savings rate"
            value={formatPercent(m.savingsRate, 1)}
            hint="20% scores full marks"
            explanation="The share of your income you save each month. It is the number that decides how quickly every goal arrives."
          />
          <MetricCard
            label="Emergency fund"
            value={formatMonths(m.emergencyFundMonths)}
            hint="Six months is a complete fund"
            explanation="Your emergency fund divided by your essential monthly costs — how long you could cover the basics with no income."
          />
          <MetricCard
            label="Total debt"
            value={formatCurrency(m.totalDebt, currency)}
            hint={
              m.highInterestDebt > 0
                ? `${formatCurrency(m.highInterestDebt, currency)} at 12%+`
                : "None at a high rate"
            }
          />
          <MetricCard
            label="Net worth"
            value={formatCurrency(snapshot.netWorth.netWorth, currency)}
            hint="Everything owned minus owed"
            explanation="Assets, including your savings balances, minus debts and other liabilities."
          />
        </div>
      </div>

      {/* ---- Alerts ---- */}
      {stored.alerts.length > 0 ? (
        <div className="mt-7">
          <AlertsPanel alerts={stored.alerts} />
        </div>
      ) : null}

      {/* ---- Pillars ---- */}
      <section className="mt-9" aria-labelledby="pillars-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="pillars-heading" className="text-lg font-semibold tracking-[-0.015em]">
            Your four pillars
          </h2>
          <Link
            href="/dashboard/financial-health"
            className="rounded text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Full breakdown
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stored.pillars.map((pillar, index) => (
            <PillarScoreCard
              key={pillar.key}
              pillar={pillar}
              index={index}
              href={`/dashboard/${pillar.key}`}
            />
          ))}
        </div>
      </section>

      {/* ---- Insight + milestone ---- */}
      <div className="mt-9 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <AiInsightPanel insights={insights} />

        <div className="space-y-5">
          {recentMilestone ? (
            <div className="surface p-5">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-score-excellent-ink" />
                <h2 className="font-semibold">Latest milestone</h2>
              </div>
              <p className="mt-3 font-medium">{recentMilestone.title}</p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {recentMilestone.description}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDate(recentMilestone.achieved_at, "long")}
              </p>
            </div>
          ) : null}

          <Link
            href="/dashboard/history"
            className="surface flex items-center gap-4 p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChartLine className="size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-medium">
                {snapshot.scoreHistory.length}{" "}
                {snapshot.scoreHistory.length === 1 ? "assessment" : "assessments"} on record
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                Every one kept exactly as it was scored.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* ---- History ---- */}
      {snapshot.scoreHistory.length > 0 ? (
        <div className="mt-9">
          <ScoreHistoryChart history={snapshot.scoreHistory} />
        </div>
      ) : null}

      {/* ---- Action plan ---- */}
      <section className="mt-9" aria-labelledby="plan-heading">
        <h2 id="plan-heading" className="text-lg font-semibold tracking-[-0.015em]">
          Your action plan
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          What to do next, in the order that matters.
        </p>
        <div className="mt-5">
          <ActionPlan actions={snapshot.actionPlans} />
        </div>
      </section>
    </PageShell>
  );
}
