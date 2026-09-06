import { emptyScoringInput, type ScoringInput } from "@/lib/scoring";

/** A scoring input with sensible defaults, overridden field by field. */
export function input(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return { ...emptyScoringInput("USD"), ...overrides };
}

/** A profile that answers every question well, for isolating one pillar. */
export function excellentAnswers(): Partial<ScoringInput> {
  return {
    billPayment: "always",
    savingsConsistency: "every_month",
    goals: "clear_and_tracking",
    insuranceApplicable: ["health", "life", "vehicle", "property"],
    insuranceCovered: ["health", "life", "vehicle", "property"],
    longTermPlanning: "detailed_plan",
    reviewHabit: "weekly",
  };
}

/** A profile that answers every question poorly. */
export function poorAnswers(): Partial<ScoringInput> {
  return {
    billPayment: "never",
    savingsConsistency: "never",
    goals: "none",
    insuranceApplicable: ["health", "life", "vehicle", "property"],
    insuranceCovered: [],
    longTermPlanning: "no_plan",
    reviewHabit: "never",
  };
}
