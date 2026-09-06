import Link from "next/link";
import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WhatIfSimulator } from "@/components/simulator/what-if-simulator";
import { ImprovementRoadmap } from "@/components/simulator/improvement-roadmap";
import { requireUser } from "@/lib/auth";
import { getDashboardView } from "@/lib/data/dashboard";
import { buildRoadmap, computeCore } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Simulator",
  description: "See what a change would do to your score, before you make it.",
};

export default async function SimulatorPage() {
  const user = await requireUser("/dashboard/simulator");
  const { snapshot, stored } = await getDashboardView(user.id);

  if (!snapshot.hasRecords && !stored) {
    return (
      <PageShell>
        <PageHeader title="Simulator" />
        <EmptyState
          icon={SlidersHorizontal}
          title="Nothing to simulate yet"
          description="Complete your assessment, or add some records under My financial data, and you can try changes against your real figures here."
          action={
            <Button asChild className="mt-2">
              <Link href="/assessment">Start my assessment</Link>
            </Button>
          }
          className="mt-7 py-20"
        />
      </PageShell>
    );
  }

  const core = computeCore(snapshot.liveInput);
  const roadmap = buildRoadmap(snapshot.liveInput, core);

  return (
    <PageShell width="wide">
      <PageHeader
        title="What-if simulator"
        description="Move the sliders and watch your score respond. This runs the same engine your real score comes from, so the projection is exact — and nothing is saved unless you choose to apply it."
      />

      <div className="mt-7">
        <WhatIfSimulator
          baseline={snapshot.liveInput}
          records={{
            incomeSources: snapshot.incomeSources,
            expenses: snapshot.expenses,
            savingsAccounts: snapshot.savingsAccounts,
            debts: snapshot.debts,
          }}
          currency={snapshot.currency}
          storedScore={stored?.overallScore ?? null}
        />
      </div>

      <div className="mt-6">
        <ImprovementRoadmap roadmap={roadmap} />
      </div>
    </PageShell>
  );
}
