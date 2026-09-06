"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { CalendarClock, CalendarRange, Check, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { setActionStatus } from "@/lib/actions/action-plan";
import type { ActionPlanRow } from "@/types/database";

const HORIZONS = [
  {
    key: "immediate" as const,
    title: "Immediate",
    window: "Next 7 days",
    icon: Zap,
  },
  {
    key: "short_term" as const,
    title: "Short term",
    window: "Next 1–3 months",
    icon: CalendarClock,
  },
  {
    key: "long_term" as const,
    title: "Long term",
    window: "Next 6–12 months",
    icon: CalendarRange,
  },
];

const PRIORITY_TONE = {
  high: "text-destructive-ink",
  medium: "text-score-needs-improvement-ink",
  low: "text-muted-foreground",
} as const;

/**
 * The personalised action plan (§24), grouped by horizon.
 *
 * Completion is persisted, so the plan is the same on the next device and the
 * next visit. Completed items are folded away rather than removed — the record
 * of having done them is part of the point.
 */
export function ActionPlan({ actions }: { actions: ActionPlanRow[] }) {
  const reduceMotion = useReducedMotion();
  const [showCompleted, setShowCompleted] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);

  const active = actions.filter((a) => a.status === "pending");
  const completed = actions.filter((a) => a.status === "completed");

  const toggle = async (action: ActionPlanRow) => {
    const next = action.status === "completed" ? "pending" : "completed";
    setPending(action.id);
    const result = await setActionStatus({ id: action.id, status: next });
    setPending(null);

    if (!result.ok) {
      toast.error(result.error ?? "That did not save.");
      return;
    }
    toast.success(
      next === "completed" ? "Nice — one down." : "Put back on your list.",
    );
  };

  if (actions.length === 0) {
    return (
      <EmptyState
        icon={Check}
        title="Nothing outstanding"
        description="There is no action we would put ahead of what you are already doing. Come back after your next assessment."
      />
    );
  }

  return (
    <div className="space-y-8">
      {HORIZONS.map((horizon) => {
        const items = active.filter((a) => a.horizon === horizon.key);
        if (items.length === 0) return null;

        return (
          <section key={horizon.key} aria-labelledby={`horizon-${horizon.key}`}>
            <div className="flex items-center gap-2.5">
              <horizon.icon className="size-4 text-primary" />
              <h3 id={`horizon-${horizon.key}`} className="font-semibold">
                {horizon.title}
              </h3>
              <Badge variant="muted">{horizon.window}</Badge>
            </div>

            <ul className="mt-4 space-y-3">
              {items.map((action, index) => (
                <motion.li
                  key={action.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="surface flex gap-4 p-4"
                >
                  <button
                    type="button"
                    onClick={() => toggle(action)}
                    disabled={pending === action.id}
                    aria-label={`Mark "${action.title}" as done`}
                    className="mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                  >
                    <Check className="size-3.5 opacity-0 transition-opacity hover:opacity-40" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug text-pretty">{action.title}</p>
                    {action.description ? (
                      <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                        {action.description}
                      </p>
                    ) : null}
                    <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className={cn("font-medium", PRIORITY_TONE[action.priority])}>
                        {action.priority === "high"
                          ? "High priority"
                          : action.priority === "medium"
                            ? "Medium priority"
                            : "Low priority"}
                      </span>
                      {action.impact_points !== null ? (
                        <span className="text-score-excellent-ink">
                          +{Math.round(Number(action.impact_points))} points to your score
                        </span>
                      ) : null}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </section>
        );
      })}

      {active.length === 0 ? (
        <EmptyState
          icon={Check}
          title="Every action is done"
          description="You have worked through the whole plan. Take a new assessment to see where you stand now."
        />
      ) : null}

      {completed.length > 0 ? (
        <div className="border-t pt-6">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            aria-expanded={showCompleted}
            className="rounded text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {showCompleted ? "Hide" : "Show"} {completed.length} completed{" "}
            {completed.length === 1 ? "action" : "actions"}
          </button>

          {showCompleted ? (
            <ul className="mt-4 space-y-2">
              {completed.map((action) => (
                <li
                  key={action.id}
                  className="flex items-center gap-3 rounded-xl border border-dashed p-3.5"
                >
                  <Check className="size-4 shrink-0 text-score-excellent-ink" />
                  <span className="min-w-0 flex-1 text-sm text-muted-foreground line-through">
                    {action.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggle(action)}
                    disabled={pending === action.id}
                  >
                    <RotateCcw className="size-3.5" />
                    Undo
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
