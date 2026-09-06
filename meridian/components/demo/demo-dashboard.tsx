"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { InsightGroup } from "@/components/dashboard/insight-card";
import { RecommendationCard } from "@/components/dashboard/recommendation-card";
import { PillarScoreCard } from "@/components/score/pillar-score-card";
import { ScoreGauge } from "@/components/score/score-gauge";
import { ScoreHistoryChart } from "@/components/charts/score-history-chart";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { ImprovementRoadmap } from "@/components/simulator/improvement-roadmap";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants";
import {
  buildRoadmap,
  computeCore,
  getScoreSummary,
  scoreFinancialHealth,
} from "@/lib/scoring";
import { answersToScoringInput } from "@/lib/assessment/toScoringInput";
import { totalRecords } from "@/lib/calculations/fromRecords";
import { calculateNetWorth } from "@/lib/calculations/netWorth";
import {
  DEMO_ANSWERS,
  DEMO_NET_WORTH,
  DEMO_RECORDS,
  DEMO_SCORE_HISTORY,
} from "@/lib/demo/fixture";
import { formatCurrency, formatMonths, formatPercent } from "@/lib/format";
import { readDemoAnswers, resetDemo, hasCustomDemoAnswers } from "./demo-store";
import { useIsHydrated } from "@/hooks/use-is-hydrated";

/**
 * The demo dashboard.
 *
 * It renders the same components the real dashboard does, scored by the same
 * engine — the only difference is where the numbers come from. When a visitor
 * has walked the demo assessment, their own answers are scored instead of the
 * fixture's.
 */
export function DemoDashboard() {
  const hydrated = useIsHydrated();

  // Before hydration the fixture is used, so the server and first client
  // render agree; the visitor's own demo answers are picked up after.
  const answers = React.useMemo(
    () => (hydrated ? readDemoAnswers() : DEMO_ANSWERS),
    [hydrated],
  );
  const custom = hydrated && hasCustomDemoAnswers();

  const input = React.useMemo(() => answersToScoringInput(answers), [answers]);
  const result = React.useMemo(() => scoreFinancialHealth(input), [input]);
  const roadmap = React.useMemo(
    () => buildRoadmap(input, computeCore(input)),
    [input],
  );

  const currency = input.currency;
  const m = result.metrics;

  // The record-level breakdowns only make sense for the fixture persona.
  const totals = React.useMemo(() => totalRecords(DEMO_RECORDS), []);
  const netWorth = React.useMemo(
    () =>
      calculateNetWorth({
        assets: [],
        liabilities: [],
        debts: DEMO_RECORDS.debts,
        savingsAccounts: DEMO_RECORDS.savingsAccounts,
      }),
    [],
  );

  const history = React.useMemo(() => {
    // Append the current score so the trend ends where the demo actually is.
    const base = DEMO_SCORE_HISTORY.slice(0, -1);
    return [
      ...base,
      {
        ...DEMO_SCORE_HISTORY[DEMO_SCORE_HISTORY.length - 1],
        overall_score: result.overallScore,
        spend_score: result.spend.score,
        save_score: result.save.score,
        borrow_score: result.borrow.score,
        plan_score: result.plan.score,
      },
    ];
  }, [result]);

  const strengths = result.strengths;
  const improvements = result.improvements;

  return (
    <PageShell>
      <PageHeader
        title={custom ? "Your demo score" : "Meet Alex"}
        description={
          custom
            ? "Scored from the answers you gave in the demo assessment, by the same engine the real product uses."
            : "An example person with an example set of finances. Everything below is calculated from their figures by the real scoring engine — take the demo assessment to see your own."
        }
        actions={
          <>
            {custom ? (
              <Button
                variant="outline"
                onClick={() => {
                  resetDemo();
                  window.location.reload();
                }}
              >
                <RotateCcw className="size-4" />
                Reset the demo
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/demo/assessment">
                Try the assessment
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-7 grid gap-5 lg:grid-cols-[auto_1fr] lg:items-start">
        <div className="surface flex flex-col items-center p-6 lg:w-72">
          <ScoreGauge score={result.overallScore} size="md" />
          <Badge variant="muted" className="mt-4">
            Example data
          </Badge>
          <p className="mt-3 text-center text-sm text-muted-foreground text-pretty">
            {getScoreSummary(result.overallScore)}
          </p>
          <Button asChild variant="ghost" size="sm" className="mt-3">
            <Link href="/demo/results">See the full breakdown</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Monthly income"
            value={formatCurrency(m.monthlyIncome, currency)}
          />
          <MetricCard
            label="Left each month"
            value={formatCurrency(m.disposableIncome, currency)}
            hint="After living costs and repayments"
          />
          <MetricCard
            label="Savings rate"
            value={formatPercent(m.savingsRate, 1)}
            hint="20% scores full marks"
          />
          <MetricCard
            label="Emergency fund"
            value={formatMonths(m.emergencyFundMonths)}
            hint="Six months is complete"
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
            value={formatCurrency(netWorth.netWorth, currency)}
            hint="Savings minus debts"
          />
        </div>
      </div>

      {result.alerts.length > 0 ? (
        <div className="mt-7">
          <AlertsPanel alerts={result.alerts} />
        </div>
      ) : null}

      <section className="mt-9" aria-labelledby="demo-pillars">
        <h2 id="demo-pillars" className="text-lg font-semibold tracking-[-0.015em]">
          The four pillars
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {result.pillars.map((pillar, index) => (
            <PillarScoreCard key={pillar.key} pillar={pillar} index={index} />
          ))}
        </div>
      </section>

      <div className="mt-9 grid gap-4 lg:grid-cols-2">
        <InsightGroup
          kind="strength"
          insights={strengths}
          emptyMessage="Nothing is at full marks yet."
        />
        <InsightGroup
          kind="improvement"
          insights={improvements}
          emptyMessage="Nothing is pulling the score down."
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ScoreHistoryChart history={history} />
        {!custom ? (
          <CategoryDonut
            slices={Object.entries(totals.expensesByCategory).map(([key, value]) => ({
              label:
                EXPENSE_CATEGORY_LABELS[key as keyof typeof EXPENSE_CATEGORY_LABELS] ??
                key,
              value,
            }))}
            currency={currency}
            description="Where the money goes each month."
          />
        ) : (
          <NetWorthChart snapshots={DEMO_NET_WORTH} currency={currency} />
        )}
      </div>

      {result.recommendations.length > 0 ? (
        <section className="mt-9" aria-labelledby="demo-recommendations">
          <h2 id="demo-recommendations" className="text-lg font-semibold tracking-[-0.015em]">
            What to do, in order
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            The point figures are measured by re-running the scoring engine with
            each change applied — the same way the real product does it.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {result.recommendations.slice(0, 4).map((recommendation) => (
              <RecommendationCard
                key={recommendation.key}
                recommendation={recommendation}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-9">
        <ImprovementRoadmap roadmap={roadmap} />
      </div>

      <div className="mt-9 flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/[0.05] p-6 sm:flex-row sm:items-center">
        <SlidersHorizontal className="size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">This is the whole product, on example data</p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Create an account and it runs on your figures instead — saved
            permanently, private to you, and yours to export or delete whenever
            you want.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/signup">Get my real score</Link>
        </Button>
      </div>
    </PageShell>
  );
}
