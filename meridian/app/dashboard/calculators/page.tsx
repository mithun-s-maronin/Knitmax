import type { Metadata } from "next";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { Calculators } from "@/components/calculators/calculators";
import { requireUser } from "@/lib/auth";
import { getFinancialSnapshot } from "@/lib/data/records";

export const metadata: Metadata = {
  title: "Calculators",
  description: "Emergency fund, savings goals and debt payoff, on your own numbers.",
};

export default async function CalculatorsPage() {
  const user = await requireUser("/dashboard/calculators");
  const snapshot = await getFinancialSnapshot(user.id);

  return (
    <PageShell width="wide">
      <PageHeader
        title="Calculators"
        description="Started from your own figures, so the answers are about you rather than a worked example. Nothing you change here is saved."
      />
      <div className="mt-7">
        <Calculators
          currency={snapshot.currency}
          essentialMonthlyExpenses={snapshot.totals.essentialMonthlyExpenses}
          monthlySavings={snapshot.totals.monthlySavings}
          emergencyFundAmount={snapshot.totals.emergencyFundAmount}
          debts={snapshot.debts}
        />
      </div>
    </PageShell>
  );
}
