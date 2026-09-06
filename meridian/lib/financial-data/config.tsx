import {
  ASSET_TYPE_LABELS,
  DEBT_TYPE_LABELS,
  EXPENSE_CATEGORY_LABELS,
  FREQUENCY_LABELS,
  GOAL_CATEGORY_LABELS,
  INCOME_TYPE_LABELS,
  LIABILITY_TYPE_LABELS,
  SAVINGS_TYPE_LABELS,
} from "@/lib/constants";
import { formatCurrency, formatDate, formatPercent, toMonthly } from "@/lib/format";
import { THRESHOLDS } from "@/lib/scoring";
import type { RecordTable } from "@/lib/validation/records";
import type { Frequency } from "@/types/database";

export type FieldType =
  | "text"
  | "currency"
  | "number"
  | "percent"
  | "select"
  | "date"
  | "switch"
  | "textarea";

export interface FieldSpec {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  help?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean | null;
  /** Half-width fields pair up on wider screens. */
  half?: boolean;
}

export interface ColumnSpec {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Hidden below sm, for columns that are useful but not essential. */
  secondary?: boolean;
  render: (row: Record<string, unknown>, currency: string) => React.ReactNode;
  sortValue?: (row: Record<string, unknown>) => number | string;
}

export interface EntityConfig {
  table: RecordTable;
  /** Singular and plural, used throughout the UI copy. */
  singular: string;
  plural: string;
  description: string;
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  fields: FieldSpec[];
  columns: ColumnSpec[];
  /** Values the "add" dialog starts with. */
  defaults: Record<string, unknown>;
  /** Optional filter chips, matched against a row field. */
  filterField?: string;
  /** A monthly total shown under the table, when the concept applies. */
  total?: (rows: Record<string, unknown>[]) => { label: string; value: number } | null;
}

const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

const FREQUENCY_OPTIONS = options(FREQUENCY_LABELS);

const num = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const str = (value: unknown): string => (typeof value === "string" ? value : "");

const NOTES_FIELD: FieldSpec = {
  name: "notes",
  label: "Notes",
  type: "textarea",
  placeholder: "Anything worth remembering about this",
};

const nameColumn = (label = "Name"): ColumnSpec => ({
  key: "name",
  label,
  render: (row) => (
    <div className="min-w-0">
      <p className="truncate font-medium">{str(row.name)}</p>
      {row.notes ? (
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {str(row.notes)}
        </p>
      ) : null}
    </div>
  ),
  sortValue: (row) => str(row.name).toLowerCase(),
});

const typeColumn = (labels: Record<string, string>): ColumnSpec => ({
  key: "type",
  label: "Type",
  secondary: true,
  render: (row) => (
    <span className="text-muted-foreground">{labels[str(row.type)] ?? "—"}</span>
  ),
  sortValue: (row) => str(row.type),
});

const amountColumn = (key: string, label: string): ColumnSpec => ({
  key,
  label,
  align: "right",
  render: (row, currency) => (
    <span className="tabular">{formatCurrency(num(row[key]), currency)}</span>
  ),
  sortValue: (row) => num(row[key]),
});

const monthlyColumn = (key: string): ColumnSpec => ({
  key: "monthly",
  label: "Monthly",
  align: "right",
  render: (row, currency) => {
    const monthly = toMonthly(num(row[key]), str(row.frequency) as Frequency);
    return (
      <span className="tabular text-muted-foreground">
        {str(row.frequency) === "one_time"
          ? "One-off"
          : formatCurrency(monthly, currency)}
      </span>
    );
  },
  sortValue: (row) => toMonthly(num(row[key]), str(row.frequency) as Frequency),
});

/** Sums the monthly equivalents of a set of rows. */
const monthlyTotal =
  (key: string, label: string) => (rows: Record<string, unknown>[]) => ({
    label,
    value: rows.reduce(
      (sum, row) => sum + toMonthly(num(row[key]), str(row.frequency) as Frequency),
      0,
    ),
  });

const plainTotal = (key: string, label: string) => (rows: Record<string, unknown>[]) => ({
  label,
  value: rows.reduce((sum, row) => sum + num(row[key]), 0),
});

export const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  income: {
    table: "income_sources",
    singular: "income source",
    plural: "Income",
    description:
      "Everything that comes in. Amounts at any frequency are converted to a monthly equivalent for your score.",
    addLabel: "Add income",
    emptyTitle: "No income recorded",
    emptyDescription:
      "Add your salary and any other income. Almost every ratio in your score is measured against it.",
    filterField: "type",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Salary" },
      {
        name: "type",
        label: "Type",
        type: "select",
        options: options(INCOME_TYPE_LABELS),
        half: true,
      },
      {
        name: "frequency",
        label: "How often",
        type: "select",
        options: FREQUENCY_OPTIONS,
        half: true,
      },
      { name: "amount", label: "Amount", type: "currency", help: "After tax." },
      {
        name: "is_active",
        label: "Currently receiving this",
        type: "switch",
        help: "Inactive sources are kept but not counted in your score.",
      },
      NOTES_FIELD,
    ],
    defaults: {
      name: "",
      type: "primary",
      amount: "",
      frequency: "monthly",
      is_active: true,
      notes: "",
    },
    columns: [
      nameColumn(),
      typeColumn(INCOME_TYPE_LABELS),
      {
        key: "frequency",
        label: "Frequency",
        secondary: true,
        render: (row) => (
          <span className="text-muted-foreground">
            {FREQUENCY_LABELS[str(row.frequency) as Frequency] ?? "—"}
          </span>
        ),
      },
      amountColumn("amount", "Amount"),
      monthlyColumn("amount"),
    ],
    total: (rows) =>
      monthlyTotal("amount", "Monthly income")(
        rows.filter((r) => r.is_active !== false),
      ),
  },

  expenses: {
    table: "expenses",
    singular: "expense",
    plural: "Expenses",
    description:
      "Your living costs. Debt repayments belong under Debt — they are counted separately so they are not subtracted twice.",
    addLabel: "Add expense",
    emptyTitle: "No expenses recorded",
    emptyDescription:
      "Add your regular costs. Marking the essential ones is what makes the emergency fund calculation meaningful.",
    filterField: "category",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Rent" },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: options(EXPENSE_CATEGORY_LABELS),
        half: true,
      },
      {
        name: "frequency",
        label: "How often",
        type: "select",
        options: FREQUENCY_OPTIONS,
        half: true,
      },
      { name: "amount", label: "Amount", type: "currency" },
      {
        name: "is_essential",
        label: "This is an essential cost",
        type: "switch",
        help: "Essential costs are the ones that would still be there next month. Your emergency fund is measured in months of these.",
      },
      { name: "date", label: "Date", type: "date", help: "For one-off costs.", half: true },
      NOTES_FIELD,
    ],
    defaults: {
      name: "",
      category: "housing",
      amount: "",
      frequency: "monthly",
      is_essential: true,
      date: "",
      notes: "",
    },
    columns: [
      nameColumn(),
      {
        key: "category",
        label: "Category",
        secondary: true,
        render: (row) => (
          <span className="text-muted-foreground">
            {EXPENSE_CATEGORY_LABELS[
              str(row.category) as keyof typeof EXPENSE_CATEGORY_LABELS
            ] ?? "—"}
          </span>
        ),
        sortValue: (row) => str(row.category),
      },
      {
        key: "is_essential",
        label: "Essential",
        secondary: true,
        render: (row) => (
          <span className="text-muted-foreground">
            {row.is_essential ? "Essential" : "Discretionary"}
          </span>
        ),
      },
      amountColumn("amount", "Amount"),
      monthlyColumn("amount"),
    ],
    total: monthlyTotal("amount", "Monthly living costs"),
  },

  savings: {
    table: "savings_accounts",
    singular: "savings account",
    plural: "Savings",
    description:
      "Where your savings sit. Mark the account you keep for emergencies — it is what the Save pillar measures against.",
    addLabel: "Add account",
    emptyTitle: "No savings accounts",
    emptyDescription:
      "Add an account and mark it as your emergency fund. It is the heaviest single component of your score.",
    filterField: "type",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Emergency fund" },
      {
        name: "type",
        label: "Type",
        type: "select",
        options: options(SAVINGS_TYPE_LABELS),
        half: true,
      },
      {
        name: "interest_rate",
        label: "Interest rate",
        type: "percent",
        half: true,
        placeholder: "0",
      },
      { name: "balance", label: "Balance", type: "currency", half: true },
      {
        name: "monthly_contribution",
        label: "Added each month",
        type: "currency",
        half: true,
      },
      {
        name: "is_emergency_fund",
        label: "This is my emergency fund",
        type: "switch",
        help: "Only money you would actually reach for in an emergency.",
      },
      NOTES_FIELD,
    ],
    defaults: {
      name: "",
      type: "general_savings",
      balance: "",
      monthly_contribution: "",
      is_emergency_fund: false,
      interest_rate: "",
      notes: "",
    },
    columns: [
      nameColumn("Account"),
      typeColumn(SAVINGS_TYPE_LABELS),
      {
        key: "is_emergency_fund",
        label: "Purpose",
        secondary: true,
        render: (row) =>
          row.is_emergency_fund ? (
            <span className="text-pillar-save">Emergency fund</span>
          ) : (
            <span className="text-muted-foreground">General</span>
          ),
      },
      amountColumn("monthly_contribution", "Per month"),
      amountColumn("balance", "Balance"),
    ],
    total: plainTotal("balance", "Total saved"),
  },

  debts: {
    table: "debts",
    singular: "debt",
    plural: "Debt",
    description: `What you owe and what it costs. Anything at ${THRESHOLDS.highInterestRate}% APR or above counts as high-interest.`,
    addLabel: "Add debt",
    emptyTitle: "No debts recorded",
    emptyDescription:
      "If you carry no debt, leave this empty — the Borrow pillar scores 100 and nothing here is missing.",
    filterField: "type",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Credit card" },
      {
        name: "type",
        label: "Type",
        type: "select",
        options: options(DEBT_TYPE_LABELS),
        half: true,
      },
      {
        name: "interest_rate",
        label: "Interest rate (APR)",
        type: "percent",
        half: true,
        help: `${THRESHOLDS.highInterestRate}% or above counts as high-interest.`,
      },
      { name: "balance", label: "Balance owed", type: "currency", half: true },
      {
        name: "original_balance",
        label: "Original balance",
        type: "currency",
        half: true,
        help: "Optional — lets us show how far you have come.",
      },
      { name: "monthly_payment", label: "Monthly payment", type: "currency", half: true },
      {
        name: "minimum_payment",
        label: "Minimum payment",
        type: "currency",
        half: true,
        help: "Optional — used by the payoff calculator.",
      },
      { name: "start_date", label: "Started", type: "date", half: true },
      { name: "target_payoff_date", label: "Target payoff", type: "date", half: true },
      NOTES_FIELD,
    ],
    defaults: {
      name: "",
      type: "credit_card",
      balance: "",
      original_balance: "",
      interest_rate: "",
      monthly_payment: "",
      minimum_payment: "",
      start_date: "",
      target_payoff_date: "",
      notes: "",
    },
    columns: [
      nameColumn(),
      typeColumn(DEBT_TYPE_LABELS),
      {
        key: "interest_rate",
        label: "Rate",
        align: "right",
        render: (row) => {
          const rate = num(row.interest_rate);
          return (
            <span
              className={
                rate >= THRESHOLDS.highInterestRate
                  ? "tabular font-medium text-destructive"
                  : "tabular text-muted-foreground"
              }
            >
              {rate.toFixed(2)}%
            </span>
          );
        },
        sortValue: (row) => num(row.interest_rate),
      },
      amountColumn("monthly_payment", "Per month"),
      amountColumn("balance", "Balance"),
    ],
    total: plainTotal("balance", "Total owed"),
  },

  goals: {
    table: "financial_goals",
    singular: "goal",
    plural: "Goals",
    description:
      "Targets with an amount and a date. This is what the Plan pillar rewards, and what turns saving into progress you can see.",
    addLabel: "Add goal",
    emptyTitle: "No goals yet",
    emptyDescription:
      "One goal with a real number and a real date is the single biggest lever on your Plan score.",
    filterField: "status",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Emergency fund" },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: options(GOAL_CATEGORY_LABELS),
        half: true,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "active", label: "Active" },
          { value: "paused", label: "Paused" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
        ],
        half: true,
      },
      { name: "target_amount", label: "Target amount", type: "currency", half: true },
      { name: "current_amount", label: "Saved so far", type: "currency", half: true },
      { name: "target_date", label: "Target date", type: "date", half: true },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        half: true,
        options: [
          { value: "1", label: "High" },
          { value: "2", label: "Medium" },
          { value: "3", label: "Low" },
        ],
      },
      { name: "description", label: "Description", type: "textarea" },
    ],
    defaults: {
      name: "",
      category: "emergency_fund",
      target_amount: "",
      current_amount: "",
      target_date: "",
      status: "active",
      priority: "2",
      description: "",
    },
    columns: [
      nameColumn("Goal"),
      {
        key: "category",
        label: "Category",
        secondary: true,
        render: (row) => (
          <span className="text-muted-foreground">
            {GOAL_CATEGORY_LABELS[str(row.category) as keyof typeof GOAL_CATEGORY_LABELS] ??
              "—"}
          </span>
        ),
      },
      {
        key: "target_date",
        label: "Target date",
        secondary: true,
        render: (row) => (
          <span className="text-muted-foreground">
            {row.target_date ? formatDate(str(row.target_date)) : "No date"}
          </span>
        ),
        sortValue: (row) => str(row.target_date),
      },
      {
        key: "progress",
        label: "Progress",
        align: "right",
        render: (row) => {
          const target = num(row.target_amount);
          const current = num(row.current_amount);
          return (
            <span className="tabular">
              {formatPercent(target > 0 ? Math.min(current / target, 1) : 0)}
            </span>
          );
        },
        sortValue: (row) =>
          num(row.target_amount) > 0 ? num(row.current_amount) / num(row.target_amount) : 0,
      },
      amountColumn("target_amount", "Target"),
    ],
    total: plainTotal("target_amount", "Total targeted"),
  },

  assets: {
    table: "assets",
    singular: "asset",
    plural: "Assets",
    description:
      "What you own, for the net worth calculation. Savings balances are already counted — do not add them again here.",
    addLabel: "Add asset",
    emptyTitle: "No assets recorded",
    emptyDescription:
      "Add property, investments or anything else of value. Your savings accounts are already included automatically.",
    filterField: "type",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Home" },
      {
        name: "type",
        label: "Type",
        type: "select",
        options: options(ASSET_TYPE_LABELS),
        half: true,
      },
      { name: "value", label: "Value", type: "currency", half: true },
      NOTES_FIELD,
    ],
    defaults: { name: "", type: "property", value: "", notes: "" },
    columns: [nameColumn(), typeColumn(ASSET_TYPE_LABELS), amountColumn("value", "Value")],
    total: plainTotal("value", "Total assets"),
  },

  liabilities: {
    table: "liabilities",
    singular: "liability",
    plural: "Liabilities",
    description:
      "What you owe that is not already in Debt. Anything listed under Debt is counted there — adding it again would double it.",
    addLabel: "Add liability",
    emptyTitle: "No other liabilities",
    emptyDescription:
      "Only for what your debts list does not already cover, such as tax owed.",
    filterField: "type",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Tax owed" },
      {
        name: "type",
        label: "Type",
        type: "select",
        options: options(LIABILITY_TYPE_LABELS),
        half: true,
      },
      { name: "balance", label: "Balance", type: "currency", half: true },
      NOTES_FIELD,
    ],
    defaults: { name: "", type: "other", balance: "", notes: "" },
    columns: [
      nameColumn(),
      typeColumn(LIABILITY_TYPE_LABELS),
      amountColumn("balance", "Balance"),
    ],
    total: plainTotal("balance", "Total liabilities"),
  },
};

export type EntityKey = keyof typeof ENTITY_CONFIGS;
