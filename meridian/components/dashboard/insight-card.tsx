import { CircleAlert, CircleCheck, Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/scoring";

const KIND_STYLES = {
  strength: {
    icon: CircleCheck,
    tone: "text-score-excellent-ink",
    ring: "border-score-excellent/25 bg-score-excellent/[0.07]",
    heading: "Strengths",
  },
  improvement: {
    icon: CircleAlert,
    tone: "text-score-needs-improvement-ink",
    ring: "border-score-fair/30 bg-score-fair/[0.08]",
    heading: "Areas to improve",
  },
  action: {
    icon: Lightbulb,
    tone: "text-primary",
    ring: "border-primary/25 bg-primary/[0.06]",
    heading: "Recommended actions",
  },
} as const;

/** A grouped list of insights of one kind (§23). */
export function InsightGroup({
  kind,
  insights,
  emptyMessage,
  className,
}: {
  kind: Insight["kind"];
  insights: Insight[];
  emptyMessage: string;
  className?: string;
}) {
  const style = KIND_STYLES[kind];
  const Icon = style.icon;

  return (
    <section
      className={cn("rounded-2xl border p-5", style.ring, className)}
      aria-labelledby={`insights-${kind}`}
    >
      <h3
        id={`insights-${kind}`}
        className="flex items-center gap-2 text-sm font-semibold"
      >
        <Icon className={cn("size-4", style.tone)} />
        {style.heading}
        <span className="ml-auto text-xs font-normal tabular text-muted-foreground">
          {insights.length}
        </span>
      </h3>

      {insights.length === 0 ? (
        <p className="mt-3.5 text-sm text-muted-foreground text-pretty">{emptyMessage}</p>
      ) : (
        <ul className="mt-3.5 space-y-3">
          {insights.map((insight) => (
            <li key={insight.key} className="text-sm">
              <p className="text-foreground/90 text-pretty">{insight.title}</p>
              {insight.detail && insight.detail !== insight.title ? (
                <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
                  {insight.detail}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
