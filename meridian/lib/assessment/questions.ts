import { AGE_RANGE_LABELS, CURRENCIES, EMPLOYMENT_STATUS_LABELS } from "@/lib/constants";
import { ASSESSMENT_VERSION, INSURANCE_LABELS, INSURANCE_TYPES } from "@/lib/scoring";

export type AnswerValue = string | number | boolean | string[] | null;
export type AnswerMap = Record<string, AnswerValue>;

export type QuestionType =
  | "currency"
  | "number"
  | "select"
  | "radio"
  | "multiselect"
  | "boolean";

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  /** Sub-label shown under the question. */
  help?: string;
  placeholder?: string;
  required: boolean;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  /** Shown only when this returns true, so irrelevant questions never appear. */
  visibleWhen?: (answers: AnswerMap) => boolean;
  /** Cross-field validation. Returns an error message, or null when valid. */
  validate?: (value: AnswerValue, answers: AnswerMap) => string | null;
  /** Contextual education (§66). */
  learnMore?: { title: string; body: string };
  /** Which pillar this question feeds, for the transparency panel. */
  pillar?: "spend" | "save" | "borrow" | "plan" | "profile";
}

export interface AssessmentSection {
  id: string;
  title: string;
  description: string;
  /** A lucide icon name, resolved in the UI. */
  icon: string;
  questions: Question[];
}

const num = (value: AnswerValue): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const hasDebt = (answers: AnswerMap) => answers.has_debt === true;

export const ASSESSMENT_SECTIONS: AssessmentSection[] = [
  {
    id: "about_you",
    title: "About you",
    description:
      "A few details so the numbers are read in the right context. Nothing here is scored.",
    icon: "UserRound",
    questions: [
      {
        id: "currency",
        type: "select",
        label: "Which currency do you use?",
        required: true,
        pillar: "profile",
        options: CURRENCIES.map((c) => ({
          value: c.code,
          label: `${c.label} (${c.symbol})`,
        })),
        help: "Every amount you enter will be read in this currency.",
      },
      {
        id: "age_range",
        type: "select",
        label: "What is your age range?",
        required: false,
        pillar: "profile",
        options: Object.entries(AGE_RANGE_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
      },
      {
        id: "employment_status",
        type: "select",
        label: "What best describes your work situation?",
        required: false,
        pillar: "profile",
        options: Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
      },
      {
        id: "dependents",
        type: "number",
        label: "How many people depend on your income?",
        help: "Include children and anyone else you financially support. Not counting yourself.",
        required: false,
        min: 0,
        max: 30,
        pillar: "profile",
      },
    ],
  },
  {
    id: "income",
    title: "Income",
    description: "What comes in each month, after tax.",
    icon: "Wallet",
    questions: [
      {
        id: "primary_income",
        type: "currency",
        label: "What is your main monthly income, after tax?",
        help: "Salary, wages or drawings — whatever lands in your account each month.",
        required: true,
        min: 0,
        pillar: "spend",
        learnMore: {
          title: "Why after tax?",
          body: "Every ratio in your score compares money you can actually spend against what you spend it on. Using gross income would make your position look better than it is.",
        },
      },
      {
        id: "other_income",
        type: "currency",
        label: "Any other monthly income?",
        help: "Side work, rental income, investments, benefits. Leave at zero if there is none.",
        required: false,
        min: 0,
        pillar: "spend",
      },
    ],
  },
  {
    id: "spending",
    title: "Spending",
    description: "What goes out each month on living costs.",
    icon: "Receipt",
    questions: [
      {
        id: "monthly_expenses",
        type: "currency",
        label: "What do you spend in a typical month?",
        help: "Everything except debt repayments — those come next. Rent or mortgage, food, transport, utilities, subscriptions, the lot.",
        required: true,
        min: 0,
        pillar: "spend",
        learnMore: {
          title: "Why exclude debt repayments?",
          body: "Repayments are counted separately so they are not subtracted twice when we work out what you have left over. Enter them in the Debt section instead.",
        },
      },
      {
        id: "essential_expenses",
        type: "currency",
        label: "How much of that is essential?",
        help: "Housing, food, utilities, transport to work, healthcare, insurance, childcare — the costs that would still be there next month.",
        required: true,
        min: 0,
        pillar: "save",
        validate: (value, answers) =>
          num(value) > num(answers.monthly_expenses)
            ? "Essential costs cannot be more than your total spending."
            : null,
        learnMore: {
          title: "Why this matters",
          body: "Your emergency fund is measured in months of essential costs, not total spending. In a real emergency you would cut the discretionary part, so measuring against it would overstate how long your savings would last.",
        },
      },
      {
        id: "bill_payment",
        type: "radio",
        label: "Are you usually able to pay all of your monthly bills on time?",
        required: true,
        pillar: "spend",
        options: [
          { value: "always", label: "Always" },
          { value: "usually", label: "Usually" },
          { value: "sometimes", label: "Sometimes" },
          { value: "rarely", label: "Rarely" },
          { value: "never", label: "Never" },
        ],
      },
    ],
  },
  {
    id: "saving",
    title: "Saving",
    description: "What you have set aside, and what you add to it.",
    icon: "PiggyBank",
    questions: [
      {
        id: "total_savings",
        type: "currency",
        label: "How much do you have in savings altogether?",
        help: "Cash savings and easily accessible accounts. Do not include property or long-term investments you could not reach quickly.",
        required: true,
        min: 0,
        pillar: "save",
      },
      {
        id: "emergency_fund",
        type: "currency",
        label: "How much of that is your emergency fund?",
        help: "Money you keep specifically for the unexpected, and do not spend on anything else.",
        required: true,
        min: 0,
        pillar: "save",
        validate: (value, answers) =>
          num(value) > num(answers.total_savings)
            ? "Your emergency fund cannot be larger than your total savings."
            : null,
        learnMore: {
          title: "What counts as an emergency fund?",
          body: "Money you could reach within a day or two, earmarked for job loss, a medical bill or an urgent repair. A holiday fund does not count — the point is that it is still there when something goes wrong.",
        },
      },
      {
        id: "monthly_savings",
        type: "currency",
        label: "How much do you save in a typical month?",
        help: "Everything you put aside, including workplace pension contributions you make yourself.",
        required: true,
        min: 0,
        pillar: "save",
        learnMore: {
          title: "What is a savings rate?",
          body: "The share of your income you save each month. Twenty percent scores full marks here; ten percent is a solid start. It is the number that decides how quickly every goal arrives.",
        },
      },
      {
        id: "savings_consistency",
        type: "radio",
        label: "How consistently do you save money?",
        required: true,
        pillar: "save",
        options: [
          { value: "every_month", label: "Every month" },
          { value: "most_months", label: "Most months" },
          { value: "occasionally", label: "Occasionally" },
          { value: "rarely", label: "Rarely" },
          { value: "never", label: "Never" },
        ],
      },
    ],
  },
  {
    id: "debt",
    title: "Debt",
    description: "What you owe, and what it costs you each month.",
    icon: "CreditCard",
    questions: [
      {
        id: "has_debt",
        type: "boolean",
        label: "Do you currently have any debt?",
        help: "Credit cards, loans, a mortgage, buy-now-pay-later, money owed to family.",
        required: true,
        pillar: "borrow",
        learnMore: {
          title: "Having no debt is not penalised",
          body: "If you answer no, the Borrow pillar scores 100 outright. Carrying no debt is the best possible position, and the score reflects that.",
        },
      },
      {
        id: "total_debt",
        type: "currency",
        label: "What do you owe in total?",
        help: "Add up every outstanding balance.",
        required: true,
        min: 0,
        pillar: "borrow",
        visibleWhen: hasDebt,
      },
      {
        id: "monthly_debt_payments",
        type: "currency",
        label: "What do you pay towards debt each month?",
        help: "All repayments added together, including the minimum payments on cards.",
        required: true,
        min: 0,
        pillar: "borrow",
        visibleWhen: hasDebt,
        learnMore: {
          title: "What is debt-to-income?",
          body: "Two things are measured. Your total debt against a year of income shows the size of the load; your monthly repayments against monthly income show how much it squeezes you right now. Repayments under ten percent of income score full marks.",
        },
      },
      {
        id: "high_interest_debt",
        type: "currency",
        label: "How much of that is at 12% APR or higher?",
        help: "Credit cards and short-term loans usually are. If you are not sure, an estimate is fine.",
        required: false,
        min: 0,
        pillar: "borrow",
        visibleWhen: hasDebt,
        validate: (value, answers) =>
          num(value) > num(answers.total_debt)
            ? "This cannot be more than your total debt."
            : null,
        learnMore: {
          title: "Why 12%?",
          body: "Above roughly 12% APR, interest compounds faster than almost any saving or investment can earn. Debt above that line is worth clearing before saving beyond a starter buffer.",
        },
      },
    ],
  },
  {
    id: "planning",
    title: "Planning",
    description: "How prepared you are for what comes next.",
    icon: "CalendarCheck",
    questions: [
      {
        id: "goals",
        type: "radio",
        label: "Do you have clear financial goals?",
        required: true,
        pillar: "plan",
        options: [
          {
            value: "clear_and_tracking",
            label: "Yes, and I track my progress",
            description: "Specific amounts and dates, and I know where I am against them.",
          },
          {
            value: "clear",
            label: "Yes, they are clear",
            description: "I know what I am aiming at, but I do not track progress.",
          },
          {
            value: "general",
            label: "Only in general terms",
            description: "I know roughly what I want, without amounts or dates.",
          },
          { value: "none", label: "No clear goals" },
        ],
      },
      {
        id: "insurance_applicable",
        type: "multiselect",
        label: "Which kinds of insurance are relevant to your situation?",
        help: "Only pick the ones that apply to you. You are not marked down for cover you do not need — if you have no car, vehicle insurance is not counted.",
        required: false,
        pillar: "plan",
        options: INSURANCE_TYPES.map((value) => ({
          value,
          label: INSURANCE_LABELS[value],
        })),
      },
      {
        id: "insurance_covered",
        type: "multiselect",
        label: "And which of those do you actually have?",
        required: false,
        pillar: "plan",
        options: INSURANCE_TYPES.map((value) => ({
          value,
          label: INSURANCE_LABELS[value],
        })),
        visibleWhen: (answers) =>
          Array.isArray(answers.insurance_applicable) &&
          answers.insurance_applicable.length > 0,
      },
      {
        id: "long_term_planning",
        type: "radio",
        label: "Do you actively plan for your long-term financial future?",
        help: "Retirement, buying a home, your children's education — anything more than a few years out.",
        required: true,
        pillar: "plan",
        options: [
          { value: "detailed_plan", label: "Yes, I have a detailed plan" },
          { value: "basic_plan", label: "Yes, a basic plan" },
          { value: "thinking_about_it", label: "I am thinking about it" },
          { value: "no_plan", label: "No" },
        ],
      },
      {
        id: "review_habit",
        type: "radio",
        label: "How often do you review your finances?",
        required: true,
        pillar: "plan",
        options: [
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
          { value: "every_few_months", label: "Every few months" },
          { value: "rarely", label: "Rarely" },
          { value: "never", label: "Never" },
        ],
      },
    ],
  },
];

export const ASSESSMENT_QUESTIONS: Question[] = ASSESSMENT_SECTIONS.flatMap(
  (s) => s.questions,
);

export const ASSESSMENT_QUESTION_MAP = new Map(
  ASSESSMENT_QUESTIONS.map((q) => [q.id, q]),
);

export { ASSESSMENT_VERSION };

/** The questions visible for a given set of answers. */
export function visibleQuestions(
  section: AssessmentSection,
  answers: AnswerMap,
): Question[] {
  return section.questions.filter((q) => !q.visibleWhen || q.visibleWhen(answers));
}

/** Validation errors for one section, keyed by question id. */
export function validateSection(
  section: AssessmentSection,
  answers: AnswerMap,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const question of visibleQuestions(section, answers)) {
    const value = answers[question.id];

    const isEmpty =
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (question.required && isEmpty) {
      errors[question.id] = "This one is needed to calculate your score.";
      continue;
    }

    if (!isEmpty && (question.type === "currency" || question.type === "number")) {
      if (typeof value === "string" && Number.isNaN(Number(value))) {
        errors[question.id] = "Enter a number.";
        continue;
      }
      const parsed = num(value);
      if (question.min !== undefined && parsed < question.min) {
        errors[question.id] = `Cannot be less than ${question.min}.`;
        continue;
      }
      if (question.max !== undefined && parsed > question.max) {
        errors[question.id] = `Cannot be more than ${question.max}.`;
        continue;
      }
    }

    const custom = question.validate?.(value, answers);
    if (custom) errors[question.id] = custom;
  }

  return errors;
}

/** How complete the assessment is, 0-1, counting only visible questions. */
export function assessmentProgress(answers: AnswerMap): number {
  const visible = ASSESSMENT_SECTIONS.flatMap((s) => visibleQuestions(s, answers));
  const required = visible.filter((q) => q.required);
  if (required.length === 0) return 0;
  const answered = required.filter((q) => {
    const v = answers[q.id];
    return !(
      v === null ||
      v === undefined ||
      v === "" ||
      (Array.isArray(v) && v.length === 0)
    );
  });
  return answered.length / required.length;
}
