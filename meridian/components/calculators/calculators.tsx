"use client";

import * as React from "react";
import { CircleAlert, PiggyBank, Target, TrendingDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyInput } from "@/components/assessment/currency-input";
import {
  comparePayoffStrategies,
  monthsToSave,
  toPayoffDebts,
  type PayoffStrategy,
} from "@/lib/calculations/debt";
import { emergencyFundTarget } from "@/lib/calculations/goals";
import { formatCurrency, formatMonths } from "@/lib/format";
import type { DebtRow } from "@/types/database";

const STRATEGY_LABELS: Record<PayoffStrategy, string> = {
  minimum: "Minimum payments",
  avalanche: "Avalanche (highest rate first)",
  snowball: "Snowball (smallest balance first)",
};

/** The three calculators from §36, each seeded with the user's real figures. */
export function Calculators({
  currency,
  essentialMonthlyExpenses,
  monthlySavings,
  emergencyFundAmount,
  debts,
}: {
  currency: string;
  essentialMonthlyExpenses: number;
  monthlySavings: number;
  emergencyFundAmount: number;
  debts: DebtRow[];
}) {
  return (
    <Tabs defaultValue="emergency">
      <TabsList>
        <TabsTrigger value="emergency">
          <PiggyBank className="size-4" />
          Emergency fund
        </TabsTrigger>
        <TabsTrigger value="goal">
          <Target className="size-4" />
          Savings goal
        </TabsTrigger>
        <TabsTrigger value="debt">
          <TrendingDown className="size-4" />
          Debt payoff
        </TabsTrigger>
      </TabsList>

      <TabsContent value="emergency" className="mt-6">
        <EmergencyFundCalculator
          currency={currency}
          essentialMonthlyExpenses={essentialMonthlyExpenses}
          monthlySavings={monthlySavings}
          currentFund={emergencyFundAmount}
        />
      </TabsContent>

      <TabsContent value="goal" className="mt-6">
        <SavingsGoalCalculator currency={currency} monthlySavings={monthlySavings} />
      </TabsContent>

      <TabsContent value="debt" className="mt-6">
        <DebtPayoffCalculator currency={currency} debts={debts} />
      </TabsContent>
    </Tabs>
  );
}

function Panel({
  title,
  description,
  children,
  result,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  result: React.ReactNode;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="surface p-5 sm:p-6">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">{description}</p>
        <div className="mt-6 space-y-5">{children}</div>
      </div>
      <div className="surface p-5 sm:p-6 lg:sticky lg:top-20">{result}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-semibold tabular tracking-tight",
          emphasis ? "text-3xl" : "text-xl",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground text-pretty">{hint}</p> : null}
    </div>
  );
}

function EmergencyFundCalculator({
  currency,
  essentialMonthlyExpenses,
  monthlySavings,
  currentFund,
}: {
  currency: string;
  essentialMonthlyExpenses: number;
  monthlySavings: number;
  currentFund: number;
}) {
  const [essentials, setEssentials] = React.useState<number | null>(
    essentialMonthlyExpenses || null,
  );
  const [months, setMonths] = React.useState(6);
  const [saved, setSaved] = React.useState<number | null>(currentFund || null);
  const [contribution, setContribution] = React.useState<number | null>(
    monthlySavings || null,
  );

  const { target } = emergencyFundTarget(essentials ?? 0, months);
  const remaining = Math.max(target - (saved ?? 0), 0);
  const monthsNeeded = monthsToSave(target, saved ?? 0, contribution ?? 0);

  return (
    <Panel
      title="Emergency fund calculator"
      description="A complete fund is six months of essential costs. Three months is where a setback stops being an emergency."
      result={
        <div className="space-y-5">
          <Stat
            label={`${months}-month fund`}
            value={formatCurrency(target, currency)}
            emphasis
          />
          <Stat label="Still to save" value={formatCurrency(remaining, currency)} />
          <Stat
            label="Time to get there"
            value={
              remaining === 0
                ? "Already there"
                : monthsNeeded === null
                  ? "Not on the current plan"
                  : formatMonths(monthsNeeded)
            }
            hint={
              monthsNeeded === null && remaining > 0
                ? "Nothing is being saved each month, so the fund does not grow."
                : undefined
            }
          />
        </div>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="ef-essentials">Essential costs each month</Label>
        <CurrencyInput
          id="ef-essentials"
          value={essentials}
          currency={currency}
          onChange={setEssentials}
        />
        <p className="text-xs text-muted-foreground">
          Housing, food, utilities, transport, healthcare — what would still be
          there next month.
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="ef-months">Months of cover</Label>
          <span className="text-sm font-medium tabular">{months}</span>
        </div>
        <Slider
          id="ef-months"
          className="mt-3"
          min={1}
          max={12}
          step={1}
          value={[months]}
          onValueChange={([value]) => setMonths(value)}
          aria-valuetext={`${months} months`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ef-saved">Already saved</Label>
          <CurrencyInput
            id="ef-saved"
            value={saved}
            currency={currency}
            onChange={setSaved}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ef-contribution">Saving each month</Label>
          <CurrencyInput
            id="ef-contribution"
            value={contribution}
            currency={currency}
            onChange={setContribution}
          />
        </div>
      </div>
    </Panel>
  );
}

function SavingsGoalCalculator({
  currency,
  monthlySavings,
}: {
  currency: string;
  monthlySavings: number;
}) {
  const [target, setTarget] = React.useState<number | null>(null);
  const [saved, setSaved] = React.useState<number | null>(null);
  const [contribution, setContribution] = React.useState<number | null>(
    monthlySavings || null,
  );
  const [rate, setRate] = React.useState("0");

  const months = monthsToSave(
    target ?? 0,
    saved ?? 0,
    contribution ?? 0,
    Number(rate) || 0,
  );

  const completion = React.useMemo(() => {
    if (months === null || months === 0) return null;
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  }, [months]);

  const remaining = Math.max((target ?? 0) - (saved ?? 0), 0);
  const neededForYear = remaining > 0 ? remaining / 12 : 0;

  return (
    <Panel
      title="Savings goal calculator"
      description="How long a target takes at a given contribution, and what it would take to get there in a year."
      result={
        <div className="space-y-5">
          <Stat
            label="Time to reach it"
            value={
              !target
                ? "—"
                : remaining === 0
                  ? "Already there"
                  : months === null
                    ? "Never at this rate"
                    : formatMonths(months)
            }
            emphasis
          />
          <Stat
            label="Arrives around"
            value={
              completion
                ? new Intl.DateTimeFormat(undefined, {
                    month: "long",
                    year: "numeric",
                  }).format(completion)
                : "—"
            }
          />
          <Stat
            label="To get there in a year"
            value={
              neededForYear > 0 ? `${formatCurrency(neededForYear, currency)}/mo` : "—"
            }
          />
        </div>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sg-target">Target amount</Label>
          <CurrencyInput
            id="sg-target"
            value={target}
            currency={currency}
            onChange={setTarget}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sg-saved">Already saved</Label>
          <CurrencyInput
            id="sg-saved"
            value={saved}
            currency={currency}
            onChange={setSaved}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sg-contribution">Saving each month</Label>
          <CurrencyInput
            id="sg-contribution"
            value={contribution}
            currency={currency}
            onChange={setContribution}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sg-rate">Interest rate</Label>
          <div className="relative">
            <Input
              id="sg-rate"
              inputMode="decimal"
              className="pr-8 tabular"
              value={rate}
              onChange={(event) => setRate(event.target.value.replace(/[^0-9.]/g, ""))}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            >
              %
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function DebtPayoffCalculator({
  currency,
  debts,
}: {
  currency: string;
  debts: DebtRow[];
}) {
  const [extra, setExtra] = React.useState<number | null>(null);
  const payoffDebts = React.useMemo(() => toPayoffDebts(debts), [debts]);

  const comparison = React.useMemo(
    () => comparePayoffStrategies(payoffDebts, extra ?? 0),
    [payoffDebts, extra],
  );

  if (payoffDebts.length === 0) {
    return (
      <div className="surface p-8 text-center">
        <p className="font-medium">You have no debts recorded</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground text-pretty">
          Nothing to pay off is the best possible position — the Borrow pillar
          scores 100. If you do carry debt, add it under My financial data and
          this will compare the strategies for you.
        </p>
      </div>
    );
  }

  const best = comparison[comparison.best];

  return (
    <Panel
      title="Debt payoff calculator"
      description="The same money, applied in a different order. Interest accrues monthly and a cleared debt's payment rolls into the next — which is exactly why the order matters."
      result={
        <div className="space-y-5">
          <div>
            <Badge variant="outline" className="border-score-excellent/40 text-score-excellent">
              Best: {comparison.best === "avalanche" ? "Avalanche" : "Snowball"}
            </Badge>
          </div>
          <Stat
            label="Debt free in"
            value={best.months === null ? "Not on this plan" : formatMonths(best.months)}
            emphasis
          />
          <Stat
            label="Interest saved"
            value={formatCurrency(comparison.bestInterestSaved, currency)}
            hint="Against paying only the minimums"
          />
          <Stat
            label="Time saved"
            value={
              comparison.bestMonthsSaved === null
                ? "—"
                : formatMonths(comparison.bestMonthsSaved)
            }
          />
        </div>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="dp-extra">Extra towards debt each month</Label>
        <CurrencyInput
          id="dp-extra"
          value={extra}
          currency={currency}
          onChange={setExtra}
        />
        <p className="text-xs text-muted-foreground">
          On top of the {formatCurrency(
            payoffDebts.reduce((sum, d) => sum + d.monthlyPayment, 0),
            currency,
          )}{" "}
          you already pay each month.
        </p>
      </div>

      <div className="space-y-3">
        {(["minimum", "avalanche", "snowball"] as const).map((strategy) => {
          const result = comparison[strategy];
          const isBest = strategy === comparison.best;

          return (
            <div
              key={strategy}
              className={cn(
                "rounded-xl border p-4",
                isBest && "border-score-excellent/40 bg-score-excellent/[0.05]",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{STRATEGY_LABELS[strategy]}</p>
                <p className="text-sm tabular text-muted-foreground">
                  {result.months === null
                    ? "Does not clear"
                    : formatMonths(result.months)}
                </p>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Interest paid {formatCurrency(result.totalInterest, currency)}
              </p>
              {result.order.length > 1 && strategy !== "minimum" ? (
                <p className="mt-2 text-xs text-muted-foreground text-pretty">
                  Order: {result.order.join(" → ")}
                </p>
              ) : null}
              {result.neverClears ? (
                <p className="mt-2 flex gap-1.5 text-xs text-destructive">
                  <CircleAlert className="mt-0.5 size-3 shrink-0" />
                  At these payments the interest outruns the repayments.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
