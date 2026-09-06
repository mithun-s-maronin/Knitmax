import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { RecordTable } from "@/components/financial-data/record-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth";
import { getFinancialSnapshot } from "@/lib/data/records";
import { ENTITY_CONFIGS } from "@/lib/financial-data/config";
import {
  ASSET_TYPE_LABELS,
  DEBT_TYPE_LABELS,
  EXPENSE_CATEGORY_LABELS,
  INCOME_TYPE_LABELS,
  LIABILITY_TYPE_LABELS,
  SAVINGS_TYPE_LABELS,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "My financial data",
  description: "Every record behind your score, in one place.",
};

const SECTIONS = [
  { key: "income", labels: INCOME_TYPE_LABELS },
  { key: "expenses", labels: EXPENSE_CATEGORY_LABELS },
  { key: "savings", labels: SAVINGS_TYPE_LABELS },
  { key: "debts", labels: DEBT_TYPE_LABELS },
  { key: "goals", labels: undefined },
  { key: "assets", labels: ASSET_TYPE_LABELS },
  { key: "liabilities", labels: LIABILITY_TYPE_LABELS },
] as const;

export default async function FinancialDataPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser("/dashboard/financial-data");
  const snapshot = await getFinancialSnapshot(user.id);
  const params = await searchParams;

  const rowsFor: Record<string, Record<string, unknown>[]> = {
    income: snapshot.incomeSources,
    expenses: snapshot.expenses,
    savings: snapshot.savingsAccounts,
    debts: snapshot.debts,
    goals: snapshot.goals,
    assets: snapshot.assets,
    liabilities: snapshot.liabilities,
  };

  const initial =
    params.tab && params.tab in rowsFor ? params.tab : "income";

  return (
    <PageShell>
      <PageHeader
        title="My financial data"
        description="Everything your score is calculated from. Add, edit or delete any of it — changes save straight away, and your completed assessments are never altered."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/settings#data">Export my data</Link>
          </Button>
        }
      />

      <Tabs defaultValue={initial} className="mt-7">
        <TabsList className="w-full sm:w-auto">
          {SECTIONS.map((section) => {
            const config = ENTITY_CONFIGS[section.key];
            const count = rowsFor[section.key].length;
            return (
              <TabsTrigger key={section.key} value={section.key}>
                {config.plural}
                {count > 0 ? (
                  <span className="ml-1 text-xs tabular text-muted-foreground">
                    {count}
                  </span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SECTIONS.map((section) => {
          const config = ENTITY_CONFIGS[section.key];
          return (
            <TabsContent key={section.key} value={section.key} className="mt-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold tracking-[-0.015em]">
                  {config.plural}
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground text-pretty">
                  {config.description}
                </p>
              </div>
              <RecordTable
                config={config}
                rows={rowsFor[section.key]}
                currency={snapshot.currency}
                filterLabels={section.labels as Record<string, string> | undefined}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </PageShell>
  );
}
