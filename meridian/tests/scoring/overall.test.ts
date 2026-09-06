import { describe, expect, it } from "vitest";

import {
  PILLAR_WEIGHTS,
  calculateOverallScore,
  getScoreStatus,
  scoreFinancialHealth,
} from "@/lib/scoring";

import { excellentAnswers, input, poorAnswers } from "./helpers";

describe("calculateOverallScore", () => {
  it("applies the documented pillar weights", () => {
    // 72 x 0.25 + 48 x 0.30 + 81 x 0.25 + 65 x 0.20 = 65.65
    expect(
      calculateOverallScore({ spend: 72, save: 48, borrow: 81, plan: 65 }).score,
    ).toBe(66);
  });

  it("sums the pillar weights to exactly 1", () => {
    const total = Object.values(PILLAR_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("scores a perfect profile at 100 and a failing one at 0", () => {
    expect(
      calculateOverallScore({ spend: 100, save: 100, borrow: 100, plan: 100 }).score,
    ).toBe(100);
    expect(calculateOverallScore({ spend: 0, save: 0, borrow: 0, plan: 0 }).score).toBe(0);
  });

  it("renormalises when a pillar could not be measured", () => {
    // Only Save and Plan measurable: 0.30 and 0.20 of 0.50
    const { score, measuredWeight } = calculateOverallScore({
      spend: null,
      save: 60,
      borrow: null,
      plan: 80,
    });
    expect(measuredWeight).toBeCloseTo(0.5, 6);
    expect(score).toBe(68); // 60 x 0.6 + 80 x 0.4
  });

  it("reports zero measured weight when nothing could be scored", () => {
    const { score, measuredWeight } = calculateOverallScore({
      spend: null,
      save: null,
      borrow: null,
      plan: null,
    });
    expect(measuredWeight).toBe(0);
    expect(score).toBe(0);
  });
});

describe("getScoreStatus", () => {
  it("puts each score in its documented band", () => {
    expect(getScoreStatus(100).label).toBe("Excellent");
    expect(getScoreStatus(80).label).toBe("Excellent");
    expect(getScoreStatus(79).label).toBe("Good");
    expect(getScoreStatus(65).label).toBe("Good");
    expect(getScoreStatus(64).label).toBe("Fair");
    expect(getScoreStatus(50).label).toBe("Fair");
    expect(getScoreStatus(49).label).toBe("Needs Improvement");
    expect(getScoreStatus(35).label).toBe("Needs Improvement");
    expect(getScoreStatus(34).label).toBe("Critical");
    expect(getScoreStatus(0).label).toBe("Critical");
  });

  it("clamps out-of-range input rather than throwing", () => {
    expect(getScoreStatus(140).label).toBe("Excellent");
    expect(getScoreStatus(-20).label).toBe("Critical");
  });
});

describe("scoreFinancialHealth", () => {
  const perfect = input({
    ...excellentAnswers(),
    monthlyIncome: 8000,
    monthlyExpenses: 3200,
    essentialMonthlyExpenses: 2400,
    monthlyDebtPayments: 0,
    monthlySavings: 1600,
    emergencyFundAmount: 20000,
    totalSavings: 60000,
    totalDebt: 0,
    highInterestDebt: 0,
  });

  const average = input({
    monthlyIncome: 4500,
    monthlyExpenses: 2900,
    essentialMonthlyExpenses: 2200,
    monthlyDebtPayments: 450,
    monthlySavings: 300,
    emergencyFundAmount: 4400,
    totalSavings: 7000,
    totalDebt: 18000,
    highInterestDebt: 4000,
    billPayment: "usually",
    savingsConsistency: "most_months",
    goals: "clear",
    insuranceApplicable: ["health", "vehicle"],
    insuranceCovered: ["health"],
    longTermPlanning: "basic_plan",
    reviewHabit: "every_few_months",
  });

  const critical = input({
    ...poorAnswers(),
    monthlyIncome: 2600,
    monthlyExpenses: 2500,
    essentialMonthlyExpenses: 2200,
    monthlyDebtPayments: 1100, // 42% of income, past the alert threshold
    monthlySavings: 0,
    emergencyFundAmount: 0,
    totalSavings: 0,
    totalDebt: 30000,
    highInterestDebt: 26000,
  });

  it("scores a strong profile as Excellent", () => {
    const result = scoreFinancialHealth(perfect);
    expect(result.overallScore).toBe(100);
    expect(result.overallStatus.label).toBe("Excellent");
    expect(result.measuredWeight).toBe(1);
    expect(result.hasInsufficientData).toBe(false);
  });

  it("scores an average profile in the middle bands", () => {
    const result = scoreFinancialHealth(average);
    expect(result.overallScore).toBeGreaterThan(35);
    expect(result.overallScore).toBeLessThan(80);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("scores a stretched profile as Critical and raises the right alerts", () => {
    const result = scoreFinancialHealth(critical);
    expect(result.overallScore).toBeLessThanOrEqual(34);
    expect(result.overallStatus.label).toBe("Critical");

    const keys = result.alerts.map((a) => a.key);
    expect(keys).toContain("negative_disposable_income");
    expect(keys).toContain("emergency_fund_below_one_month");
    expect(keys).toContain("high_debt_burden");
    expect(keys).toContain("high_interest_majority");
  });

  it("reproduces its own overall score from the four displayed pillar scores", () => {
    for (const profile of [perfect, average, critical]) {
      const result = scoreFinancialHealth(profile);
      const recomputed = calculateOverallScore({
        spend: result.spend.score,
        save: result.save.score,
        borrow: result.borrow.score,
        plan: result.plan.score,
      }).score;
      expect(recomputed).toBe(result.overallScore);
    }
  });

  it("is deterministic", () => {
    const a = scoreFinancialHealth(average);
    const b = scoreFinancialHealth(average);
    expect(b).toEqual(a);
  });

  it("never returns a score outside 0-100", () => {
    const absurd = input({
      monthlyIncome: 1,
      monthlyExpenses: 1e9,
      essentialMonthlyExpenses: 1e9,
      monthlyDebtPayments: 1e9,
      totalDebt: 1e12,
      highInterestDebt: 1e12,
      ...poorAnswers(),
    });
    const result = scoreFinancialHealth(absurd);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    for (const pillar of result.pillars) {
      if (pillar.score !== null) {
        expect(pillar.score).toBeGreaterThanOrEqual(0);
        expect(pillar.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("clamps hostile input instead of producing NaN", () => {
    const hostile = input({
      monthlyIncome: Number.NaN,
      monthlyExpenses: -500,
      monthlySavings: Number.POSITIVE_INFINITY,
      totalDebt: -1,
      highInterestDebt: 1e6,
    });
    const result = scoreFinancialHealth(hostile);
    expect(Number.isFinite(result.overallScore)).toBe(true);
    expect(result.metrics.highInterestDebt).toBe(0);
  });
});

describe("recommendation impact", () => {
  it("measures impact by re-running the engine, never by estimating", () => {
    const profile = input({
      monthlyIncome: 5000,
      monthlyExpenses: 3000,
      essentialMonthlyExpenses: 2500,
      monthlyDebtPayments: 300,
      monthlySavings: 200,
      emergencyFundAmount: 1250, // half a month
      totalSavings: 1250,
      totalDebt: 10000,
      highInterestDebt: 8000,
      billPayment: "usually",
      savingsConsistency: "occasionally",
      goals: "general",
      insuranceApplicable: ["health"],
      insuranceCovered: [],
      longTermPlanning: "thinking_about_it",
      reviewHabit: "rarely",
    });

    const base = scoreFinancialHealth(profile);
    const buffer = base.recommendations.find(
      (r) => r.key === "build_starter_emergency_fund",
    );
    expect(buffer).toBeDefined();
    expect(buffer?.estimatedImpact).toBeGreaterThan(0);

    // Applying the change to the input must move the real score by the
    // amount the recommendation promised.
    const applied = scoreFinancialHealth({
      ...profile,
      emergencyFundAmount: profile.essentialMonthlyExpenses,
      totalSavings: profile.essentialMonthlyExpenses,
    });
    expect(applied.overallScore - base.overallScore).toBe(buffer?.estimatedImpact);
  });

  it("orders recommendations by priority, then by measured impact", () => {
    const result = scoreFinancialHealth(
      input({
        ...poorAnswers(),
        monthlyIncome: 3000,
        monthlyExpenses: 2700,
        essentialMonthlyExpenses: 2400,
        monthlyDebtPayments: 700,
        totalDebt: 20000,
        highInterestDebt: 15000,
      }),
    );

    const rank = { high: 0, medium: 1, low: 2 } as const;
    const order = result.recommendations.map((r) => rank[r.priority]);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("offers nothing to improve when everything is already at full marks", () => {
    const result = scoreFinancialHealth(
      input({
        ...excellentAnswers(),
        monthlyIncome: 9000,
        monthlyExpenses: 3000,
        essentialMonthlyExpenses: 2000,
        monthlySavings: 2500,
        emergencyFundAmount: 30000,
        totalSavings: 90000,
        totalDebt: 0,
      }),
    );
    expect(result.overallScore).toBe(100);
    expect(result.recommendations).toHaveLength(0);
    expect(result.alerts).toHaveLength(0);
  });
});
