import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DashboardInsight {
  key: string;
  headline: string;
  detail: string;
  /** The question the "Ask about this" button opens the assistant with. */
  prompt: string;
}

/**
 * The dashboard insight panel (§28).
 *
 * The insight itself is derived from the scoring engine, not written by a
 * model, so it is always present and always consistent with the score. The
 * assistant's role is to expand on it when asked, which is what the button
 * does — it opens the chat with this exact question.
 */
export function AiInsightPanel({
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
      aria-labelledby="ai-insight-heading"
    >
      <div className="flex items-center gap-2">
        <Bot className="size-4.5 text-primary" />
        <h2 id="ai-insight-heading" className="font-semibold">
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
              <Link
                href={`/dashboard/ai?prompt=${encodeURIComponent(insight.prompt)}`}
              >
                <Bot className="size-3.5" />
                Ask AI about this
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
