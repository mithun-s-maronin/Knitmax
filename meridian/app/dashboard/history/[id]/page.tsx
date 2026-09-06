import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, GitCompare, Lock } from "lucide-react";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PillarScoreCard } from "@/components/score/pillar-score-card";
import { ScoreGauge } from "@/components/score/score-gauge";
import { ScoreTransparency } from "@/components/results/score-transparency";
import { RecommendationCard } from "@/components/dashboard/recommendation-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { getAssessment, getAssessments } from "@/lib/data/assessments";
import { getScoreSummary, readStoredResult } from "@/lib/scoring";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Assessment" };

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/history/${id}`);

  const record = await getAssessment(user.id, id);
  if (!record) notFound();

  const result = readStoredResult(record.assessment);
  const all = await getAssessments(user.id);
  const index = all.findIndex((a) => a.id === id);
  const previous = index >= 0 ? all[index + 1] : undefined;

  // Answers grouped by the section they were asked in.
  const sections = new Map<string, typeof record.answers>();
  for (const answer of record.answers) {
    const key = answer.section ?? "Other";
    sections.set(key, [...(sections.get(key) ?? []), answer]);
  }

  return (
    <PageShell>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/dashboard/history">
          <ArrowLeft className="size-4" />
          All assessments
        </Link>
      </Button>

      <PageHeader
        title={formatDate(result.completedAt, "long")}
        description="This is a permanent record. It cannot be edited or recalculated, and a later change to the formulas will not touch it."
        actions={
          previous ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/history/compare?a=${previous.id}&b=${id}`}>
                <GitCompare className="size-4" />
                Compare with previous
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mt-7 flex flex-wrap items-center gap-2">
        <Badge variant="muted">
          <Lock className="size-3" />
          Scoring {result.scoringVersion}
        </Badge>
        <Badge variant="muted">Questions {result.assessmentVersion}</Badge>
        <Badge variant="muted">{result.currency}</Badge>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[auto_1fr] lg:items-start">
        <div className="surface flex flex-col items-center p-6 lg:w-72">
          <ScoreGauge
            score={result.overallScore}
            size="md"
            insufficientData={result.measuredWeight === 0}
          />
          <p className="mt-4 text-center text-sm text-muted-foreground text-pretty">
            {getScoreSummary(result.overallScore)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {result.pillars.map((pillar, i) => (
            <PillarScoreCard key={pillar.key} pillar={pillar} index={i} />
          ))}
        </div>
      </div>

      {result.recommendations.length > 0 ? (
        <section className="mt-9" aria-labelledby="then-recommendations">
          <h2 id="then-recommendations" className="text-lg font-semibold tracking-[-0.015em]">
            What we recommended at the time
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {result.recommendations.slice(0, 4).map((recommendation) => (
              <RecommendationCard key={recommendation.key} recommendation={recommendation} />
            ))}
          </div>
        </section>
      ) : null}

      {record.answers.length > 0 ? (
        <section className="mt-9" aria-labelledby="answers-heading">
          <h2 id="answers-heading" className="text-lg font-semibold tracking-[-0.015em]">
            Your answers
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Exactly what was entered, stored alongside the score it produced.
          </p>

          <div className="mt-4 space-y-5">
            {[...sections.entries()].map(([section, answers]) => (
              <div key={section} className="surface overflow-hidden">
                <h3 className="border-b bg-muted/40 px-5 py-3 text-sm font-semibold">
                  {section}
                </h3>
                <Table>
                  <TableHeader className="sr-only">
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Answer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {answers.map((answer) => (
                      <TableRow key={answer.id}>
                        <TableCell className="w-2/3 text-muted-foreground text-pretty">
                          {answer.question}
                        </TableCell>
                        <TableCell className="font-medium tabular">
                          {answer.answer}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-9">
        <ScoreTransparency
          pillars={result.pillars}
          overallScore={result.overallScore}
          scoringVersion={result.scoringVersion}
          measuredWeight={result.measuredWeight}
        />
      </div>
    </PageShell>
  );
}
