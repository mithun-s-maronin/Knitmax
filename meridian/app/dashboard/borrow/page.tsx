import type { Metadata } from "next";

import { PillarPageShell } from "@/components/dashboard/pillar-page-shell";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth";
import { getDashboardView } from "@/lib/data/dashboard";
import { DEBT_TYPE_LABELS } from "@/lib/constants";
import { THRESHOLDS } from "@/lib/scoring";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Borrow" };

export default async function BorrowPage() {
  const user = await requireUser("/dashboard/borrow");
  const { snapshot, stored } = await getDashboardView(user.id);
  const currency = snapshot.currency;
  const totals = snapshot.totals;
  const m = snapshot.liveResult.metrics;

  return (
    <PillarPageShell
      pillar={stored?.borrow ?? null}
      assessedAt={stored ? formatDate(stored.completedAt, "long") : null}
      askPrompt="Help me plan the fastest way to pay down my debt."
    >
      <section className="mt-9" aria-labelledby="debt-dashboard">
        <h2 id="debt-dashboard" className="text-lg font-semibold tracking-[-0.015em]">
          Debt dashboard
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total debt"
            value={formatCurrency(totals.totalDebt, currency)}
          />
          <MetricCard
            label="Monthly repayments"
            value={formatCurrency(totals.monthlyDebtPayments, currency)}
            hint={
              m.debtPaymentRatio !== null
                ? `${formatPercent(m.debtPaymentRatio, 1)} of income`
                : undefined
            }
          />
          <MetricCard
            label="Debt-to-income"
            value={formatPercent(m.debtToIncomeRatio, 1)}
            hint="Total debt against a year of income"
            explanation="Under 20% scores full marks; at 70% or above this component scores nothing."
          />
          <MetricCard
            label={`At ${THRESHOLDS.highInterestRate}% or more`}
            value={formatCurrency(totals.highInterestDebt, currency)}
            hint={
              totals.totalDebt > 0
                ? `${formatPercent(totals.highInterestDebt / totals.totalDebt)} of your debt`
                : "No debt"
            }
          />
        </div>

        {snapshot.debts.length > 0 ? (
          <div className="surface mt-5 divide-y">
            <div className="flex items-baseline justify-between gap-3 p-5">
              <h3 className="font-semibold">Your debts</h3>
              <p className="text-sm text-muted-foreground">Highest rate first</p>
            </div>
            {snapshot.debts.map((debt) => {
              const rate = Number(debt.interest_rate);
              const expensive = rate >= THRESHOLDS.highInterestRate;
              const paidOff =
                debt.original_balance && Number(debt.original_balance) > 0
                  ? 1 - Number(debt.balance) / Number(debt.original_balance)
                  : null;

              return (
                <div key={debt.id} className="p-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="min-w-0 flex-1 font-medium">{debt.name}</p>
                    {expensive ? (
                      <Badge
                        variant="outline"
                        className="border-destructive/35 text-destructive-ink"
                      >
                        High interest
                      </Badge>
                    ) : null}
                    <p className="w-28 text-right font-medium tabular">
                      {formatCurrency(Number(debt.balance), currency)}
                    </p>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {DEBT_TYPE_LABELS[debt.type]} · {rate.toFixed(2)}% APR ·{" "}
                    {formatCurrency(Number(debt.monthly_payment), currency)} a month
                  </p>
                  {paidOff !== null && paidOff > 0 ? (
                    <>
                      <Progress
                        value={paidOff * 100}
                        className="mt-3 h-1.5"
                        indicatorClassName="bg-pillar-borrow"
                        aria-label={`${debt.name} paid off`}
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {formatPercent(paidOff)} paid off
                      </p>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {totals.totalDebt === 0
              ? "You have no debts recorded. Nothing to see here is the best outcome."
              : "Add your debts under My financial data to track each one and compare payoff strategies."}
          </p>
        )}
      </section>
    </PillarPageShell>
  );
}
