import type { ScoringInput } from "@/lib/scoring";
import type { DebtRow, ExpenseRow, IncomeSourceRow, SavingsAccountRow } from "@/types/database";
import { toMonthly } from "@/lib/format";

export interface ScenarioAdjustments {
  monthlyIncomeChange: number;
  monthlyExpensesChange: number;
  monthlySavingsChange: number;
  extraDebtPayment: number;
  emergencyFundChange: number;
}

export const EMPTY_ADJUSTMENTS: ScenarioAdjustments = {
  monthlyIncomeChange: 0,
  monthlyExpensesChange: 0,
  monthlySavingsChange: 0,
  extraDebtPayment: 0,
  emergencyFundChange: 0,
};

/** Applies a scenario to a copy of the scoring input. Nothing is stored. */
export function applyAdjustments(
  baseline: ScoringInput,
  adjustments: ScenarioAdjustments,
): ScoringInput {
  const positive = (value: number) => (Number.isFinite(value) ? Math.max(value, 0) : 0);

  const monthlyExpenses = positive(
    baseline.monthlyExpenses + adjustments.monthlyExpensesChange,
  );

  return {
    ...baseline,
    monthlyIncome: positive(baseline.monthlyIncome + adjustments.monthlyIncomeChange),
    monthlyExpenses,
    // Essential costs cannot exceed the total after a change to spending.
    essentialMonthlyExpenses: Math.min(baseline.essentialMonthlyExpenses, monthlyExpenses),
    monthlySavings: positive(baseline.monthlySavings + adjustments.monthlySavingsChange),
    monthlyDebtPayments: positive(
      baseline.monthlyDebtPayments + adjustments.extraDebtPayment,
    ),
    emergencyFundAmount: positive(
      baseline.emergencyFundAmount + adjustments.emergencyFundChange,
    ),
    totalSavings: positive(baseline.totalSavings + adjustments.emergencyFundChange),
  };
}

export interface PlannedChange {
  table: "income_sources" | "expenses" | "savings_accounts" | "debts";
  id: string | null;
  recordName: string;
  field: string;
  fieldLabel: string;
  from: number;
  to: number;
}

export interface ScenarioRecords {
  incomeSources: IncomeSourceRow[];
  expenses: ExpenseRow[];
  savingsAccounts: SavingsAccountRow[];
  debts: DebtRow[];
}

const n = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Turns a scenario into a concrete list of record edits (§29).
 *
 * Applying a simulation must not quietly rewrite the whole ledger, so each
 * change lands on one identifiable record, and the confirmation dialog lists
 * every one before anything is written. The same function runs on the server
 * when the change is confirmed — the client's version is only there to show
 * the preview, and is never trusted.
 */
export function planScenarioChanges(
  records: ScenarioRecords,
  adjustments: ScenarioAdjustments,
): PlannedChange[] {
  const changes: PlannedChange[] = [];

  // --- Income: adjust the largest active source ---------------------------
  if (adjustments.monthlyIncomeChange !== 0) {
    const active = records.incomeSources
      .filter((s) => s.is_active)
      .sort(
        (a, b) =>
          toMonthly(n(b.amount), b.frequency) - toMonthly(n(a.amount), a.frequency),
      );
    const target = active[0];

    if (target && target.frequency === "monthly") {
      const from = n(target.amount);
      changes.push({
        table: "income_sources",
        id: target.id,
        recordName: target.name,
        field: "amount",
        fieldLabel: "Monthly amount",
        from,
        to: Math.max(from + adjustments.monthlyIncomeChange, 0),
      });
    } else if (adjustments.monthlyIncomeChange > 0) {
      // No monthly source to adjust — record the difference as a new one
      // rather than rewriting an amount at a different frequency.
      changes.push({
        table: "income_sources",
        id: null,
        recordName: "Additional income",
        field: "amount",
        fieldLabel: "Monthly amount",
        from: 0,
        to: adjustments.monthlyIncomeChange,
      });
    }
  }

  // --- Spending: take it off discretionary costs first ---------------------
  if (adjustments.monthlyExpensesChange !== 0) {
    const monthlyExpenses = records.expenses
      .filter((e) => e.frequency === "monthly" && e.category !== "debt_payments")
      .sort((a, b) => n(b.amount) - n(a.amount));

    const ordered =
      adjustments.monthlyExpensesChange < 0
        ? [
            ...monthlyExpenses.filter((e) => !e.is_essential),
            ...monthlyExpenses.filter((e) => e.is_essential),
          ]
        : monthlyExpenses;

    let remaining = adjustments.monthlyExpensesChange;

    for (const expense of ordered) {
      if (Math.abs(remaining) < 0.005) break;
      const from = n(expense.amount);
      const applied = remaining < 0 ? -Math.min(from, -remaining) : remaining;
      const to = Math.max(from + applied, 0);
      if (to === from) continue;

      changes.push({
        table: "expenses",
        id: expense.id,
        recordName: expense.name,
        field: "amount",
        fieldLabel: "Monthly amount",
        from,
        to,
      });
      remaining -= applied;
      // An increase all lands on the largest single line.
      if (adjustments.monthlyExpensesChange > 0) break;
    }
  }

  // --- Savings contribution: the emergency fund first ----------------------
  if (adjustments.monthlySavingsChange !== 0) {
    const target =
      records.savingsAccounts.find((a) => a.is_emergency_fund) ??
      records.savingsAccounts[0];

    if (target) {
      const from = n(target.monthly_contribution);
      changes.push({
        table: "savings_accounts",
        id: target.id,
        recordName: target.name,
        field: "monthly_contribution",
        fieldLabel: "Added each month",
        from,
        to: Math.max(from + adjustments.monthlySavingsChange, 0),
      });
    } else if (adjustments.monthlySavingsChange > 0) {
      changes.push({
        table: "savings_accounts",
        id: null,
        recordName: "Emergency fund",
        field: "monthly_contribution",
        fieldLabel: "Added each month",
        from: 0,
        to: adjustments.monthlySavingsChange,
      });
    }
  }

  // --- Emergency fund balance ---------------------------------------------
  if (adjustments.emergencyFundChange !== 0) {
    const target =
      records.savingsAccounts.find((a) => a.is_emergency_fund) ??
      records.savingsAccounts[0];

    if (target) {
      const from = n(target.balance);
      changes.push({
        table: "savings_accounts",
        id: target.id,
        recordName: target.name,
        field: "balance",
        fieldLabel: "Balance",
        from,
        to: Math.max(from + adjustments.emergencyFundChange, 0),
      });
    } else if (adjustments.emergencyFundChange > 0) {
      changes.push({
        table: "savings_accounts",
        id: null,
        recordName: "Emergency fund",
        field: "balance",
        fieldLabel: "Balance",
        from: 0,
        to: adjustments.emergencyFundChange,
      });
    }
  }

  // --- Extra debt payment: onto the most expensive balance -----------------
  if (adjustments.extraDebtPayment !== 0) {
    const target = [...records.debts]
      .filter((d) => n(d.balance) > 0)
      .sort((a, b) => n(b.interest_rate) - n(a.interest_rate))[0];

    if (target) {
      const from = n(target.monthly_payment);
      changes.push({
        table: "debts",
        id: target.id,
        recordName: target.name,
        field: "monthly_payment",
        fieldLabel: "Monthly payment",
        from,
        to: Math.max(from + adjustments.extraDebtPayment, 0),
      });
    }
  }

  return changes;
}
