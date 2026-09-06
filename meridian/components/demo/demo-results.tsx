"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Bot, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/dashboard/page-header";
import { InsightGroup } from "@/components/dashboard/insight-card";
import { PillarDetail } from "@/components/dashboard/pillar-detail";
import { RecommendationCard } from "@/components/dashboard/recommendation-card";
import { PillarScoreCard } from "@/components/score/pillar-score-card";
import { ScoreGauge } from "@/components/score/score-gauge";
import { ScoreTransparency } from "@/components/results/score-transparency";
import { answersToScoringInput } from "@/lib/assessment/toScoringInput";
import { getScoreSummary, scoreFinancialHealth } from "@/lib/scoring";
import { formatCurrency, formatMonths, formatPercent } from "@/lib/format";
import { readDemoAnswers } from "./demo-store";
import { DEMO_ANSWERS } from "@/lib/demo/fixture";
import { useIsHydrated } from "@/hooks/use-is-hydrated";

/** The demo results page: the same components, scored by the same engine. */
export function DemoResults() {
  const hydrated = useIsHydrated();
  // Before hydration the fixture is used, so the server and first client
  // render agree; the visitor's own demo answers are picked up after.
  const answers = React.useMemo(
    () => (hydrated ? readDemoAnswers() : DEMO_ANSWERS),
    [hydrated],
  );

  const input = React.useMemo(() => answersToScoringInput(answers), [answers]);
  const result = React.useMemo(() => scoreFinancialHealth(input), [input]);
  const currency = input.currency;
  const m = result.metrics;

  return (
    <PageShell>
      <section className="relative py-12 text-center sm:py-16">
        <div className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-60" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Financial health score
        </p>
        <div className="mt-7 flex justify-center">
          <ScoreGauge score={result.overallScore} size="lg" />
        </div>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
          {getScoreSummary(result.overallScore)}
        </p>
        <Badge variant="muted" className="mt-5">
          Demo — nothing here is saved
        </Badge>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {result.pillars.map((pillar, index) => (
          <PillarScoreCard key={pillar.key} pillar={pillar} index={index} />
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-[-0.015em]">
          The numbers behind it
        </h2>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            ["Monthly income", formatCurrency(m.monthlyIncome, currency)],
            ["Left after everything", formatCurrency(m.disposableIncome, currency)],
            ["Savings rate", formatPercent(m.savingsRate, 1)],
            ["Emergency fund", formatMonths(m.emergencyFundMonths)],
            ["Total debt", formatCurrency(m.totalDebt, currency)],
            ["Debt-to-income", formatPercent(m.debtToIncomeRatio, 1)],
          ].map(([label, value]) => (
            <div key={label} className="surface p-4">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1.5 text-xl font-semibold tabular tracking-tight">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-[-0.015em]">
          Personalised insights
        </h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <InsightGroup
            kind="strength"
            insights={result.strengths}
            emptyMessage="Nothing is at full marks yet."
          />
          <InsightGroup
            kind="improvement"
            insights={result.improvements}
            emptyMessage="Nothing is pulling the score down."
          />
          <InsightGroup
            kind="action"
            insights={result.actions}
            emptyMessage="No action needed right now."
          />
        </div>
      </section>

      {result.recommendations.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-[-0.015em]">
            What to do, in order
          </h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {result.recommendations.slice(0, 6).map((recommendation) => (
              <RecommendationCard
                key={recommendation.key}
                recommendation={recommendation}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12 space-y-8">
        <h2 className="text-xl font-semibold tracking-[-0.015em]">Pillar by pillar</h2>
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

      <div className="mt-12">
        <ScoreTransparency
          pillars={result.pillars}
          overallScore={result.overallScore}
          scoringVersion={result.scoringVersion}
          measuredWeight={result.measuredWeight}
        />
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <Link
          href="/demo/simulator"
          className="surface p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <SlidersHorizontal className="size-5 text-primary" />
          <p className="mt-3.5 font-semibold">Try a change</p>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            Move the sliders and watch the score respond, live.
          </p>
        </Link>
        <Link
          href="/demo/ai"
          className="surface p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Bot className="size-5 text-primary" />
          <p className="mt-3.5 font-semibold">Ask the assistant</p>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            Have it explain any part of this in plain terms.
          </p>
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/signup">
            Get my real score
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/demo/assessment">Change the answers</Link>
        </Button>
      </div>
    </PageShell>
  );
}
