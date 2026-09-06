import type { AssetRow, DebtRow, LiabilityRow, SavingsAccountRow } from "@/types/database";

export interface NetWorthBreakdown {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetsByType: Record<string, number>;
  liabilitiesByType: Record<string, number>;
}

const n = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Net worth: everything owned minus everything owed.
 *
 * Savings balances count as assets in their own right, so they do not need to
 * be re-entered on the assets list. Debts and other liabilities are summed
 * together — the liabilities list is for what the debts table does not
 * already track, which the UI says plainly so nothing is counted twice.
 */
export function calculateNetWorth(input: {
  assets: AssetRow[];
  liabilities: LiabilityRow[];
  debts: DebtRow[];
  savingsAccounts: SavingsAccountRow[];
}): NetWorthBreakdown {
  const assetsByType: Record<string, number> = {};

  const savingsTotal = input.savingsAccounts.reduce((sum, a) => sum + n(a.balance), 0);
  if (savingsTotal > 0) assetsByType.savings = savingsTotal;

  for (const asset of input.assets) {
    assetsByType[asset.type] = (assetsByType[asset.type] ?? 0) + n(asset.value);
  }

  const liabilitiesByType: Record<string, number> = {};
  for (const debt of input.debts) {
    const key = debt.type === "mortgage" ? "mortgage" : debt.type;
    liabilitiesByType[key] = (liabilitiesByType[key] ?? 0) + n(debt.balance);
  }
  for (const liability of input.liabilities) {
    liabilitiesByType[liability.type] =
      (liabilitiesByType[liability.type] ?? 0) + n(liability.balance);
  }

  const totalAssets = Object.values(assetsByType).reduce((a, b) => a + b, 0);
  const totalLiabilities = Object.values(liabilitiesByType).reduce((a, b) => a + b, 0);

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    assetsByType,
    liabilitiesByType,
  };
}
