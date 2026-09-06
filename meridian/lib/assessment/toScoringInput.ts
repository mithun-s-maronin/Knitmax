import {
  emptyScoringInput,
  type BillPaymentAnswer,
  type GoalsAnswer,
  type InsuranceType,
  type LongTermPlanningAnswer,
  type ReviewHabitAnswer,
  type SavingsConsistencyAnswer,
  type ScoringInput,
} from "@/lib/scoring";

import {
  ASSESSMENT_QUESTION_MAP,
  ASSESSMENT_SECTIONS,
  visibleQuestions,
  type AnswerMap,
  type AnswerValue,
} from "./questions";

const amount = (value: AnswerValue): number => {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  return 0;
};

const choice = <T extends string>(value: AnswerValue, allowed: readonly T[]): T | null =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;

const list = (value: AnswerValue): InsuranceType[] =>
  Array.isArray(value)
    ? value.filter((v): v is InsuranceType =>
        ["health", "life", "vehicle", "property"].includes(v),
      )
    : [];

const BILL_PAYMENT = ["always", "usually", "sometimes", "rarely", "never"] as const;
const CONSISTENCY = [
  "every_month",
  "most_months",
  "occasionally",
  "rarely",
  "never",
] as const;
const GOALS = ["clear_and_tracking", "clear", "general", "none"] as const;
const LONG_TERM = ["detailed_plan", "basic_plan", "thinking_about_it", "no_plan"] as const;
const REVIEW = ["weekly", "monthly", "every_few_months", "rarely", "never"] as const;

/**
 * Turns assessment answers into the engine's input.
 *
 * This is the only place the question ids are translated into scoring fields.
 * The dashboard and the simulator build the same ScoringInput from stored
 * records instead, which is why all three produce comparable scores.
 */
export function answersToScoringInput(answers: AnswerMap): ScoringInput {
  const base = emptyScoringInput(
    typeof answers.currency === "string" ? answers.currency : "USD",
  );

  const carriesDebt = answers.has_debt === true;

  return {
    ...base,
    monthlyIncome: amount(answers.primary_income) + amount(answers.other_income),
    monthlyExpenses: amount(answers.monthly_expenses),
    essentialMonthlyExpenses: amount(answers.essential_expenses),
    monthlyDebtPayments: carriesDebt ? amount(answers.monthly_debt_payments) : 0,
    monthlySavings: amount(answers.monthly_savings),
    emergencyFundAmount: amount(answers.emergency_fund),
    totalSavings: amount(answers.total_savings),
    totalDebt: carriesDebt ? amount(answers.total_debt) : 0,
    highInterestDebt: carriesDebt ? amount(answers.high_interest_debt) : 0,
    billPayment: choice<BillPaymentAnswer>(answers.bill_payment, BILL_PAYMENT),
    savingsConsistency: choice<SavingsConsistencyAnswer>(
      answers.savings_consistency,
      CONSISTENCY,
    ),
    goals: choice<GoalsAnswer>(answers.goals, GOALS),
    insuranceApplicable: list(answers.insurance_applicable),
    insuranceCovered: list(answers.insurance_covered),
    longTermPlanning: choice<LongTermPlanningAnswer>(answers.long_term_planning, LONG_TERM),
    reviewHabit: choice<ReviewHabitAnswer>(answers.review_habit, REVIEW),
  };
}

/** One answer, ready to be written to assessment_answers. */
export interface StoredAnswer {
  section: string;
  question_id: string;
  question: string;
  answer: string;
  answer_value: AnswerValue;
}

/**
 * Renders the answers for storage.
 *
 * Both the raw value and a human-readable rendering are kept, so an
 * assessment opened years later can be read back without needing the
 * question definitions that produced it (§77).
 */
export function answersForStorage(answers: AnswerMap): StoredAnswer[] {
  const stored: StoredAnswer[] = [];

  for (const section of ASSESSMENT_SECTIONS) {
    for (const question of visibleQuestions(section, answers)) {
      const value = answers[question.id];
      if (value === null || value === undefined || value === "") continue;

      stored.push({
        section: section.title,
        question_id: question.id,
        question: question.label,
        answer: renderAnswer(question.id, value),
        answer_value: value,
      });
    }
  }

  return stored;
}

/** A stored answer as a person would read it. */
export function renderAnswer(questionId: string, value: AnswerValue): string {
  const question = ASSESSMENT_QUESTION_MAP.get(questionId);

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    const labels = value.map(
      (v) => question?.options?.find((o) => o.value === v)?.label ?? v,
    );
    return labels.join(", ");
  }

  if (question && (question.type === "radio" || question.type === "select")) {
    return question.options?.find((o) => o.value === value)?.label ?? String(value);
  }

  return String(value);
}
