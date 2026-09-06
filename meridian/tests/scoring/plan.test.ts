import { describe, expect, it } from "vitest";

import {
  calculatePlanScore,
  goalsScore,
  longTermPlanningScore,
  protectionScore,
  reviewHabitScore,
} from "@/lib/scoring";

import { input } from "./helpers";

describe("goalsScore", () => {
  it("maps each answer to its documented score", () => {
    expect(goalsScore("clear_and_tracking")).toBe(100);
    expect(goalsScore("clear")).toBe(75);
    expect(goalsScore("general")).toBe(50);
    expect(goalsScore("none")).toBe(0);
    expect(goalsScore(null)).toBeNull();
  });
});

describe("protectionScore", () => {
  it("counts only the cover types that apply to the person", () => {
    // Someone with no car and no property: two types apply, both held.
    expect(protectionScore(["health", "life"], ["health", "life"])).toBe(100);
    // The same person is not marked down for having no vehicle cover.
    expect(protectionScore(["health", "life"], ["health", "life", "vehicle"])).toBe(100);
  });

  it("scores the share of relevant cover actually held", () => {
    expect(protectionScore(["health", "life", "vehicle", "property"], ["health"])).toBe(25);
    expect(
      protectionScore(["health", "life", "vehicle", "property"], ["health", "life"]),
    ).toBe(50);
    expect(protectionScore(["health", "life"], [])).toBe(0);
  });

  it("cannot be measured when nothing applies", () => {
    expect(protectionScore([], [])).toBeNull();
  });

  it("ignores duplicates in the applicable list", () => {
    expect(protectionScore(["health", "health"], ["health"])).toBe(100);
  });
});

describe("longTermPlanningScore", () => {
  it("maps each answer to its documented score", () => {
    expect(longTermPlanningScore("detailed_plan")).toBe(100);
    expect(longTermPlanningScore("basic_plan")).toBe(75);
    expect(longTermPlanningScore("thinking_about_it")).toBe(40);
    expect(longTermPlanningScore("no_plan")).toBe(0);
  });
});

describe("reviewHabitScore", () => {
  it("maps each answer to its documented score", () => {
    expect(reviewHabitScore("weekly")).toBe(100);
    expect(reviewHabitScore("monthly")).toBe(85);
    expect(reviewHabitScore("every_few_months")).toBe(60);
    expect(reviewHabitScore("rarely")).toBe(30);
    expect(reviewHabitScore("never")).toBe(0);
  });
});

describe("calculatePlanScore", () => {
  it("scores excellent planning at full marks", () => {
    const result = calculatePlanScore(
      input({
        goals: "clear_and_tracking",
        insuranceApplicable: ["health", "life"],
        insuranceCovered: ["health", "life"],
        longTermPlanning: "detailed_plan",
        reviewHabit: "weekly",
      }),
    );

    expect(result.score).toBe(100);
  });

  it("scores average planning in the middle", () => {
    const result = calculatePlanScore(
      input({
        goals: "clear", // 75 x 0.35 = 26.25
        insuranceApplicable: ["health", "life", "vehicle", "property"],
        insuranceCovered: ["health", "vehicle"], // 50 x 0.25 = 12.5
        longTermPlanning: "basic_plan", // 75 x 0.25 = 18.75
        reviewHabit: "every_few_months", // 60 x 0.15 = 9
      }),
    );

    // 26.25 + 12.5 + 18.75 + 9 = 66.5
    expect(result.score).toBe(67);
  });

  it("scores no planning at zero", () => {
    const result = calculatePlanScore(
      input({
        goals: "none",
        insuranceApplicable: ["health", "life"],
        insuranceCovered: [],
        longTermPlanning: "no_plan",
        reviewHabit: "never",
      }),
    );

    expect(result.score).toBe(0);
  });

  it("redistributes protection's weight when no cover type applies", () => {
    const result = calculatePlanScore(
      input({
        goals: "clear_and_tracking",
        insuranceApplicable: [],
        insuranceCovered: [],
        longTermPlanning: "no_plan",
        reviewHabit: "never",
      }),
    );

    const protection = result.breakdown.find((c) => c.key === "protection");
    expect(protection?.status).toBe("insufficientData");
    // Goals keeps 0.35 of the remaining 0.75 weight: 100 x (0.35 / 0.75) = 46.7
    expect(result.score).toBe(47);
  });

  it("names the specific cover that is missing", () => {
    const result = calculatePlanScore(
      input({
        goals: "clear",
        insuranceApplicable: ["health", "vehicle"],
        insuranceCovered: ["health"],
        longTermPlanning: "basic_plan",
        reviewHabit: "monthly",
      }),
    );

    expect(result.weaknesses.some((w) => w.includes("Vehicle"))).toBe(true);
  });
});
