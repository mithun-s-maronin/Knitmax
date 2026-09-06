"use client";

import * as React from "react";
import { CalendarClock, CircleCheck, Plus, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CurrencyInput } from "@/components/assessment/currency-input";
import { RecordFormDialog } from "./record-form-dialog";
import { contributeToGoal } from "@/lib/actions/records";
import { calculateGoalProgress } from "@/lib/calculations/goals";
import { ENTITY_CONFIGS } from "@/lib/financial-data/config";
import { GOAL_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { FinancialGoalRow } from "@/types/database";

/**
 * One goal, with everything the calculator produces: progress, what is left,
 * what it needs each month to land on time, and when it would land at the
 * current savings rate (§19, §36).
 */
export function GoalCard({
  goal,
  currency,
  monthlyContribution,
}: {
  goal: FinancialGoalRow;
  currency: string;
  monthlyContribution: number;
}) {
  const [contributing, setContributing] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [amount, setAmount] = React.useState<number | null>(null);
  const [pending, startTransition] = React.useTransition();

  const progress = calculateGoalProgress(goal, monthlyContribution);
  const target = Number(goal.target_amount);
  const current = Number(goal.current_amount);

  const submit = () => {
    if (!amount || amount <= 0) return;
    startTransition(async () => {
      const result = await contributeToGoal({ id: goal.id, amount });
      if (result.ok) {
        toast.success(`Added ${formatCurrency(amount, currency)} to ${goal.name}.`);
        setContributing(false);
        setAmount(null);
      } else {
        toast.error(result.error ?? "That did not save.");
      }
    });
  };

  return (
    <article
      className={cn(
        "surface p-5",
        progress.isComplete && "border-score-excellent/35 bg-score-excellent/[0.04]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{goal.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {GOAL_CATEGORY_LABELS[goal.category]}
            {goal.priority === 1 ? " · High priority" : ""}
          </p>
        </div>
        {progress.isComplete ? (
          <Badge variant="outline" className="border-score-excellent/40 text-score-excellent-ink">
            <CircleCheck className="size-3" />
            Complete
          </Badge>
        ) : progress.isOverdue ? (
          <Badge variant="outline" className="border-destructive/40 text-destructive-ink">
            <TriangleAlert className="size-3" />
            Past its date
          </Badge>
        ) : goal.status !== "active" ? (
          <Badge variant="muted" className="capitalize">
            {goal.status}
          </Badge>
        ) : null}
      </div>

      {goal.description ? (
        <p className="mt-2.5 line-clamp-2 text-sm text-muted-foreground text-pretty">
          {goal.description}
        </p>
      ) : null}

      <Progress
        value={progress.progress * 100}
        className="mt-4 h-2"
        indicatorClassName={
          progress.isComplete ? "bg-score-excellent" : "bg-pillar-plan"
        }
        aria-label={`${goal.name} progress`}
      />

      <p className="mt-2.5 text-sm tabular">
        <span className="font-medium">{formatCurrency(current, currency)}</span>
        <span className="text-muted-foreground">
          {" "}
          of {formatCurrency(target, currency)} · {formatPercent(progress.progress)}
        </span>
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Still to go</dt>
          <dd className="mt-0.5 font-medium tabular">
            {formatCurrency(progress.remaining, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Target date</dt>
          <dd className="mt-0.5 font-medium">
            {goal.target_date ? formatDate(goal.target_date) : "None set"}
          </dd>
        </div>
        {progress.requiredMonthlyContribution !== null ? (
          <div>
            <dt className="text-xs text-muted-foreground">Needed per month</dt>
            <dd className="mt-0.5 font-medium tabular">
              {formatCurrency(progress.requiredMonthlyContribution, currency)}
            </dd>
          </div>
        ) : null}
        {progress.projectedCompletion ? (
          <div>
            <dt className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3" />
              At your current rate
            </dt>
            <dd className="mt-0.5 font-medium">
              {formatDate(progress.projectedCompletion, "month")}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {!progress.isComplete ? (
          <Button size="sm" onClick={() => setContributing(true)}>
            <Plus className="size-3.5" />
            Add to this
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>

      <Dialog open={contributing} onOpenChange={setContributing}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to {goal.name}</DialogTitle>
            <DialogDescription>
              {formatCurrency(progress.remaining, currency)} left to reach{" "}
              {formatCurrency(target, currency)}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="contribution">Amount to add</Label>
            <CurrencyInput
              id="contribution"
              value={amount}
              currency={currency}
              onChange={setAmount}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setContributing(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} loading={pending} disabled={!amount || amount <= 0}>
              Add it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecordFormDialog
        config={ENTITY_CONFIGS.goals}
        currency={currency}
        open={editing}
        onOpenChange={setEditing}
        record={goal as unknown as Record<string, unknown>}
      />
    </article>
  );
}
