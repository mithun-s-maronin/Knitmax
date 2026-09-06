/** Currencies offered in settings and the assessment. */
export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
  { code: "AED", symbol: "AED", label: "UAE Dirham" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
  { code: "PHP", symbol: "₱", label: "Philippine Peso" },
  { code: "MYR", symbol: "RM", label: "Malaysian Ringgit" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "BRL", symbol: "R$", label: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", label: "Mexican Peso" },
  { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar" },
  { code: "CHF", symbol: "CHF", label: "Swiss Franc" },
  { code: "SEK", symbol: "kr", label: "Swedish Krona" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const COUNTRIES = [
  { code: "US", label: "United States", currency: "USD" },
  { code: "GB", label: "United Kingdom", currency: "GBP" },
  { code: "IN", label: "India", currency: "INR" },
  { code: "CA", label: "Canada", currency: "CAD" },
  { code: "AU", label: "Australia", currency: "AUD" },
  { code: "IE", label: "Ireland", currency: "EUR" },
  { code: "DE", label: "Germany", currency: "EUR" },
  { code: "FR", label: "France", currency: "EUR" },
  { code: "ES", label: "Spain", currency: "EUR" },
  { code: "NL", label: "Netherlands", currency: "EUR" },
  { code: "SG", label: "Singapore", currency: "SGD" },
  { code: "AE", label: "United Arab Emirates", currency: "AED" },
  { code: "ZA", label: "South Africa", currency: "ZAR" },
  { code: "NG", label: "Nigeria", currency: "NGN" },
  { code: "KE", label: "Kenya", currency: "KES" },
  { code: "PH", label: "Philippines", currency: "PHP" },
  { code: "MY", label: "Malaysia", currency: "MYR" },
  { code: "JP", label: "Japan", currency: "JPY" },
  { code: "BR", label: "Brazil", currency: "BRL" },
  { code: "MX", label: "Mexico", currency: "MXN" },
  { code: "NZ", label: "New Zealand", currency: "NZD" },
  { code: "CH", label: "Switzerland", currency: "CHF" },
  { code: "SE", label: "Sweden", currency: "SEK" },
] as const;

export const EXPENSE_CATEGORY_LABELS = {
  housing: "Housing",
  food: "Food & groceries",
  transportation: "Transportation",
  utilities: "Utilities",
  education: "Education",
  insurance: "Insurance",
  healthcare: "Healthcare",
  entertainment: "Entertainment",
  shopping: "Shopping",
  subscriptions: "Subscriptions",
  debt_payments: "Debt repayments",
  childcare: "Childcare",
  personal_care: "Personal care",
  other: "Other",
} as const;

/** Categories treated as essential unless the user says otherwise. */
export const ESSENTIAL_BY_DEFAULT = new Set([
  "housing",
  "food",
  "utilities",
  "transportation",
  "healthcare",
  "insurance",
  "childcare",
  "education",
]);

export const INCOME_TYPE_LABELS = {
  primary: "Primary income",
  secondary: "Secondary income",
  passive: "Passive income",
  benefits: "Benefits or support",
  other: "Other",
} as const;

export const SAVINGS_TYPE_LABELS = {
  emergency_fund: "Emergency fund",
  general_savings: "General savings",
  high_yield: "High-yield savings",
  fixed_deposit: "Fixed deposit",
  retirement: "Retirement account",
  investment: "Investment account",
  education_fund: "Education fund",
  other: "Other",
} as const;

export const DEBT_TYPE_LABELS = {
  credit_card: "Credit card",
  personal_loan: "Personal loan",
  student_loan: "Student loan",
  auto_loan: "Auto loan",
  mortgage: "Mortgage",
  medical_debt: "Medical debt",
  buy_now_pay_later: "Buy now, pay later",
  family_loan: "Family or friend loan",
  business_loan: "Business loan",
  other: "Other",
} as const;

export const GOAL_CATEGORY_LABELS = {
  emergency_fund: "Emergency fund",
  education: "Education",
  phone: "Phone or device",
  car: "Car",
  house: "Home",
  vacation: "Travel",
  retirement: "Retirement",
  wedding: "Wedding",
  business: "Business",
  debt_payoff: "Debt payoff",
  custom: "Custom",
} as const;

export const ASSET_TYPE_LABELS = {
  cash: "Cash",
  savings: "Savings",
  investment: "Investments",
  retirement: "Retirement",
  property: "Property",
  vehicle: "Vehicle",
  business: "Business",
  collectible: "Collectibles",
  other: "Other",
} as const;

export const LIABILITY_TYPE_LABELS = {
  credit_card: "Credit card",
  loan: "Loan",
  mortgage: "Mortgage",
  tax_owed: "Tax owed",
  other: "Other",
} as const;

export const FREQUENCY_LABELS = {
  weekly: "Weekly",
  fortnightly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Yearly",
  one_time: "One-off",
} as const;

/** How many times a year each frequency occurs, for monthly normalisation. */
export const FREQUENCY_PER_YEAR = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  annually: 1,
  one_time: 0,
} as const;

export const EMPLOYMENT_STATUS_LABELS = {
  employed_full_time: "Employed full time",
  employed_part_time: "Employed part time",
  self_employed: "Self-employed",
  business_owner: "Business owner",
  student: "Student",
  retired: "Retired",
  unemployed: "Not currently working",
  other: "Other",
} as const;

export const AGE_RANGE_LABELS = {
  under_18: "Under 18",
  "18_24": "18 to 24",
  "25_34": "25 to 34",
  "35_44": "35 to 44",
  "45_54": "45 to 54",
  "55_64": "55 to 64",
  "65_plus": "65 or over",
} as const;
