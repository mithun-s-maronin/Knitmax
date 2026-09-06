import { ArrowUpRight, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Recommendation } from "@/lib/scoring";

const PRIORITY_STYLES = {
  high: "border-destructive/30 bg-destructive/[0.06] text-destructive-ink",
  medium: "border-score-fair/40 bg-score-fair/10 text-score-needs-improvement-ink",
  low: "border-border bg-muted text-muted-foreground",
} as const;

const PRIORITY_LABELS = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
} as const;

const PILLAR_LABELS = {
  spend: "Spend",
  save: "Save",
  borrow: "Borrow",
  plan: "Plan",
  overall: "Overall",
} as const;

/**
 * One recommendation.
 *
 * The impact figure comes from re-running the scoring engine against the
 * change, so it is shown as a measured value. When a change cannot be
 * expressed as an input adjustment there is no figure at all, rather than an
 * invented one (§23).
 */
export function RecommendationCard({
  recommendation,
  action,
  className,
}: {
  recommendation: Recommendation;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("surface p-5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn("border", PRIORITY_STYLES[recommendation.priority])}
        >
          {PRIORITY_LABELS[recommendation.priority]}
        </Badge>
        <Badge variant="muted">{PILLAR_LABELS[recommendation.pillar]}</Badge>
        {recommendation.estimatedImpact !== null ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-score-excellent/12 px-2.5 py-0.5 text-xs font-medium text-score-excellent-ink">
            <TrendingUp className="size-3" />
            +{recommendation.estimatedImpact} points
          </span>
        ) : null}
      </div>

      <h3 className="mt-3.5 font-semibold leading-snug text-pretty">
        {recommendation.title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">
        {recommendation.description}
      </p>

      <p className="mt-3 flex gap-2 border-t pt-3 text-sm text-muted-foreground text-pretty">
        <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          <span className="font-medium text-foreground">Why it matters: </span>
          {recommendation.why}
        </span>
      </p>

      {action ? <div className="mt-4">{action}</div> : null}
    </article>
  );
}
