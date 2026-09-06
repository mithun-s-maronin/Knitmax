import type { DebtRow } from "@/types/database";

export type PayoffStrategy = "minimum" | "avalanche" | "snowball";

export interface PayoffDebt {
  id: string;
  name: string;
  balance: number;
  /** Annual percentage rate, e.g. 18.9. */
  interestRate: number;
  monthlyPayment: number;
  minimumPayment: number;
}

export interface PayoffDebtResult {
  id: string;
  name: string;
  monthsToClear: number | null;
  interestPaid: number;
}

export interface PayoffResult {
  strategy: PayoffStrategy;
  /** Months until every debt is cleared, or null if it never clears. */
  months: number | null;
  totalInterest: number;
  totalPaid: number;
  perDebt: PayoffDebtResult[];
  /** The order debts are attacked in, for the explanation. */
  order: string[];
  /** True when the payments do not cover the interest and nothing ever clears. */
  neverClears: boolean;
}

/** Twenty-five years. Beyond this we report that it does not clear. */
const MAX_MONTHS = 600;

const n = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** Turns stored debt rows into the calculator's shape. */
export function toPayoffDebts(debts: DebtRow[]): PayoffDebt[] {
  return debts
    .filter((debt) => n(debt.balance) > 0)
    .map((debt) => ({
      id: debt.id,
      name: debt.name,
      balance: n(debt.balance),
      interestRate: n(debt.interest_rate),
      monthlyPayment: n(debt.monthly_payment),
      minimumPayment: n(debt.minimum_payment) || n(debt.monthly_payment),
    }));
}

/**
 * Simulates paying down a set of debts month by month (§36).
 *
 * Interest accrues on the balance at the start of each month, then payments
 * are applied. Under avalanche and snowball, every debt gets its minimum and
 * the whole remaining budget — including the payments freed up by debts
 * already cleared — goes to the current target. That "snowball" effect is why
 * the two strategies beat paying minimums, and the model has to include it or
 * the comparison is meaningless.
 */
export function calculatePayoff(
  debts: PayoffDebt[],
  strategy: PayoffStrategy,
  extraMonthlyPayment = 0,
): PayoffResult {
  const working = debts
    .filter((d) => d.balance > 0)
    .map((d) => ({
      ...d,
      remaining: d.balance,
      interestPaid: 0,
      clearedAt: null as number | null,
    }));

  if (working.length === 0) {
    return {
      strategy,
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      perDebt: [],
      order: [],
      neverClears: false,
    };
  }

  // The total each month: what they already pay, plus anything extra.
  const budget =
    working.reduce((sum, d) => sum + Math.max(d.monthlyPayment, d.minimumPayment), 0) +
    Math.max(extraMonthlyPayment, 0);

  const priority = (() => {
    if (strategy === "avalanche") {
      return [...working].sort(
        (a, b) => b.interestRate - a.interestRate || a.remaining - b.remaining,
      );
    }
    if (strategy === "snowball") {
      return [...working].sort(
        (a, b) => a.remaining - b.remaining || b.interestRate - a.interestRate,
      );
    }
    return [...working];
  })();

  let month = 0;
  let totalPaid = 0;

  while (working.some((d) => d.remaining > 0.005) && month < MAX_MONTHS) {
    month += 1;

    // 1. Interest accrues.
    for (const debt of working) {
      if (debt.remaining <= 0) continue;
      const monthlyInterest = (debt.remaining * (debt.interestRate / 100)) / 12;
      debt.remaining += monthlyInterest;
      debt.interestPaid += monthlyInterest;
    }

    // 2. Minimums first, so nothing goes into arrears.
    let available = strategy === "minimum" ? Infinity : budget;

    for (const debt of working) {
      if (debt.remaining <= 0) continue;
      const minimum =
        strategy === "minimum"
          ? Math.max(debt.monthlyPayment, debt.minimumPayment)
          : Math.min(debt.minimumPayment, debt.remaining);
      const payment = Math.min(minimum, debt.remaining, available);
      debt.remaining -= payment;
      totalPaid += payment;
      if (available !== Infinity) available -= payment;
    }

    // 3. Everything left goes at the target, in priority order.
    if (strategy !== "minimum" && available > 0) {
      for (const target of priority) {
        const debt = working.find((d) => d.id === target.id);
        if (!debt || debt.remaining <= 0) continue;
        const payment = Math.min(available, debt.remaining);
        debt.remaining -= payment;
        totalPaid += payment;
        available -= payment;
        if (available <= 0) break;
      }
    }

    for (const debt of working) {
      if (debt.remaining <= 0.005 && debt.clearedAt === null) {
        debt.remaining = 0;
        debt.clearedAt = month;
      }
    }
  }

  const neverClears = working.some((d) => d.remaining > 0.005);

  return {
    strategy,
    months: neverClears ? null : month,
    totalInterest: working.reduce((sum, d) => sum + d.interestPaid, 0),
    totalPaid,
    perDebt: working.map((d) => ({
      id: d.id,
      name: d.name,
      monthsToClear: d.clearedAt,
      interestPaid: d.interestPaid,
    })),
    order: priority.map((d) => d.name),
    neverClears,
  };
}

export interface PayoffComparison {
  minimum: PayoffResult;
  avalanche: PayoffResult;
  snowball: PayoffResult;
  /** Interest saved by the best strategy against paying minimums. */
  bestInterestSaved: number;
  /** Months saved by the best strategy against paying minimums. */
  bestMonthsSaved: number | null;
  best: PayoffStrategy;
}

/** Runs all three strategies so they can be compared side by side. */
export function comparePayoffStrategies(
  debts: PayoffDebt[],
  extraMonthlyPayment = 0,
): PayoffComparison {
  const minimum = calculatePayoff(debts, "minimum", 0);
  const avalanche = calculatePayoff(debts, "avalanche", extraMonthlyPayment);
  const snowball = calculatePayoff(debts, "snowball", extraMonthlyPayment);

  // Avalanche always costs the least interest by construction; snowball can
  // only match it. Ties go to snowball, which most people stick to better.
  const best: PayoffStrategy =
    avalanche.totalInterest < snowball.totalInterest - 0.5 ? "avalanche" : "snowball";
  const bestResult = best === "avalanche" ? avalanche : snowball;

  return {
    minimum,
    avalanche,
    snowball,
    best,
    bestInterestSaved: Math.max(minimum.totalInterest - bestResult.totalInterest, 0),
    bestMonthsSaved:
      minimum.months !== null && bestResult.months !== null
        ? minimum.months - bestResult.months
        : null,
  };
}

/** Months to reach a savings target at a monthly contribution (§36). */
export function monthsToSave(
  target: number,
  current: number,
  monthlyContribution: number,
  annualInterestRate = 0,
): number | null {
  const remaining = Math.max(target - current, 0);
  if (remaining === 0) return 0;
  if (monthlyContribution <= 0) return null;

  if (annualInterestRate <= 0) {
    return Math.ceil(remaining / monthlyContribution);
  }

  const monthlyRate = annualInterestRate / 100 / 12;
  let balance = current;
  let months = 0;
  while (balance < target && months < MAX_MONTHS) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    months += 1;
  }
  return balance >= target ? months : null;
}
