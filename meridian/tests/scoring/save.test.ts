import { describe, expect, it } from "vitest";

import {
  calculateSaveScore,
  emergencyFundMonths,
  emergencyFundScore,
  savingsConsistencyScore,
  savingsRateScore,
} from "@/lib/scoring";

import { excellentAnswers, input } from "./helpers";

describe("emergencyFundScore", () => {
  it("matches every reference point in the specification", () => {
    expect(emergencyFundScore(0)).toBe(0);
    expect(emergencyFundScore(1)).toBeCloseTo(16.67, 2);
    expect(emergencyFundScore(2)).toBeCloseTo(33.33, 2);
    expect(emergencyFundScore(3)).toBe(50);
    expect(emergencyFundScore(4)).toBeCloseTo(66.67, 2);
    expect(emergencyFundScore(5)).toBeCloseTo(83.33, 2);
    expect(emergencyFundScore(6)).toBe(100);
  });

  it("does not reward more than six months", () => {
    expect(emergencyFundScore(12)).toBe(100);
    expect(emergencyFundScore(60)).toBe(100);
  });
});

describe("savingsRateScore", () => {
  it("matches every reference point in the specification", () => {
    expect(savingsRateScore(0)).toBe(0);
    expect(savingsRateScore(0.05)).toBe(25);
    expect(savingsRateScore(0.1)).toBeCloseTo(50, 6);
    expect(savingsRateScore(0.15)).toBeCloseTo(75, 6);
    expect(savingsRateScore(0.2)).toBe(100);
  });

  it("caps at full marks and never goes negative", () => {
    expect(savingsRateScore(0.6)).toBe(100);
    expect(savingsRateScore(-0.1)).toBe(0);
  });
});

describe("savingsConsistencyScore", () => {
  it("maps each answer to its documented score", () => {
    expect(savingsConsistencyScore("every_month")).toBe(100);
    expect(savingsConsistencyScore("most_months")).toBe(75);
    expect(savingsConsistencyScore("occasionally")).toBe(50);
    expect(savingsConsistencyScore("rarely")).toBe(25);
    expect(savingsConsistencyScore("never")).toBe(0);
    expect(savingsConsistencyScore(null)).toBeNull();
  });
});

describe("emergencyFundMonths", () => {
  it("treats an empty fund as a measured zero, not missing data", () => {
    expect(
      emergencyFundMonths(input({ emergencyFundAmount: 0, essentialMonthlyExpenses: 0 })),
    ).toBe(0);
  });

  it("cannot be measured without essential expenses to divide by", () => {
    expect(
      emergencyFundMonths(
        input({ emergencyFundAmount: 5000, essentialMonthlyExpenses: 0 }),
      ),
    ).toBeNull();
  });
});

describe("calculateSaveScore", () => {
  it("scores a profile with no savings at zero on both measurable components", () => {
    const result = calculateSaveScore(
      input({
        monthlyIncome: 4000,
        monthlyExpenses: 3800,
        essentialMonthlyExpenses: 3000,
        monthlySavings: 0,
        emergencyFundAmount: 0,
        totalSavings: 0,
        savingsConsistency: "never",
      }),
    );

    expect(result.components.emergencyFund).toBe(0);
    expect(result.components.savingsRate).toBe(0);
    expect(result.components.savingsConsistency).toBe(0);
    expect(result.score).toBe(0);
  });

  it("scores a three-month emergency fund at half marks on that component", () => {
    const result = calculateSaveScore(
      input({
        ...excellentAnswers(),
        monthlyIncome: 5000,
        essentialMonthlyExpenses: 2000,
        emergencyFundAmount: 6000,
        totalSavings: 6000,
        monthlySavings: 500, // 10%
      }),
    );

    expect(result.components.emergencyFund).toBe(50);
    expect(result.components.savingsRate).toBe(50);
    expect(result.components.savingsConsistency).toBe(100);
    // 50 x 0.45 + 50 x 0.35 + 100 x 0.20 = 60
    expect(result.score).toBe(60);
  });

  it("scores a six-month fund and a 20% savings rate at full marks", () => {
    const result = calculateSaveScore(
      input({
        ...excellentAnswers(),
        monthlyIncome: 5000,
        essentialMonthlyExpenses: 2000,
        emergencyFundAmount: 12000,
        totalSavings: 20000,
        monthlySavings: 1000,
      }),
    );

    expect(result.score).toBe(100);
  });

  it("rewards a high savings rate even before the fund is complete", () => {
    const result = calculateSaveScore(
      input({
        ...excellentAnswers(),
        monthlyIncome: 5000,
        essentialMonthlyExpenses: 2500,
        emergencyFundAmount: 2500, // 1 month
        totalSavings: 2500,
        monthlySavings: 1500, // 30%
      }),
    );

    expect(result.components.savingsRate).toBe(100);
    // 16.67 x 0.45 + 100 x 0.35 + 100 x 0.20 = 62.5
    expect(result.score).toBe(63);
  });

  it("cannot measure the savings rate without income", () => {
    const result = calculateSaveScore(
      input({
        monthlyIncome: 0,
        essentialMonthlyExpenses: 1500,
        emergencyFundAmount: 4500,
        monthlySavings: 0,
        savingsConsistency: "most_months",
      }),
    );

    const rate = result.breakdown.find((c) => c.key === "savingsRate");
    expect(rate?.status).toBe("insufficientData");
    // Emergency fund (3 months -> 50) and consistency (75) split the weight
    // 0.45 : 0.20, renormalised to 0.6923 : 0.3077 -> 57.7
    expect(result.score).toBe(58);
  });
});
