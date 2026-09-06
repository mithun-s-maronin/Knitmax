import { describe, expect, it } from "vitest";

import {
  billPaymentScore,
  calculateSpendScore,
  disposableIncomeScore,
  expenseRatioScore,
} from "@/lib/scoring";

import { excellentAnswers, input } from "./helpers";

describe("expenseRatioScore", () => {
  it("matches every reference point in the specification", () => {
    expect(expenseRatioScore(0.5)).toBe(100);
    expect(expenseRatioScore(0.6)).toBe(80);
    expect(expenseRatioScore(0.7)).toBeCloseTo(60, 6);
    expect(expenseRatioScore(0.8)).toBeCloseTo(40, 6);
    expect(expenseRatioScore(0.9)).toBeCloseTo(20, 6);
    expect(expenseRatioScore(1.0)).toBe(0);
  });

  it("scores full marks below the ideal and nothing beyond the floor", () => {
    expect(expenseRatioScore(0)).toBe(100);
    expect(expenseRatioScore(0.25)).toBe(100);
    expect(expenseRatioScore(1.5)).toBe(0);
    expect(expenseRatioScore(10)).toBe(0);
  });
});

describe("disposableIncomeScore", () => {
  it("scores nothing when spending exceeds income", () => {
    expect(disposableIncomeScore(-0.01)).toBe(0);
    expect(disposableIncomeScore(-1)).toBe(0);
  });

  it("gives a floor of 20 for breaking even exactly", () => {
    expect(disposableIncomeScore(0)).toBe(20);
  });

  it("reaches full marks at a 30% margin", () => {
    expect(disposableIncomeScore(0.3)).toBe(100);
    expect(disposableIncomeScore(0.5)).toBe(100);
  });

  it("interpolates between the floor and the target", () => {
    expect(disposableIncomeScore(0.15)).toBeCloseTo(60, 6);
  });
});

describe("billPaymentScore", () => {
  it("maps each answer to its documented score", () => {
    expect(billPaymentScore("always")).toBe(100);
    expect(billPaymentScore("usually")).toBe(75);
    expect(billPaymentScore("sometimes")).toBe(50);
    expect(billPaymentScore("rarely")).toBe(25);
    expect(billPaymentScore("never")).toBe(0);
  });

  it("returns null when unanswered rather than assuming the worst", () => {
    expect(billPaymentScore(null)).toBeNull();
  });
});

describe("calculateSpendScore", () => {
  it("scores excellent spending at full marks", () => {
    const result = calculateSpendScore(
      input({
        ...excellentAnswers(),
        monthlyIncome: 6000,
        monthlyExpenses: 3000,
        essentialMonthlyExpenses: 2200,
        monthlyDebtPayments: 0,
      }),
    );

    // 100 x 0.50 + 100 x 0.30 + 100 x 0.20
    expect(result.score).toBe(100);
    expect(result.components.expenseRatio).toBe(100);
    expect(result.components.disposableIncome).toBe(100);
    expect(result.components.billPayment).toBe(100);
  });

  it("scores high spending down across two components", () => {
    const result = calculateSpendScore(
      input({
        ...excellentAnswers(),
        monthlyIncome: 4000,
        monthlyExpenses: 3400, // 85%
        essentialMonthlyExpenses: 2800,
        monthlyDebtPayments: 200, // 10% left over
      }),
    );

    // expense ratio 85% -> 30; disposable 10% -> 46.67; bills -> 100
    // 30 x 0.5 + 46.667 x 0.3 + 100 x 0.2 = 48.999...
    expect(result.components.expenseRatio).toBeCloseTo(30, 6);
    expect(result.components.disposableIncome).toBeCloseTo(46.667, 2);
    expect(result.score).toBe(49);
  });

  it("scores expenses equal to income at the bottom of both ratio components", () => {
    const result = calculateSpendScore(
      input({
        ...excellentAnswers(),
        monthlyIncome: 3000,
        monthlyExpenses: 3000,
        essentialMonthlyExpenses: 2400,
        monthlyDebtPayments: 0,
      }),
    );

    expect(result.components.expenseRatio).toBe(0);
    // Breaking even is not the same failure as overspending.
    expect(result.components.disposableIncome).toBe(20);
    // 0 x 0.5 + 20 x 0.3 + 100 x 0.2 = 26
    expect(result.score).toBe(26);
  });

  it("scores negative disposable income at zero and flags it", () => {
    const result = calculateSpendScore(
      input({
        ...excellentAnswers(),
        monthlyIncome: 3000,
        monthlyExpenses: 2800,
        essentialMonthlyExpenses: 2400,
        monthlyDebtPayments: 600,
      }),
    );

    expect(result.components.disposableIncome).toBe(0);
    expect(result.weaknesses.some((w) => w.includes("more than you earn"))).toBe(true);
  });

  it("reports insufficient data rather than a false score at zero income", () => {
    const result = calculateSpendScore(
      input({ ...excellentAnswers(), monthlyIncome: 0, monthlyExpenses: 1200 }),
    );

    const ratio = result.breakdown.find((c) => c.key === "expenseRatio");
    const disposable = result.breakdown.find((c) => c.key === "disposableIncome");
    expect(ratio?.status).toBe("insufficientData");
    expect(ratio?.score).toBeNull();
    expect(disposable?.status).toBe("insufficientData");
    expect(result.insufficientData).toBe(true);

    // Only bill payment could be measured, so it carries the whole pillar.
    expect(result.score).toBe(100);
  });

  it("returns a null pillar score when nothing at all can be measured", () => {
    const result = calculateSpendScore(input({ monthlyIncome: 0, billPayment: null }));
    expect(result.score).toBeNull();
    expect(result.status).toBeNull();
  });
});
