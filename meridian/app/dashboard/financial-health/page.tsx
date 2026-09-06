import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { PillarScoreCard } from "@/components/score/pillar-score-card";
import { ScoreGauge } from "@/components/score/score-gauge";
import { ScoreTransparency } from "@/components/results/score-transparency";
import { PillarBars } from "@/components/charts/pillar-bars";
import { InsightGroup } from "@/components/dashboard/insight-card";
import { requireUser } from "@/lib/auth";
import { getDashboardView } from "@/lib/data/dashboard";
import { getScoreSummary } from "@/lib/scoring";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Financial health" };

export default async function FinancialHealthPage() {
  const user = await requireUser("/dashboard/financial-health");
  const { snapshot, stored } = await getDashboardView(user.id);

  if (!stored) {
    return (
      <PageShell>
        <EmptyState
          icon={Sparkles}
          title="No score yet"
          description="Take the assessment and your full breakdown appears here."
          action={
            <Button asChild className="mt-2">
              <Link href="/assessment">
                Start my assessment
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
          className="py-20"
        />
      </PageShell>
    );
  }

  const strengths = stored.pillars.flatMap((p) =>
    p.strengths.map((text, i) => ({
      key: `${p.key}-s-${i}`,
      kind: "strength" as const,
      title: text,
      detail: p.label,
      pillar: p.key,
      severity: "success" as const,
    })),
  );
  const improvements = stored.pillars.flatMap((p) =>
    p.weaknesses.map((text, i) => ({
      key: `${p.key}-w-${i}`,
      kind: "improvement" as const,
      title: text,
      detail: p.label,
      pillar: p.key,
      severity: "warning" as const,
    })),
  );

  return (
    <PageShell>
      <PageHeader
        title="Financial health"
        description={`Scored ${formatDate(stored.completedAt, "long")} under scoring version ${stored.scoringVersion}.`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/results/${snapshot.latestAssessment?.id}`}>
                Full results page
              </Link>
            </Button>
            <Button asChild>
              <Link href="/assessment">New assessment</Link>
            </Button>
          </>
        }
      />

      <div className="mt-7 grid gap-5 lg:grid-cols-[auto_1fr] lg:items-start">
        <div className="surface flex flex-col items-center p-6 lg:w-72">
          <ScoreGauge
            score={stored.overallScore}
            size="md"
            insufficientData={stored.measuredWeight === 0}
          />
          <p className="mt-4 text-center text-sm text-muted-foreground text-pretty">
            {getScoreSummary(stored.overallScore)}
          </p>
        </div>

        <PillarBars pillars={stored.pillars} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stored.pillars.map((pillar, index) => (
          <PillarScoreCard
            key={pillar.key}
            pillar={pillar}
            index={index}
            href={`/dashboard/${pillar.key}`}
          />
        ))}
      </div>

      <div className="mt-9 grid gap-4 lg:grid-cols-2">
        <InsightGroup
          kind="strength"
          insights={strengths}
          emptyMessage="Nothing is at full marks yet."
        />
        <InsightGroup
          kind="improvement"
          insights={improvements}
          emptyMessage="Nothing is pulling your score down."
        />
      </div>

      <div className="mt-9">
        <ScoreTransparency
          pillars={stored.pillars}
          overallScore={stored.overallScore}
          scoringVersion={stored.scoringVersion}
          measuredWeight={stored.measuredWeight}
        />
      </div>
    </PageShell>
  );
}
