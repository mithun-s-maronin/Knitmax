import Link from "next/link";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

/**
 * The recalculation prompt (§75).
 *
 * Editing a record never rewrites a completed assessment. When the numbers
 * drift, the user is told and offered a new assessment — the old one stays
 * exactly as it was.
 */
export function RecalculatePrompt({
  lastAssessedAt,
  liveScore,
  storedScore,
}: {
  lastAssessedAt: string;
  liveScore: number;
  storedScore: number;
}) {
  const delta = liveScore - storedScore;

  return (
    <div className="no-print flex flex-col gap-4 rounded-xl border border-primary/25 bg-primary/[0.05] p-5 sm:flex-row sm:items-center">
      <RefreshCw className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Your financial data has changed</p>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Your score of {storedScore} is from{" "}
          {formatDate(lastAssessedAt, "long")}. On the figures you have now it
          would be around {liveScore}
          {delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta})` : ""}. Take a new
          assessment to record it — your existing one is kept either way.
        </p>
      </div>
      <Button asChild className="shrink-0">
        <Link href="/assessment">Recalculate my score</Link>
      </Button>
    </div>
  );
}
