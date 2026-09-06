import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { PillarResult } from "@/lib/scoring";

const BAR = {
  spend: "bg-pillar-spend",
  save: "bg-pillar-save",
  borrow: "bg-pillar-borrow",
  plan: "bg-pillar-plan",
} as const;

/**
 * What each component of a pillar measured, and what it contributed (§22).
 *
 * Rendered as a definition-style list rather than a dense table so it reads on
 * a phone; the full tabular version lives on the results page.
 */
export function PillarComponentTable({
  pillar,
  className,
}: {
  pillar: PillarResult;
  className?: string;
}) {
  return (
    <div className={cn("surface divide-y", className)}>
      {pillar.breakdown.map((component) => (
        <div key={component.key} className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">{component.label}</p>
            <p className="text-sm tabular text-muted-foreground">
              {component.status === "ok"
                ? `${Math.round(component.score ?? 0)} / 100 · ${Math.round(
                    component.effectiveWeight * 100,
                  )}% of ${pillar.label}`
                : "Not enough information"}
            </p>
          </div>

          {component.status === "ok" ? (
            <Progress
              value={component.score ?? 0}
              className="mt-3 h-1.5"
              indicatorClassName={BAR[pillar.key]}
              aria-label={`${component.label} score`}
            />
          ) : null}

          <dl className="mt-3.5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{component.metric.label}</dt>
              <dd className="font-medium tabular">{component.metric.display}</dd>
            </div>
            {component.metric.target ? (
              <div>
                <dt className="text-xs text-muted-foreground">Target</dt>
                <dd className="font-medium tabular">{component.metric.target}</dd>
              </div>
            ) : null}
            {component.contribution !== null ? (
              <div>
                <dt className="text-xs text-muted-foreground">Points contributed</dt>
                <dd className="font-medium tabular">
                  {component.contribution.toFixed(1)}
                </dd>
              </div>
            ) : null}
          </dl>

          <p className="mt-3 text-sm text-muted-foreground text-pretty">
            {component.explanation}
          </p>
        </div>
      ))}
    </div>
  );
}
