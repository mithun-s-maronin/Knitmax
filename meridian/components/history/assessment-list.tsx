import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score/score-badge";
import { formatDate } from "@/lib/format";
import type { AssessmentRow } from "@/types/database";

const SOURCE_LABELS = {
  assessment: "Full assessment",
  check_in: "Monthly check-in",
  recalculation: "Recalculation",
  simulation_applied: "Applied simulation",
} as const;

/**
 * Every completed assessment (§32).
 *
 * These rows cannot be edited or deleted through the app — the database
 * refuses an update outright and grants no delete policy — so the list is a
 * permanent record rather than a mutable log.
 */
export function AssessmentList({
  assessments,
  className,
}: {
  assessments: AssessmentRow[];
  className?: string;
}) {
  return (
    <ul className={cn("surface divide-y", className)}>
      {assessments.map((assessment, index) => {
        const previous = assessments[index + 1];
        const delta = previous
          ? assessment.overall_score - previous.overall_score
          : null;

        return (
          <li key={assessment.id}>
            <Link
              href={`/dashboard/history/${assessment.id}`}
              className="group flex flex-wrap items-center gap-x-4 gap-y-2 p-5 transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {formatDate(assessment.completed_at, "long")}
                  {index === 0 ? <Badge variant="muted">Latest</Badge> : null}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{SOURCE_LABELS[assessment.source]}</span>
                  <span className="inline-flex items-center gap-1">
                    <Lock className="size-3" aria-hidden />
                    Scoring {assessment.scoring_version}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl font-semibold tabular leading-none">
                    {assessment.overall_score}
                  </p>
                  {delta !== null ? (
                    <p
                      className={cn(
                        "mt-1 text-xs tabular",
                        delta > 0
                          ? "text-score-excellent-ink"
                          : delta < 0
                            ? "text-destructive-ink"
                            : "text-muted-foreground",
                      )}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta}
                    </p>
                  ) : null}
                </div>
                <ScoreBadge score={assessment.overall_score} />
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
