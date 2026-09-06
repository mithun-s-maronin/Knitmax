"use client";

import * as React from "react";
import Link from "next/link";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { WhatIfSimulator } from "@/components/simulator/what-if-simulator";
import { ImprovementRoadmap } from "@/components/simulator/improvement-roadmap";
import { answersToScoringInput } from "@/lib/assessment/toScoringInput";
import { buildRoadmap, computeCore } from "@/lib/scoring";
import { DEMO_ANSWERS, DEMO_RECORDS } from "@/lib/demo/fixture";
import { readDemoAnswers } from "@/components/demo/demo-store";
import { useIsHydrated } from "@/hooks/use-is-hydrated";

export default function DemoSimulatorPage() {
  const hydrated = useIsHydrated();
  const answers = React.useMemo(
    () => (hydrated ? readDemoAnswers() : DEMO_ANSWERS),
    [hydrated],
  );

  const input = React.useMemo(() => answersToScoringInput(answers), [answers]);
  const roadmap = React.useMemo(
    () => buildRoadmap(input, computeCore(input)),
    [input],
  );

  return (
    <PageShell width="wide">
      <PageHeader
        title="What-if simulator"
        description="Move the sliders and watch the score respond. This is the real scoring engine running in your browser, so the projection is exact — not an approximation for the demo."
        actions={
          <Button asChild>
            <Link href="/signup">Try it on my own numbers</Link>
          </Button>
        }
      />

      <div className="mt-7">
        <WhatIfSimulator
          baseline={input}
          records={DEMO_RECORDS}
          currency={input.currency}
          storedScore={null}
          allowApply={false}
        />
      </div>

      <div className="mt-6">
        <ImprovementRoadmap roadmap={roadmap} />
      </div>
    </PageShell>
  );
}
