import type { AnswerMap } from "@/lib/assessment/questions";
import type {
  DebtRow,
  ExpenseRow,
  IncomeSourceRow,
  NetWorthSnapshotRow,
  SavingsAccountRow,
  ScoreHistoryRow,
} from "@/types/database";

/**
 * The demo persona (§63).
 *
 * Every figure here is invented, and the demo never reads or writes the
 * database — it exists so someone can see the whole product before deciding
 * whether to hand over anything real. The same scoring engine runs on it, so
 * what the demo shows is what the product would show.
 */
export const DEMO_CURRENCY = "USD";

export const DEMO_ANSWERS: AnswerMap = {
  currency: DEMO_CURRENCY,
  age_range: "25_34",
  employment_status: "employed_full_time",
  dependents: 1,
  primary_income: 4800,
  other_income: 350,
  monthly_expenses: 3150,
  essential_expenses: 2400,
  bill_payment: "usually",
  total_savings: 8200,
  emergency_fund: 6000,
  monthly_savings: 420,
  savings_consistency: "most_months",
  has_debt: true,
  total_debt: 17400,
  monthly_debt_payments: 620,
  high_interest_debt: 4900,
  goals: "clear",
  insurance_applicable: ["health", "vehicle"],
  insurance_covered: ["health"],
  long_term_planning: "basic_plan",
  review_habit: "every_few_months",
};

const now = new Date();
const monthsAgo = (months: number) => {
  const date = new Date(now);
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
};

const row = <T>(value: T) => value;

export const DEMO_INCOME: IncomeSourceRow[] = [
  row({
    id: "demo-income-1",
    user_id: "demo",
    name: "Salary",
    type: "primary",
    amount: 4800,
    frequency: "monthly",
    is_active: true,
    notes: null,
    created_at: monthsAgo(8),
    updated_at: monthsAgo(8),
  }),
  row({
    id: "demo-income-2",
    user_id: "demo",
    name: "Weekend tutoring",
    type: "secondary",
    amount: 350,
    frequency: "monthly",
    is_active: true,
    notes: null,
    created_at: monthsAgo(5),
    updated_at: monthsAgo(5),
  }),
];

export const DEMO_EXPENSES: ExpenseRow[] = [
  ["Rent", "housing", 1450, true],
  ["Groceries", "food", 520, true],
  ["Utilities", "utilities", 210, true],
  ["Car and fuel", "transportation", 300, true],
  ["Childcare", "childcare", 180, true],
  ["Health insurance", "insurance", 140, true],
  ["Eating out", "food", 190, false],
  ["Streaming and apps", "subscriptions", 62, false],
  ["Shopping", "shopping", 98, false],
].map(([name, category, amount, essential], i) =>
  row({
    id: `demo-expense-${i}`,
    user_id: "demo",
    category: category as ExpenseRow["category"],
    name: name as string,
    amount: amount as number,
    frequency: "monthly" as const,
    is_essential: essential as boolean,
    date: null,
    notes: null,
    created_at: monthsAgo(8),
    updated_at: monthsAgo(1),
  }),
);

export const DEMO_SAVINGS: SavingsAccountRow[] = [
  row({
    id: "demo-savings-1",
    user_id: "demo",
    name: "Emergency fund",
    type: "emergency_fund",
    balance: 6000,
    monthly_contribution: 320,
    is_emergency_fund: true,
    interest_rate: 3.4,
    notes: null,
    created_at: monthsAgo(8),
    updated_at: monthsAgo(1),
  }),
  row({
    id: "demo-savings-2",
    user_id: "demo",
    name: "Holiday fund",
    type: "general_savings",
    balance: 2200,
    monthly_contribution: 100,
    is_emergency_fund: false,
    interest_rate: 1.1,
    notes: null,
    created_at: monthsAgo(6),
    updated_at: monthsAgo(1),
  }),
];

export const DEMO_DEBTS: DebtRow[] = [
  row({
    id: "demo-debt-1",
    user_id: "demo",
    name: "Credit card",
    type: "credit_card" as const,
    balance: 4900,
    original_balance: 6800,
    interest_rate: 21.9,
    monthly_payment: 220,
    minimum_payment: 120,
    start_date: null,
    target_payoff_date: null,
    notes: null,
    created_at: monthsAgo(8),
    updated_at: monthsAgo(1),
  }),
  row({
    id: "demo-debt-2",
    user_id: "demo",
    name: "Car loan",
    type: "auto_loan" as const,
    balance: 12500,
    original_balance: 18000,
    interest_rate: 6.4,
    monthly_payment: 400,
    minimum_payment: 400,
    start_date: null,
    target_payoff_date: null,
    notes: null,
    created_at: monthsAgo(8),
    updated_at: monthsAgo(1),
  }),
];

/** Six months of history, so the trend charts have something to draw. */
export const DEMO_SCORE_HISTORY: ScoreHistoryRow[] = [
  [58, 62, 40, 72, 58],
  [60, 64, 43, 73, 60],
  [59, 61, 44, 73, 60],
  [63, 66, 48, 76, 62],
  [65, 68, 51, 78, 62],
].map(([overall, spend, save, borrow, plan], i) =>
  row({
    id: `demo-history-${i}`,
    user_id: "demo",
    assessment_id: `demo-assessment-${i}`,
    overall_score: overall,
    spend_score: spend,
    save_score: save,
    borrow_score: borrow,
    plan_score: plan,
    recorded_at: monthsAgo(5 - i),
  }),
);

export const DEMO_NET_WORTH: NetWorthSnapshotRow[] = [
  [7400, 21800],
  [7900, 20600],
  [8000, 19700],
  [8400, 18600],
  [8200, 17400],
].map(([assets, liabilities], i) =>
  row({
    id: `demo-nw-${i}`,
    user_id: "demo",
    total_assets: assets,
    total_liabilities: liabilities,
    net_worth: assets - liabilities,
    recorded_at: monthsAgo(5 - i),
  }),
);

export const DEMO_RECORDS = {
  currency: DEMO_CURRENCY,
  incomeSources: DEMO_INCOME,
  expenses: DEMO_EXPENSES,
  savingsAccounts: DEMO_SAVINGS,
  debts: DEMO_DEBTS,
};
