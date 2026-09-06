import Link from "next/link";
import { Lightbulb, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DashboardInsight {
  key: string;
  headline: string;
  detail: string;
  /** Where to go to act on this. */
  href: string;
  hrefLabel: string;
}

/**
 * The dashboard insight panel (§28).
 *
 * Everything here is derived from the scoring engine, so it is always present,
 * always consistent with the score, and needs nothing external to produce.
 */
export function InsightPanel({
  insights,
  className,
}: {
  insights: DashboardInsight[];
  className?: string;
}) {
  if (insights.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-primary/20 bg-primary/[0.045] p-5 sm:p-6",
        className,
      )}
      aria-labelledby="insight-heading"
    >
      <div className="flex items-center gap-2">
        <Lightbulb className="size-4.5 text-primary" />
        <h2 id="insight-heading" className="font-semibold">
          Financial insight
        </h2>
        <Badge variant="muted" className="ml-auto">
          <Sparkles className="size-3" />
          From your numbers
        </Badge>
      </div>

      <ul className="mt-4 space-y-5">
        {insights.map((insight) => (
          <li key={insight.key}>
            <p className="font-medium text-pretty">{insight.headline}</p>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              {insight.detail}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 bg-background">
              <Link href={insight.href}>{insight.hrefLabel}</Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
