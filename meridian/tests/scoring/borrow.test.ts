import { describe, expect, it } from "vitest";

import {
  calculateBorrowScore,
  debtPaymentScore,
  debtToIncomeScore,
  highInterestDebtScore,
} from "@/lib/scoring";

import { input } from "./helpers";

describe("debtToIncomeScore", () => {
  it("matches the specification's boundaries", () => {
    expect(debtToIncomeScore(0)).toBe(100);
    expect(debtToIncomeScore(0.2)).toBe(100);
    expect(debtToIncomeScore(0.45)).toBeCloseTo(50, 6);
    expect(debtToIncomeScore(0.7)).toBe(0);
    expect(debtToIncomeScore(3)).toBe(0);
  });

  it("falls linearly between the two boundaries", () => {
    expect(debtToIncomeScore(0.3)).toBeCloseTo(80, 6);
    expect(debtToIncomeScore(0.6)).toBeCloseTo(20, 6);
  });
});

describe("debtPaymentScore", () => {
  it("matches the specification's boundaries", () => {
    expect(debtPaymentScore(0)).toBe(100);
    expect(debtPaymentScore(0.1)).toBe(100);
    expect(debtPaymentScore(0.3)).toBeCloseTo(50, 6);
    expect(debtPaymentScore(0.5)).toBe(0);
    expect(debtPaymentScore(0.9)).toBe(0);
  });
});

describe("highInterestDebtScore", () => {
  it("scores full marks when there is no debt at all", () => {
    expect(highInterestDebtScore(0, 0)).toBe(100);
  });

  it("scales with the share of debt that is expensive", () => {
    expect(highInterestDebtScore(0, 10000)).toBe(100);
    expect(highInterestDebtScore(2500, 10000)).toBe(75);
    expect(highInterestDebtScore(5000, 10000)).toBe(50);
    expect(highInterestDebtScore(10000, 10000)).toBe(0);
  });
});

describe("calculateBorrowScore", () => {
  it("scores a debt-free person at 100 and never penalises them", () => {
    const result = calculateBorrowScore(
      input({
        monthlyIncome: 4000,
        totalDebt: 0,
        highInterestDebt: 0,
        monthlyDebtPayments: 0,
      }),
    );

    expect(result.score).toBe(100);
    expect(result.components.debtToIncome).toBe(100);
    expect(result.components.debtPayment).toBe(100);
    expect(result.components.highInterestDebt).toBe(100);
    expect(result.insufficientData).toBe(false);
  });

  it("scores a debt-free person at 100 even with no income recorded", () => {
    const result = calculateBorrowScore(
      input({ monthlyIncome: 0, totalDebt: 0, monthlyDebtPayments: 0 }),
    );
    expect(result.score).toBe(100);
  });

  it("scores low, cheap debt highly", () => {
    const result = calculateBorrowScore(
      input({
        monthlyIncome: 5000, // 60,000 a year
        totalDebt: 9000, // DTI 15%
        highInterestDebt: 0,
        monthlyDebtPayments: 400, // 8%
      }),
    );

    expect(result.score).toBe(100);
  });

  it("scores heavy debt down across every component", () => {
    const result = calculateBorrowScore(
      input({
        monthlyIncome: 3000, // 36,000 a year
        totalDebt: 25200, // DTI 70%
        highInterestDebt: 25200,
        monthlyDebtPayments: 1500, // 50%
      }),
    );

    expect(result.components.debtToIncome).toBe(0);
    expect(result.components.debtPayment).toBe(0);
    expect(result.components.highInterestDebt).toBe(0);
    expect(result.score).toBe(0);
  });

  it("isolates the cost of high-interest debt", () => {
    const cheap = calculateBorrowScore(
      input({
        monthlyIncome: 5000,
        totalDebt: 12000,
        highInterestDebt: 0,
        monthlyDebtPayments: 500,
      }),
    );
    const expensive = calculateBorrowScore(
      input({
        monthlyIncome: 5000,
        totalDebt: 12000,
        highInterestDebt: 12000,
        monthlyDebtPayments: 500,
      }),
    );

    expect(cheap.score).toBe(100);
    // Only the 20% high-interest component changes: 100 - 20 = 80
    expect(expensive.score).toBe(80);
  });

  it("still measures high-interest exposure when income is unknown", () => {
    const result = calculateBorrowScore(
      input({ monthlyIncome: 0, totalDebt: 8000, highInterestDebt: 4000 }),
    );

    const dti = result.breakdown.find((c) => c.key === "debtToIncome");
    expect(dti?.status).toBe("insufficientData");
    // Only the high-interest component survives, so it carries the pillar.
    expect(result.score).toBe(50);
  });
});
