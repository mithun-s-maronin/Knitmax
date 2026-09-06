import { z } from "zod";

/**
 * Validation for every editable financial record.
 *
 * These schemas are the client's rules and the server's rules — the forms use
 * them for inline errors, and the server actions parse with the same objects,
 * so nothing reaches the database that the UI would have rejected. The
 * database's own CHECK constraints are the third line (§50, §61, §86).
 */

const MAX_AMOUNT = 1e12;

/** Accepts what a form field actually produces: a string, or a number. */
const amount = (max = MAX_AMOUNT) =>
  z.coerce
    .number({ error: "Enter an amount." })
    .refine(Number.isFinite, "Enter a valid amount.")
    .min(0, "Cannot be negative.")
    .max(max, "That is larger than we can store.");

const positiveAmount = (max = MAX_AMOUNT) =>
  amount(max).refine((v) => v > 0, "Must be more than zero.");

const name = z
  .string({ error: "Give this a name." })
  .trim()
  .min(1, "Give this a name.")
  .max(120, "Keep the name under 120 characters.");

const notes = z
  .string()
  .trim()
  .max(1000, "Keep notes under 1000 characters.")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .optional()
  .or(z.literal("").transform(() => undefined));

const frequency = z.enum([
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "annually",
  "one_time",
]);

const rate = z.coerce
  .number()
  .min(0, "Cannot be negative.")
  .max(200, "That rate looks wrong.")
  .optional();

export const incomeSourceSchema = z.object({
  name,
  type: z.enum(["primary", "secondary", "passive", "benefits", "other"]),
  amount: amount(),
  frequency,
  is_active: z.coerce.boolean().default(true),
  notes,
});

export const expenseSchema = z.object({
  name,
  category: z.enum([
    "housing",
    "food",
    "transportation",
    "utilities",
    "education",
    "insurance",
    "healthcare",
    "entertainment",
    "shopping",
    "subscriptions",
    "debt_payments",
    "childcare",
    "personal_care",
    "other",
  ]),
  amount: amount(),
  frequency,
  is_essential: z.coerce.boolean().default(true),
  date: optionalDate,
  notes,
});

export const savingsAccountSchema = z.object({
  name,
  type: z.enum([
    "emergency_fund",
    "general_savings",
    "high_yield",
    "fixed_deposit",
    "retirement",
    "investment",
    "education_fund",
    "other",
  ]),
  balance: amount(),
  monthly_contribution: amount(),
  is_emergency_fund: z.coerce.boolean().default(false),
  interest_rate: rate,
  notes,
});

export const debtSchema = z
  .object({
    name,
    type: z.enum([
      "credit_card",
      "personal_loan",
      "student_loan",
      "auto_loan",
      "mortgage",
      "medical_debt",
      "buy_now_pay_later",
      "family_loan",
      "business_loan",
      "other",
    ]),
    balance: amount(),
    original_balance: amount().optional(),
    interest_rate: z.coerce
      .number()
      .min(0, "Cannot be negative.")
      .max(200, "That rate looks wrong."),
    monthly_payment: amount(),
    minimum_payment: amount().optional(),
    start_date: optionalDate,
    target_payoff_date: optionalDate,
    notes,
  })
  .refine(
    (v) =>
      !v.start_date || !v.target_payoff_date || v.target_payoff_date >= v.start_date,
    { message: "The payoff date cannot be before the start date.", path: ["target_payoff_date"] },
  )
  .refine((v) => v.original_balance === undefined || v.original_balance >= v.balance, {
    message: "The original balance cannot be less than what is left.",
    path: ["original_balance"],
  });

export const goalSchema = z
  .object({
    name,
    description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    category: z.enum([
      "emergency_fund",
      "education",
      "phone",
      "car",
      "house",
      "vacation",
      "retirement",
      "wedding",
      "business",
      "debt_payoff",
      "custom",
    ]),
    target_amount: positiveAmount(),
    current_amount: amount(),
    target_date: optionalDate,
    status: z.enum(["active", "paused", "completed", "cancelled"]).default("active"),
    priority: z.coerce.number().int().min(1).max(3).default(2),
  })
  .refine((v) => v.current_amount <= v.target_amount, {
    message: "Saved so far cannot be more than the target.",
    path: ["current_amount"],
  });

export const assetSchema = z.object({
  name,
  type: z.enum([
    "cash",
    "savings",
    "investment",
    "retirement",
    "property",
    "vehicle",
    "business",
    "collectible",
    "other",
  ]),
  value: amount(1e13),
  notes,
});

export const liabilitySchema = z.object({
  name,
  type: z.enum(["credit_card", "loan", "mortgage", "tax_owed", "other"]),
  balance: amount(1e13),
  notes,
});

export const RECORD_SCHEMAS = {
  income_sources: incomeSourceSchema,
  expenses: expenseSchema,
  savings_accounts: savingsAccountSchema,
  debts: debtSchema,
  financial_goals: goalSchema,
  assets: assetSchema,
  liabilities: liabilitySchema,
} as const;

export type RecordTable = keyof typeof RECORD_SCHEMAS;

/** Turns a Zod failure into per-field messages the forms can show inline. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}
