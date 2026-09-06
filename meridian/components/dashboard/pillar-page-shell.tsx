import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { PillarDetail } from "@/components/dashboard/pillar-detail";
import { PillarComponentTable } from "@/components/dashboard/pillar-component-table";
import { ScoreGauge } from "@/components/score/score-gauge";
import { EmptyState } from "@/components/ui/empty-state";
import { Sparkles } from "lucide-react";
import type { PillarResult } from "@/lib/scoring";

/** The common frame for the four pillar pages. */
export function PillarPageShell({
  pillar,
  assessedAt,
  children,
}: {
  pillar: PillarResult | null;
  assessedAt: string | null;
  children?: React.ReactNode;
}) {
  if (!pillar) {
    return (
      <PageShell>
        <EmptyState
          icon={Sparkles}
          title="No score yet"
          description="Take the assessment and this pillar will be scored and explained here."
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

  return (
    <PageShell>
      <PageHeader
        title={pillar.label}
        description={pillar.description}
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/simulator">See what a change would do</Link>
          </Button>
        }
      />

      <div className="mt-7 grid gap-5 lg:grid-cols-[auto_1fr] lg:items-start">
        <div className="surface flex flex-col items-center p-6 lg:w-64">
          <ScoreGauge
            score={pillar.score ?? 0}
            size="sm"
            label={`${pillar.label} score`}
            insufficientData={pillar.score === null}
          />
          <p className="mt-4 text-center text-xs text-muted-foreground text-pretty">
            {Math.round(pillar.weight * 100)}% of your overall score
            {assessedAt ? ` · measured ${assessedAt}` : ""}
          </p>
        </div>

        <PillarDetail pillar={pillar} />
      </div>

      <section className="mt-9" aria-labelledby="components-heading">
        <h2 id="components-heading" className="text-lg font-semibold tracking-[-0.015em]">
          What was measured
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Each component, its measured value, and the points it contributed.
        </p>
        <PillarComponentTable pillar={pillar} className="mt-4" />
      </section>

      {children}
    </PageShell>
  );
}
