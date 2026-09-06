"use client";

import * as React from "react";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/assessment/currency-input";
import { submitCheckIn } from "@/lib/actions/check-in";
import { formatCurrency } from "@/lib/format";
import { scoreFinancialHealth, type ScoringInput } from "@/lib/scoring";

interface FieldSpec {
  key: "monthlyIncome" | "monthlyExpenses" | "monthlySavings" | "emergencyFund";
  label: string;
  help: string;
}

const FIELDS: FieldSpec[] = [
  {
    key: "monthlyIncome",
    label: "Monthly income",
    help: "After tax, from every source.",
  },
  {
    key: "monthlyExpenses",
    label: "Monthly living costs",
    help: "Excluding debt repayments.",
  },
  {
    key: "monthlySavings",
    label: "Saved each month",
    help: "Everything you put aside.",
  },
  {
    key: "emergencyFund",
    label: "Emergency fund balance",
    help: "What is set aside for the unexpected.",
  },
];

/**
 * The monthly check-in (§34).
 *
 * The projected score updates as the figures change, using the same engine as
 * everywhere else. Recording an assessment is optional and opt-out, so a
 * check-in can be a quick data update without adding a point to the trend.
 */
export function CheckInForm({
  baseline,
  currency,
  current,
}: {
  baseline: ScoringInput;
  currency: string;
  current: {
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySavings: number;
    emergencyFund: number;
  };
}) {
  const [values, setValues] = React.useState(current);
  const [notes, setNotes] = React.useState("");
  const [recordAssessment, setRecordAssessment] = React.useState(true);
  const [pending, startTransition] = React.useTransition();

  const before = React.useMemo(() => scoreFinancialHealth(baseline), [baseline]);

  const after = React.useMemo(() => {
    const adjusted: ScoringInput = {
      ...baseline,
      monthlyIncome: values.monthlyIncome,
      monthlyExpenses: values.monthlyExpenses,
      essentialMonthlyExpenses: Math.min(
        baseline.essentialMonthlyExpenses,
        values.monthlyExpenses,
      ),
      monthlySavings: values.monthlySavings,
      emergencyFundAmount: values.emergencyFund,
      totalSavings: Math.max(
        baseline.totalSavings + (values.emergencyFund - current.emergencyFund),
        0,
      ),
    };
    return scoreFinancialHealth(adjusted);
  }, [baseline, values, current.emergencyFund]);

  const delta = after.overallScore - before.overallScore;
  const changed = FIELDS.some((field) => values[field.key] !== current[field.key]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await submitCheckIn({ ...values, notes, recordAssessment });
      // A successful check-in redirects, so reaching here means it failed.
      if (result && !result.ok) {
        toast.error(result.error ?? "That did not save.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-start">
      <div className="surface p-5 sm:p-6">
        <h2 className="font-semibold">Where are you this month?</h2>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          Update anything that has moved. What you leave alone stays as it is.
        </p>

        <div className="mt-6 space-y-5">
          {FIELDS.map((field) => {
            const changedField = values[field.key] !== current[field.key];
            return (
              <div key={field.key} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Label htmlFor={`checkin-${field.key}`}>{field.label}</Label>
                  {changedField ? (
                    <span className="text-xs tabular text-muted-foreground">
                      was {formatCurrency(current[field.key], currency)}
                    </span>
                  ) : null}
                </div>
                <CurrencyInput
                  id={`checkin-${field.key}`}
                  value={values[field.key]}
                  currency={currency}
                  onChange={(next) =>
                    setValues((v) => ({ ...v, [field.key]: next ?? 0 }))
                  }
                />
                <p className="text-xs text-muted-foreground">{field.help}</p>
              </div>
            );
          })}

          <div className="space-y-2">
            <Label htmlFor="checkin-notes">Anything worth noting?</Label>
            <Textarea
              id="checkin-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="A bonus, a big bill, a change of job — whatever explains the numbers."
            />
          </div>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-accent/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring">
          <Checkbox
            checked={recordAssessment}
            onCheckedChange={(value) => setRecordAssessment(value === true)}
            className="mt-0.5"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">
              Record this as a new assessment
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground text-pretty">
              Adds a point to your score history. Your previous assessments are
              kept exactly as they are either way.
            </span>
          </span>
        </label>

        <Button type="submit" size="lg" className="mt-6" loading={pending}>
          <CalendarCheck className="size-4" />
          {recordAssessment ? "Save and score it" : "Save my check-in"}
        </Button>
      </div>

      <div className="surface p-5 sm:p-6 lg:sticky lg:top-20">
        <h2 className="text-sm font-semibold">Where that leaves you</h2>

        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="text-2xl font-semibold tabular text-muted-foreground">
            {before.overallScore}
          </span>
          <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-4xl font-semibold tabular">{after.overallScore}</span>
        </div>

        <p
          className={cn(
            "mt-2 text-center text-sm font-medium",
            delta > 0
              ? "text-score-excellent-ink"
              : delta < 0
                ? "text-destructive-ink"
                : "text-muted-foreground",
          )}
        >
          {delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta} points`}
        </p>

        <ul className="mt-5 space-y-2 border-t pt-4 text-sm">
          {after.pillars.map((pillar) => {
            const was = before.pillars.find((p) => p.key === pillar.key)?.score ?? null;
            const pillarDelta =
              was === null || pillar.score === null ? 0 : pillar.score - was;
            return (
              <li key={pillar.key} className="flex items-center gap-2">
                <span className="min-w-0 flex-1">{pillar.label}</span>
                <span className="tabular font-medium">{pillar.score ?? "—"}</span>
                <span
                  className={cn(
                    "w-8 text-right text-xs tabular",
                    pillarDelta === 0
                      ? "text-muted-foreground"
                      : pillarDelta > 0
                        ? "text-score-excellent-ink"
                        : "text-destructive-ink",
                  )}
                >
                  {pillarDelta === 0
                    ? "—"
                    : `${pillarDelta > 0 ? "+" : ""}${pillarDelta}`}
                </span>
              </li>
            );
          })}
        </ul>

        {!changed ? (
          <p className="mt-5 border-t pt-4 text-xs text-muted-foreground text-pretty">
            Nothing has changed yet. Edit a figure above and this updates as you
            type.
          </p>
        ) : null}
      </div>
    </form>
  );
}
