import { ArrowRight, Flag, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Roadmap } from "@/lib/scoring";

const PILLAR_LABELS = {
  spend: "Spend",
  save: "Save",
  borrow: "Borrow",
  plan: "Plan",
  overall: "Overall",
} as const;

/**
 * The path to a better score (§30).
 *
 * Every figure here is measured: each step's gain is the difference the engine
 * produces when that change is applied on top of the ones above it, so the
 * running total is real rather than a sum of overlapping estimates.
 */
export function ImprovementRoadmap({
  roadmap,
  className,
}: {
  roadmap: Roadmap;
  className?: string;
}) {
  if (roadmap.steps.length === 0) {
    return (
      <section className={cn("surface p-6", className)}>
        <h2 className="font-semibold">Path to a better score</h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          {roadmap.currentScore >= 100
            ? "There is nothing left for us to suggest — every component is at full marks."
            : "We cannot find a change that would move your score from here. The remaining ground is in things that take time rather than a single decision."}
        </p>
      </section>
    );
  }

  return (
    <section className={cn("surface p-5 sm:p-6", className)} aria-labelledby="roadmap-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="roadmap-heading" className="font-semibold">
            Path to a better score
          </h2>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Working through these in order would take you from{" "}
            {roadmap.currentScore} to {roadmap.projectedScore}.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-score-excellent/40 text-score-excellent-ink"
        >
          <TrendingUp className="size-3" />+
          {roadmap.projectedScore - roadmap.currentScore} points
        </Badge>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <span className="text-2xl font-semibold tabular">{roadmap.currentScore}</span>
        <Progress
          value={roadmap.projectedScore}
          className="h-2 flex-1"
          indicatorClassName="bg-score-excellent"
          aria-label="Projected score"
        />
        <span className="text-2xl font-semibold tabular text-score-excellent-ink">
          {roadmap.projectedScore}
        </span>
      </div>

      <ol className="mt-7 space-y-4">
        {roadmap.steps.map((step, index) => (
          <li key={step.key} className="flex gap-4">
            <span
              aria-hidden
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary"
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-pretty">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {step.description}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <Badge variant="muted">{PILLAR_LABELS[step.pillar]}</Badge>
                <span className="inline-flex items-center gap-1 tabular text-muted-foreground">
                  {step.from}
                  <ArrowRight className="size-3" aria-hidden />
                  <span className="font-medium text-score-excellent-ink">{step.to}</span>
                </span>
                <span className="text-score-excellent-ink">+{step.gain}</span>
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 flex gap-2 border-t pt-4 text-xs text-muted-foreground text-pretty">
        <Flag className="mt-0.5 size-3.5 shrink-0" />
        Each step is measured with the change above it already applied, so the
        gains add up to the total rather than counting the same ground twice.
      </p>
    </section>
  );
}
