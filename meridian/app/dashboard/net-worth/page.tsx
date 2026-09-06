import Link from "next/link";
import type { Metadata } from "next";
import { Scale } from "lucide-react";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { requireUser } from "@/lib/auth";
import { getDashboardView } from "@/lib/data/dashboard";
import {
  ASSET_TYPE_LABELS,
  DEBT_TYPE_LABELS,
  LIABILITY_TYPE_LABELS,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = {
  title: "Net worth",
  description: "Everything you own, minus everything you owe.",
};

const ASSET_LABEL: Record<string, string> = {
  ...ASSET_TYPE_LABELS,
  savings: "Savings accounts",
};

const LIABILITY_LABEL: Record<string, string> = {
  ...DEBT_TYPE_LABELS,
  ...LIABILITY_TYPE_LABELS,
};

export default async function NetWorthPage() {
  const user = await requireUser("/dashboard/net-worth");
  const view = await getDashboardView(user.id);
  const { snapshot, netWorthSnapshots } = view;
  const { netWorth, currency } = { netWorth: snapshot.netWorth, currency: snapshot.currency };

  const hasAnything =
    netWorth.totalAssets > 0 || netWorth.totalLiabilities > 0;

  if (!hasAnything) {
    return (
      <PageShell>
        <PageHeader title="Net worth" />
        <EmptyState
          icon={Scale}
          title="Nothing to weigh up yet"
          description="Add your savings, property, investments and debts under My financial data. Your savings balances count automatically — you do not need to enter them twice."
          action={
            <Button asChild className="mt-2">
              <Link href="/dashboard/financial-data?tab=assets">Add an asset</Link>
            </Button>
          }
          className="mt-7 py-20"
        />
      </PageShell>
    );
  }

  const first = netWorthSnapshots[0];
  const change =
    first && netWorthSnapshots.length > 1
      ? netWorth.netWorth - Number(first.net_worth)
      : null;

  return (
    <PageShell>
      <PageHeader
        title="Net worth"
        description="Everything you own minus everything you owe. Savings balances are counted as assets automatically; the liabilities list is only for what your debts do not already cover."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/financial-data?tab=assets">Manage assets</Link>
          </Button>
        }
      />

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Net worth"
          value={formatCurrency(netWorth.netWorth, currency)}
          delta={change === null ? null : Math.round(change)}
          deltaLabel="since your first reading"
        />
        <MetricCard
          label="Total assets"
          value={formatCurrency(netWorth.totalAssets, currency)}
        />
        <MetricCard
          label="Total liabilities"
          value={formatCurrency(netWorth.totalLiabilities, currency)}
          invertDelta
        />
      </div>

      {netWorthSnapshots.length > 1 ? (
        <div className="mt-5">
          <NetWorthChart snapshots={netWorthSnapshots} currency={currency} height={300} />
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground text-pretty">
          A trend line appears once there is more than one reading. One is
          recorded whenever you change a savings, debt, asset or liability
          record.
        </p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {netWorth.totalAssets > 0 ? (
          <CategoryDonut
            title="What you own"
            description="Assets by type, including your savings balances."
            currency={currency}
            slices={Object.entries(netWorth.assetsByType).map(([type, value]) => ({
              label: ASSET_LABEL[type] ?? type,
              value,
            }))}
          />
        ) : null}

        {netWorth.totalLiabilities > 0 ? (
          <CategoryDonut
            title="What you owe"
            description="Debts and other liabilities by type."
            currency={currency}
            slices={Object.entries(netWorth.liabilitiesByType).map(([type, value]) => ({
              label: LIABILITY_LABEL[type] ?? type,
              value,
            }))}
          />
        ) : null}
      </div>
    </PageShell>
  );
}
