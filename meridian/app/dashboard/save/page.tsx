import type { Metadata } from "next";

import { PillarPageShell } from "@/components/dashboard/pillar-page-shell";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth";
import { getDashboardView } from "@/lib/data/dashboard";
import { emergencyFundTarget } from "@/lib/calculations/goals";
import { SAVINGS_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatMonths, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Save" };

export default async function SavePage() {
  const user = await requireUser("/dashboard/save");
  const { snapshot, stored } = await getDashboardView(user.id);
  const currency = snapshot.currency;
  const totals = snapshot.totals;

  const { target } = emergencyFundTarget(totals.essentialMonthlyExpenses, 6);
  const fundProgress = target > 0 ? Math.min(totals.emergencyFundAmount / target, 1) : 0;
  const months = snapshot.liveResult.metrics.emergencyFundMonths;

  return (
    <PillarPageShell
      pillar={stored?.save ?? null}
      assessedAt={stored ? formatDate(stored.completedAt, "long") : null}
    >
      <section className="mt-9" aria-labelledby="savings-analytics">
        <h2 id="savings-analytics" className="text-lg font-semibold tracking-[-0.015em]">
          Savings analytics
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total savings"
            value={formatCurrency(totals.totalSavings, currency)}
          />
          <MetricCard
            label="Emergency fund"
            value={formatCurrency(totals.emergencyFundAmount, currency)}
            hint={`${formatMonths(months)} of essentials`}
          />
          <MetricCard
            label="Saved each month"
            value={formatCurrency(totals.monthlySavings, currency)}
          />
          <MetricCard
            label="Savings rate"
            value={formatPercent(snapshot.liveResult.metrics.savingsRate, 1)}
            hint="20% scores full marks"
          />
        </div>

        <div className="surface mt-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Emergency fund progress</h3>
            <p className="text-sm tabular text-muted-foreground">
              {formatCurrency(totals.emergencyFundAmount, currency)} of{" "}
              {formatCurrency(target, currency)}
            </p>
          </div>
          <Progress
            value={fundProgress * 100}
            className="mt-4 h-2.5"
            indicatorClassName="bg-pillar-save"
            aria-label="Emergency fund progress towards six months"
          />
          <p className="mt-3 text-sm text-muted-foreground text-pretty">
            {target === 0
              ? "Record your essential monthly costs and we can set a target."
              : fundProgress >= 1
                ? "Your fund covers six months of essential costs. It is complete."
                : `A complete fund is six months of essential costs — ${formatCurrency(
                    target - totals.emergencyFundAmount,
                    currency,
                  )} to go${
                    totals.monthlySavings > 0
                      ? `, about ${Math.ceil(
                          (target - totals.emergencyFundAmount) / totals.monthlySavings,
                        )} months at your current rate`
                      : ""
                  }.`}
          </p>
        </div>

        {snapshot.savingsAccounts.length > 0 ? (
          <div className="surface mt-5 divide-y">
            <h3 className="p-5 font-semibold">Your savings accounts</h3>
            {snapshot.savingsAccounts.map((account) => (
              <div key={account.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-5">
                <p className="min-w-0 flex-1 font-medium">{account.name}</p>
                <p className="text-sm text-muted-foreground">
                  {SAVINGS_TYPE_LABELS[account.type]}
                  {account.is_emergency_fund ? " · Emergency fund" : ""}
                </p>
                <p className="w-28 text-right font-medium tabular">
                  {formatCurrency(Number(account.balance), currency)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Add your savings accounts under My financial data to track them here.
          </p>
        )}
      </section>
    </PillarPageShell>
  );
}
