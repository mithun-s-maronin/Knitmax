import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FileText } from "lucide-react";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreBadge } from "@/components/score/score-badge";
import { requireUser } from "@/lib/auth";
import { getAssessments } from "@/lib/data/assessments";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Reports",
  description: "A complete financial health report, ready to print or save as a PDF.",
};

export default async function ReportsPage() {
  const user = await requireUser("/dashboard/reports");
  const assessments = await getAssessments(user.id);

  if (assessments.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Reports" />
        <EmptyState
          icon={FileText}
          title="No report to generate yet"
          description="Reports are built from a completed assessment. Take one and a full report becomes available here."
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

  return (
    <PageShell>
      <PageHeader
        title="Reports"
        description="A full report for any assessment: the score and its breakdown, your financial summary, strengths and weaknesses, the recommendations made at the time, your outstanding actions, and your score history. Built from stored data — nothing is regenerated or estimated."
      />

      <ul className="surface mt-7 divide-y">
        {assessments.map((assessment, index) => (
          <li key={assessment.id}>
            <Link
              href={`/dashboard/reports/${assessment.id}`}
              className="group flex flex-wrap items-center gap-4 p-5 transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <FileText className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  Report · {formatDate(assessment.completed_at, "long")}
                  {index === 0 ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      Most recent
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Scoring version {assessment.scoring_version}
                </p>
              </div>
              <span className="text-2xl font-semibold tabular">
                {assessment.overall_score}
              </span>
              <ScoreBadge score={assessment.overall_score} />
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
