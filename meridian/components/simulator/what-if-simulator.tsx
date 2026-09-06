"use client";

import * as React from "react";
import { ArrowRight, Play, RotateCcw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScoreGauge } from "@/components/score/score-gauge";
import { applyScenario } from "@/lib/actions/simulator";
import {
  EMPTY_ADJUSTMENTS,
  applyAdjustments,
  planScenarioChanges,
  type ScenarioAdjustments,
  type ScenarioRecords,
} from "@/lib/calculations/scenario";
import { scoreFinancialHealth, type ScoringInput } from "@/lib/scoring";
import { formatCurrency } from "@/lib/format";

interface Lever {
  key: keyof ScenarioAdjustments;
  label: string;
  help: string;
  /** How far the slider can move either way, as a share of monthly income. */
  range: number;
  /** Which direction reads as an improvement, for the hint text. */
  betterWhen: "up" | "down";
}

const LEVERS: Lever[] = [
  {
    key: "monthlyIncomeChange",
    label: "Monthly income",
    help: "A raise, a side income, or a drop.",
    range: 0.5,
    betterWhen: "up",
  },
  {
    key: "monthlyExpensesChange",
    label: "Monthly spending",
    help: "Cutting costs, or taking on a new one.",
    range: 0.5,
    betterWhen: "down",
  },
  {
    key: "monthlySavingsChange",
    label: "Saved each month",
    help: "Changing what you put aside.",
    range: 0.4,
    betterWhen: "up",
  },
  {
    key: "extraDebtPayment",
    label: "Extra towards debt",
    help: "On top of what you already repay.",
    range: 0.3,
    betterWhen: "up",
  },
  {
    key: "emergencyFundChange",
    label: "Emergency fund balance",
    help: "A lump sum in, or out.",
    range: 6,
    betterWhen: "up",
  },
];

/**
 * The what-if simulator (§29).
 *
 * The projection runs the identical scoring engine the real score comes from —
 * the engine is pure, so it runs here in the browser and the numbers are the
 * same ones the server would produce. Nothing is written until "Apply" is
 * confirmed, and the confirmation lists every record that would change.
 */
export function WhatIfSimulator({
  baseline,
  records,
  currency,
  storedScore,
}: {
  baseline: ScoringInput;
  records: ScenarioRecords;
  currency: string;
  storedScore: number | null;
}) {
  const [adjustments, setAdjustments] =
    React.useState<ScenarioAdjustments>(EMPTY_ADJUSTMENTS);
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const current = React.useMemo(() => scoreFinancialHealth(baseline), [baseline]);
  const projected = React.useMemo(
    () => scoreFinancialHealth(applyAdjustments(baseline, adjustments)),
    [baseline, adjustments],
  );

  const changes = React.useMemo(
    () => planScenarioChanges(records, adjustments),
    [records, adjustments],
  );

  const touched = Object.values(adjustments).some((value) => value !== 0);
  const delta = projected.overallScore - current.overallScore;

  const step = Math.max(
    Math.round((baseline.monthlyIncome || 1000) / 100) * 5,
    5,
  );

  const apply = () => {
    startTransition(async () => {
      const result = await applyScenario({ adjustments });
      setConfirming(false);
      if (result.ok) {
        toast.success(
          `Applied to ${result.applied} ${result.applied === 1 ? "record" : "records"}. Take a new assessment to record the score.`,
        );
        setAdjustments(EMPTY_ADJUSTMENTS);
      } else {
        toast.error(result.error ?? "That could not be applied.");
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      {/* ---- Levers ---- */}
      <div className="surface p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Try a change</h2>
          {touched ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdjustments(EMPTY_ADJUSTMENTS)}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          ) : null}
        </div>

        <div className="mt-6 space-y-7">
          {LEVERS.map((lever) => {
            const bound = Math.max(
              Math.round(((baseline.monthlyIncome || 2000) * lever.range) / step) * step,
              step * 4,
            );
            const value = adjustments[lever.key];

            return (
              <div key={lever.key}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Label htmlFor={`lever-${lever.key}`}>{lever.label}</Label>
                  <span
                    className={cn(
                      "text-sm font-medium tabular",
                      value === 0
                        ? "text-muted-foreground"
                        : (lever.betterWhen === "up") === value > 0
                          ? "text-score-excellent"
                          : "text-destructive",
                    )}
                  >
                    {value > 0 ? "+" : ""}
                    {formatCurrency(value, currency)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{lever.help}</p>
                <Slider
                  id={`lever-${lever.key}`}
                  className="mt-3"
                  min={-bound}
                  max={bound}
                  step={step}
                  value={[value]}
                  onValueChange={([next]) =>
                    setAdjustments((current) => ({ ...current, [lever.key]: next }))
                  }
                  aria-label={`${lever.label} change`}
                  aria-valuetext={formatCurrency(value, currency)}
                />
                <div className="mt-1 flex justify-between text-[0.6875rem] text-muted-foreground">
                  <span>{formatCurrency(-bound, currency, { compact: true })}</span>
                  <span>{formatCurrency(bound, currency, { compact: true })}</span>
                </div>
              </div>
            );
          })}
        </div>

        {touched ? (
          <div className="mt-7 border-t pt-5">
            <p className="text-sm font-medium">
              Applying this would change {changes.length}{" "}
              {changes.length === 1 ? "record" : "records"}
            </p>
            {changes.length > 0 ? (
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {changes.map((change, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-foreground">
                      {change.recordName}
                    </span>
                    <span>{change.fieldLabel.toLowerCase()}</span>
                    <span className="tabular">
                      {formatCurrency(change.from, currency)}
                    </span>
                    <ArrowRight className="size-3" aria-hidden />
                    <span className="tabular text-foreground">
                      {formatCurrency(change.to, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground text-pretty">
                There is no record for this change to land on. Add one under My
                financial data first.
              </p>
            )}

            <Button
              className="mt-5"
              disabled={changes.length === 0}
              onClick={() => setConfirming(true)}
            >
              <Play className="size-4" />
              Apply these changes
            </Button>
          </div>
        ) : null}
      </div>

      {/* ---- Projection ---- */}
      <div className="surface p-5 sm:p-6 lg:sticky lg:top-20">
        <h2 className="text-center font-semibold">Projected score</h2>

        <div className="mt-5 flex justify-center">
          <ScoreGauge
            score={projected.overallScore}
            size="sm"
            showStatus
            label="Projected financial health score"
          />
        </div>

        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          <span className="tabular text-muted-foreground">
            {current.overallScore}
          </span>
          <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="tabular font-semibold">{projected.overallScore}</span>
          <Badge
            variant="outline"
            className={
              delta > 0
                ? "border-score-excellent/40 text-score-excellent"
                : delta < 0
                  ? "border-destructive/40 text-destructive"
                  : undefined
            }
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </Badge>
        </div>

        <ul className="mt-6 space-y-2.5 border-t pt-5">
          {projected.pillars.map((pillar) => {
            const before =
              current.pillars.find((p) => p.key === pillar.key)?.score ?? null;
            const pillarDelta =
              before === null || pillar.score === null ? 0 : pillar.score - before;

            return (
              <li key={pillar.key} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1">{pillar.label}</span>
                <span className="tabular text-muted-foreground">{before ?? "—"}</span>
                <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
                <span className="w-7 text-right tabular font-medium">
                  {pillar.score ?? "—"}
                </span>
                <span
                  className={cn(
                    "w-8 text-right text-xs tabular",
                    pillarDelta === 0
                      ? "text-muted-foreground"
                      : pillarDelta > 0
                        ? "text-score-excellent"
                        : "text-destructive",
                  )}
                >
                  {pillarDelta === 0 ? "—" : `${pillarDelta > 0 ? "+" : ""}${pillarDelta}`}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 border-t pt-4 text-xs text-muted-foreground text-pretty">
          This runs the same scoring engine your real score comes from, so the
          projection is exact rather than an estimate. Nothing is saved until
          you apply it.
          {storedScore !== null && storedScore !== current.overallScore ? (
            <>
              {" "}
              Your last recorded score was {storedScore}; the figures above start
              from your current records.
            </>
          ) : null}
        </p>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply this scenario to your records?</AlertDialogTitle>
            <AlertDialogDescription>
              This updates {changes.length}{" "}
              {changes.length === 1 ? "record" : "records"} in your financial
              data. Your completed assessments are not touched — your score will
              only change when you take a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ul className="space-y-1.5 rounded-lg bg-muted/50 p-3.5 text-sm">
            {changes.map((change, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{change.recordName}</span>
                <span className="text-muted-foreground">
                  {change.fieldLabel.toLowerCase()}
                </span>
                <span className="tabular text-muted-foreground">
                  {formatCurrency(change.from, currency)}
                </span>
                <ArrowRight className="size-3" aria-hidden />
                <span className="tabular font-medium">
                  {formatCurrency(change.to, currency)}
                </span>
              </li>
            ))}
          </ul>

          <p className="flex gap-2 text-xs text-muted-foreground">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            You can edit any of these back under My financial data.
          </p>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                apply();
              }}
              disabled={pending}
            >
              {pending ? "Applying" : "Apply changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
