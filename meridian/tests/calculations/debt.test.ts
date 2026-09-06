import { describe, expect, it } from "vitest";

import {
  calculatePayoff,
  comparePayoffStrategies,
  monthsToSave,
  type PayoffDebt,
} from "@/lib/calculations/debt";

const card: PayoffDebt = {
  id: "card",
  name: "Credit card",
  balance: 4000,
  interestRate: 22,
  monthlyPayment: 120,
  minimumPayment: 100,
};

const loan: PayoffDebt = {
  id: "loan",
  name: "Car loan",
  balance: 9000,
  interestRate: 6,
  monthlyPayment: 250,
  minimumPayment: 250,
};

describe("calculatePayoff", () => {
  it("returns immediately when there is nothing owed", () => {
    const result = calculatePayoff([], "avalanche");
    expect(result.months).toBe(0);
    expect(result.totalInterest).toBe(0);
    expect(result.neverClears).toBe(false);
  });

  it("charges interest on the balance as it goes", () => {
    const result = calculatePayoff([card], "minimum");
    expect(result.totalInterest).toBeGreaterThan(0);
    expect(result.totalPaid).toBeGreaterThan(card.balance);
  });

  it("clears a simple interest-free debt in the expected number of months", () => {
    const result = calculatePayoff(
      [{ ...card, interestRate: 0, balance: 1200, monthlyPayment: 100, minimumPayment: 100 }],
      "minimum",
    );
    expect(result.months).toBe(12);
    expect(result.totalInterest).toBe(0);
  });

  it("reports that a debt never clears when payments do not cover the interest", () => {
    const result = calculatePayoff(
      [{ ...card, balance: 10000, interestRate: 30, monthlyPayment: 50, minimumPayment: 50 }],
      "minimum",
    );
    expect(result.neverClears).toBe(true);
    expect(result.months).toBeNull();
  });

  it("attacks the highest rate first under avalanche", () => {
    const result = calculatePayoff([loan, card], "avalanche");
    expect(result.order[0]).toBe("Credit card");
  });

  it("attacks the smallest balance first under snowball", () => {
    const result = calculatePayoff([loan, card], "snowball");
    expect(result.order[0]).toBe("Credit card");
  });

  it("rolls a cleared debt's payment into the next one", () => {
    const debts = [loan, card];
    const withRollover = calculatePayoff(debts, "avalanche");
    const withoutRollover = calculatePayoff(debts, "minimum");
    // The same money, applied in a better order, clears the whole set sooner.
    expect(withRollover.months).toBeLessThan(withoutRollover.months ?? Infinity);
  });

  it("clears everything sooner with an extra payment", () => {
    const base = calculatePayoff([loan, card], "avalanche", 0);
    const boosted = calculatePayoff([loan, card], "avalanche", 200);
    expect(boosted.months).toBeLessThan(base.months ?? Infinity);
    expect(boosted.totalInterest).toBeLessThan(base.totalInterest);
  });
});

describe("comparePayoffStrategies", () => {
  it("never reports avalanche as costing more interest than snowball", () => {
    const comparison = comparePayoffStrategies([loan, card], 100);
    expect(comparison.avalanche.totalInterest).toBeLessThanOrEqual(
      comparison.snowball.totalInterest + 0.01,
    );
  });

  it("reports a real saving against paying minimums", () => {
    const comparison = comparePayoffStrategies([loan, card], 150);
    expect(comparison.bestInterestSaved).toBeGreaterThan(0);
    expect(comparison.bestMonthsSaved).toBeGreaterThan(0);
  });
});

describe("monthsToSave", () => {
  it("is zero when the target is already met", () => {
    expect(monthsToSave(1000, 1200, 100)).toBe(0);
  });

  it("cannot be reached with no contribution", () => {
    expect(monthsToSave(1000, 0, 0)).toBeNull();
  });

  it("divides evenly with no interest", () => {
    expect(monthsToSave(1200, 0, 100)).toBe(12);
    expect(monthsToSave(1250, 0, 100)).toBe(13);
  });

  it("arrives sooner with interest than without", () => {
    const plain = monthsToSave(12000, 0, 500, 0);
    const withInterest = monthsToSave(12000, 0, 500, 5);
    expect(withInterest).toBeLessThanOrEqual(plain ?? Infinity);
  });
});
