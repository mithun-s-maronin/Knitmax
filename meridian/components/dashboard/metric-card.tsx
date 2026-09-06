import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** One headline figure, optionally with a change and an explanation. */
export function MetricCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  invertDelta = false,
  explanation,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  deltaLabel?: string;
  /** For metrics where down is good, such as debt. */
  invertDelta?: boolean;
  explanation?: string;
  className?: string;
}) {
  const positive = delta === undefined || delta === null ? null : invertDelta ? delta < 0 : delta > 0;

  const labelNode = explanation ? (
    <Tooltip>
      <TooltipTrigger className="cursor-help rounded text-left underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {label}
      </TooltipTrigger>
      <TooltipContent>{explanation}</TooltipContent>
    </Tooltip>
  ) : (
    label
  );

  return (
    <div className={cn("surface p-4 sm:p-5", className)}>
      <p className="text-xs text-muted-foreground">{labelNode}</p>
      <p className="mt-2 text-2xl font-semibold tabular tracking-tight">{value}</p>

      {hint || (delta !== undefined && delta !== null) ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {delta !== undefined && delta !== null && delta !== 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                positive ? "text-score-excellent" : "text-destructive",
              )}
            >
              {delta > 0 ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {delta > 0 ? "+" : ""}
              {delta}
              {deltaLabel ? ` ${deltaLabel}` : ""}
            </span>
          ) : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
