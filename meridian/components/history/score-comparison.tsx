import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { getScoreStatus } from "@/lib/scoring";
import { formatDate } from "@/lib/format";

export interface ComparisonPoint {
  label: string;
  before: number | null;
  after: number | null;
}

/**
 * Two assessments side by side (§33).
 *
 * Both numbers are shown, not just the difference, because a delta with no
 * anchor tells you nothing about where you actually are.
 */
export function ScoreComparison({
  beforeLabel,
  afterLabel,
  beforeDate,
  afterDate,
  overall,
  pillars,
  className,
}: {
  beforeLabel: string;
  afterLabel: string;
  beforeDate?: string;
  afterDate?: string;
  overall: ComparisonPoint;
  pillars: ComparisonPoint[];
  className?: string;
}) {
  const overallDelta =
    overall.before === null || overall.after === null
      ? null
      : overall.after - overall.before;

  return (
    <div className={cn("surface p-6 sm:p-8", className)}>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-center">
        <Side
          label={beforeLabel}
          date={beforeDate}
          score={overall.before}
        />
        <ArrowRight className="hidden size-5 shrink-0 text-muted-foreground sm:block" aria-hidden />
        <Side label={afterLabel} date={afterDate} score={overall.after} emphasis />
      </div>

      {overallDelta !== null ? (
        <p
          className={cn(
            "mt-6 flex items-center justify-center gap-2 text-lg font-semibold",
            overallDelta > 0
              ? "text-score-excellent"
              : overallDelta < 0
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {overallDelta > 0 ? (
            <TrendingUp className="size-5" />
          ) : overallDelta < 0 ? (
            <TrendingDown className="size-5" />
          ) : (
            <Minus className="size-5" />
          )}
          {overallDelta > 0 ? "+" : ""}
          {overallDelta} {overallDelta === 0 ? "— no change overall" : "points overall"}
        </p>
      ) : null}

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {pillars.map((pillar) => {
          const delta =
            pillar.before === null || pillar.after === null
              ? null
              : pillar.after - pillar.before;

          return (
            <li
              key={pillar.label}
              className="flex items-center gap-3 rounded-xl border p-4"
            >
              <span className="min-w-0 flex-1 font-medium">{pillar.label}</span>
              <span className="tabular text-muted-foreground">
                {pillar.before ?? "—"}
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="tabular font-semibold">{pillar.after ?? "—"}</span>
              <span
                className={cn(
                  "w-12 shrink-0 text-right text-sm font-medium tabular",
                  delta === null || delta === 0
                    ? "text-muted-foreground"
                    : delta > 0
                      ? "text-score-excellent"
                      : "text-destructive",
                )}
              >
                {delta === null ? "—" : delta === 0 ? "0" : `${delta > 0 ? "+" : ""}${delta}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Side({
  label,
  date,
  score,
  emphasis = false,
}: {
  label: string;
  date?: string;
  score: number | null;
  emphasis?: boolean;
}) {
  const status = score === null ? null : getScoreStatus(score);

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-semibold tabular tracking-tight",
          emphasis ? "text-5xl" : "text-4xl text-muted-foreground",
        )}
      >
        {score ?? "—"}
      </p>
      {status ? (
        <p className={cn("mt-1 text-sm font-medium", status.textClass)}>{status.label}</p>
      ) : null}
      {date ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(date)}</p>
      ) : null}
    </div>
  );
}
