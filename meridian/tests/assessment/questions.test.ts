import { describe, expect, it } from "vitest";

import {
  ASSESSMENT_QUESTIONS,
  ASSESSMENT_SECTIONS,
  assessmentProgress,
  validateSection,
  visibleQuestions,
  type AnswerMap,
} from "@/lib/assessment/questions";
import { answersForStorage, answersToScoringInput } from "@/lib/assessment/toScoringInput";
import { validateAllSections } from "@/lib/assessment/schema";
import { scoreFinancialHealth } from "@/lib/scoring";

const complete: AnswerMap = {
  currency: "USD",
  age_range: "25_34",
  employment_status: "employed_full_time",
  dependents: 1,
  primary_income: 5000,
  other_income: 500,
  monthly_expenses: 3000,
  essential_expenses: 2200,
  bill_payment: "always",
  total_savings: 15000,
  emergency_fund: 12000,
  monthly_savings: 800,
  savings_consistency: "every_month",
  has_debt: true,
  total_debt: 14000,
  monthly_debt_payments: 450,
  high_interest_debt: 3000,
  goals: "clear_and_tracking",
  insurance_applicable: ["health", "vehicle"],
  insurance_covered: ["health"],
  long_term_planning: "basic_plan",
  review_habit: "monthly",
};

describe("question set", () => {
  it("has unique question ids", () => {
    const ids = ASSESSMENT_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every choice question at least two options", () => {
    for (const q of ASSESSMENT_QUESTIONS) {
      if (q.type === "radio" || q.type === "multiselect") {
        expect(q.options?.length ?? 0).toBeGreaterThan(1);
      }
    }
  });

  it("hides the debt questions until the user says they have debt", () => {
    const debtSection = ASSESSMENT_SECTIONS.find((s) => s.id === "debt")!;
    expect(visibleQuestions(debtSection, { has_debt: false }).map((q) => q.id)).toEqual([
      "has_debt",
    ]);
    expect(visibleQuestions(debtSection, { has_debt: true }).length).toBe(4);
  });

  it("hides the held-insurance question until a type is marked relevant", () => {
    const planning = ASSESSMENT_SECTIONS.find((s) => s.id === "planning")!;
    const hidden = visibleQuestions(planning, { insurance_applicable: [] });
    expect(hidden.map((q) => q.id)).not.toContain("insurance_covered");
    const shown = visibleQuestions(planning, { insurance_applicable: ["health"] });
    expect(shown.map((q) => q.id)).toContain("insurance_covered");
  });
});

describe("validation", () => {
  it("accepts a complete set of answers", () => {
    expect(validateAllSections(complete)).toEqual({});
  });

  it("requires the questions the score depends on", () => {
    const spending = ASSESSMENT_SECTIONS.find((s) => s.id === "spending")!;
    const errors = validateSection(spending, {});
    expect(errors.monthly_expenses).toBeDefined();
    expect(errors.essential_expenses).toBeDefined();
    expect(errors.bill_payment).toBeDefined();
  });

  it("rejects essential costs larger than total spending", () => {
    const errors = validateAllSections({
      ...complete,
      monthly_expenses: 2000,
      essential_expenses: 3000,
    });
    expect(errors.essential_expenses).toContain("cannot be more than");
  });

  it("rejects an emergency fund larger than total savings", () => {
    const errors = validateAllSections({
      ...complete,
      total_savings: 1000,
      emergency_fund: 5000,
    });
    expect(errors.emergency_fund).toContain("cannot be larger");
  });

  it("rejects high-interest debt larger than total debt", () => {
    const errors = validateAllSections({
      ...complete,
      total_debt: 1000,
      high_interest_debt: 5000,
    });
    expect(errors.high_interest_debt).toContain("cannot be more");
  });

  it("does not demand debt figures from someone with no debt", () => {
    const errors = validateAllSections({
      ...complete,
      has_debt: false,
      total_debt: null,
      monthly_debt_payments: null,
      high_interest_debt: null,
    });
    expect(errors).toEqual({});
  });

  it("rejects a negative amount", () => {
    const errors = validateAllSections({ ...complete, monthly_savings: -50 });
    expect(errors.monthly_savings).toBeDefined();
  });
});

describe("answersToScoringInput", () => {
  it("adds every income source into one monthly figure", () => {
    const input = answersToScoringInput(complete);
    expect(input.monthlyIncome).toBe(5500);
  });

  it("zeroes every debt field when the user has no debt", () => {
    const input = answersToScoringInput({
      ...complete,
      has_debt: false,
      total_debt: 99999,
      monthly_debt_payments: 999,
      high_interest_debt: 999,
    });
    expect(input.totalDebt).toBe(0);
    expect(input.monthlyDebtPayments).toBe(0);
    expect(input.highInterestDebt).toBe(0);
    expect(scoreFinancialHealth(input).borrow.score).toBe(100);
  });

  it("keeps only insurance types that were marked relevant", () => {
    const input = answersToScoringInput({
      ...complete,
      insurance_applicable: ["health"],
      insurance_covered: ["health", "life"],
    });
    const result = scoreFinancialHealth(input);
    expect(result.plan.components.protection).toBe(100);
  });

  it("produces a scoreable input from a complete assessment", () => {
    const result = scoreFinancialHealth(answersToScoringInput(complete));
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.measuredWeight).toBe(1);
  });
});

describe("answersForStorage", () => {
  it("stores a readable rendering next to the raw value", () => {
    const stored = answersForStorage(complete);
    const bill = stored.find((a) => a.question_id === "bill_payment");
    expect(bill?.answer).toBe("Always");
    expect(bill?.answer_value).toBe("always");

    const debt = stored.find((a) => a.question_id === "has_debt");
    expect(debt?.answer).toBe("Yes");

    const insurance = stored.find((a) => a.question_id === "insurance_applicable");
    expect(insurance?.answer).toBe("Health, Vehicle");
  });

  it("does not store answers to questions that were never shown", () => {
    const stored = answersForStorage({ ...complete, has_debt: false });
    expect(stored.map((a) => a.question_id)).not.toContain("total_debt");
  });
});

describe("assessmentProgress", () => {
  it("is zero for an empty assessment and one for a complete one", () => {
    expect(assessmentProgress({})).toBe(0);
    expect(assessmentProgress(complete)).toBe(1);
  });

  it("does not count questions the user will never see", () => {
    // Saying "no debt" removes three required questions from the total.
    const partial: AnswerMap = { ...complete, has_debt: false };
    expect(assessmentProgress(partial)).toBe(1);
  });
});
