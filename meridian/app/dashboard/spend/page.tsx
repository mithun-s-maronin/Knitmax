import type { Metadata } from "next";

import { PillarPageShell } from "@/components/dashboard/pillar-page-shell";
import { CategoryDonut } from "@/components/charts/category-donut";
import { MetricCard } from "@/components/dashboard/metric-card";
import { requireUser } from "@/lib/auth";
import { getDashboardView } from "@/lib/data/dashboard";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Spend" };

export default async function SpendPage() {
  const user = await requireUser("/dashboard/spend");
  const { snapshot, stored } = await getDashboardView(user.id);
  const currency = snapshot.currency;
  const totals = snapshot.totals;

  const slices = Object.entries(totals.expensesByCategory).map(([key, value]) => ({
    label:
      EXPENSE_CATEGORY_LABELS[key as keyof typeof EXPENSE_CATEGORY_LABELS] ?? key,
    value,
  }));

  const essentialShare =
    totals.monthlyExpenses > 0
      ? totals.essentialMonthlyExpenses / totals.monthlyExpenses
      : null;

  return (
    <PillarPageShell
      pillar={stored?.spend ?? null}
      assessedAt={stored ? formatDate(stored.completedAt, "long") : null}
    >
      <section className="mt-9" aria-labelledby="spending-analytics">
        <h2 id="spending-analytics" className="text-lg font-semibold tracking-[-0.015em]">
          Spending analytics
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          From the expenses you have recorded, converted to monthly equivalents.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Monthly living costs"
            value={formatCurrency(totals.monthlyExpenses, currency)}
            hint="Excluding debt repayments"
          />
          <MetricCard
            label="Essential"
            value={formatCurrency(totals.essentialMonthlyExpenses, currency)}
            hint={
              essentialShare !== null
                ? `${formatPercent(essentialShare)} of your spending`
                : undefined
            }
          />
          <MetricCard
            label="Discretionary"
            value={formatCurrency(totals.discretionaryMonthlyExpenses, currency)}
            hint="The part you could cut in an emergency"
          />
          <MetricCard
            label="Debt repayments"
            value={formatCurrency(totals.monthlyDebtPayments, currency)}
            hint="Counted separately from living costs"
          />
        </div>

        {slices.length > 0 ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <CategoryDonut
              slices={slices}
              currency={currency}
              description="Your recorded expenses by category, as monthly equivalents."
            />
            <div className="surface p-5 sm:p-6">
              <h3 className="font-semibold">Largest categories</h3>
              <ol className="mt-4 space-y-3">
                {[...slices]
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 6)
                  .map((slice) => {
                    const share =
                      totals.monthlyExpenses > 0
                        ? slice.value / totals.monthlyExpenses
                        : 0;
                    return (
                      <li key={slice.label} className="flex items-center gap-3">
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {slice.label}
                        </span>
                        <span className="text-sm tabular text-muted-foreground">
                          {formatPercent(share)}
                        </span>
                        <span className="w-24 text-right text-sm font-medium tabular">
                          {formatCurrency(slice.value, currency)}
                        </span>
                      </li>
                    );
                  })}
              </ol>
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Add your expenses under My financial data and the breakdown appears
            here.
          </p>
        )}
      </section>
    </PillarPageShell>
  );
}
