import Link from "next/link";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Alert as ScoringAlert } from "@/lib/scoring";

const SEVERITY = {
  critical: {
    icon: CircleAlert,
    ring: "border-destructive/30 bg-destructive/[0.06]",
    tone: "text-destructive",
    label: "High priority",
  },
  warning: {
    icon: TriangleAlert,
    ring: "border-score-fair/35 bg-score-fair/[0.09]",
    tone: "text-score-needs-improvement",
    label: "Warning",
  },
  info: {
    icon: Info,
    ring: "border-primary/25 bg-primary/[0.05]",
    tone: "text-primary",
    label: "Opportunity",
  },
  success: {
    icon: Info,
    ring: "border-score-excellent/25 bg-score-excellent/[0.07]",
    tone: "text-score-excellent",
    label: "Good news",
  },
} as const;

/**
 * The deterministic alerts (§35).
 *
 * These come from the scoring engine's own thresholds, not from a model, so
 * the important warnings are present whether or not the AI assistant is
 * available or switched on.
 */
export function AlertsPanel({
  alerts,
  className,
}: {
  alerts: ScoringAlert[];
  className?: string;
}) {
  if (alerts.length === 0) return null;

  return (
    <section className={cn("space-y-3", className)} aria-labelledby="alerts-heading">
      <h2 id="alerts-heading" className="sr-only">
        Alerts
      </h2>
      {alerts.map((alert) => {
        const style = SEVERITY[alert.severity];
        const Icon = style.icon;

        return (
          <div
            key={alert.key}
            role="alert"
            className={cn("flex gap-3 rounded-xl border p-4", style.ring)}
          >
            <Icon className={cn("mt-0.5 size-4.5 shrink-0", style.tone)} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {alert.title}
                <span className={cn("text-xs font-normal", style.tone)}>{style.label}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {alert.message}
              </p>
              {alert.href ? (
                <Link
                  href={alert.href}
                  className="mt-2 inline-block rounded text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Look at this
                </Link>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}
