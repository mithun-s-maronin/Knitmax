import { cn } from "@/lib/utils";
import { getScoreStatus } from "@/lib/scoring";

/** The status band as a pill, on the same colour ramp as the gauge. */
export function ScoreBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const status = getScoreStatus(score);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        status.textClass,
        status.bgClass,
        status.borderClass,
        className,
      )}
    >
      {status.label}
    </span>
  );
}
