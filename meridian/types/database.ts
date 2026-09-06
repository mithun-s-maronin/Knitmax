/**
 * The database shape, kept in step with supabase/migrations by hand.
 *
 * Insert and Update are derived from Row rather than written out three times,
 * so a column added to a table is impossible to forget in two of the three
 * places. `TableDef<Row, Defaulted>` marks the columns the database fills in.
 */

type TableDef<TRow, TDefaulted extends keyof TRow> = {
  Row: TRow;
  Insert: Omit<TRow, TDefaulted> & Partial<Pick<TRow, TDefaulted>>;
  Update: Partial<TRow>;
  Relationships: [];
};

/** id + created_at + updated_at are always supplied by the database. */
type Managed = "id" | "created_at" | "updated_at";

export type Frequency =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly"
  | "annually"
  | "one_time";

export type EmploymentStatus =
  | "employed_full_time"
  | "employed_part_time"
  | "self_employed"
  | "business_owner"
  | "student"
  | "retired"
  | "unemployed"
  | "other";

export type AgeRange =
  | "under_18"
  | "18_24"
  | "25_34"
  | "35_44"
  | "45_54"
  | "55_64"
  | "65_plus";

export type ThemePreference = "light" | "dark" | "system";

export type IncomeType = "primary" | "secondary" | "passive" | "benefits" | "other";

export type ExpenseCategory =
  | "housing"
  | "food"
  | "transportation"
  | "utilities"
  | "education"
  | "insurance"
  | "healthcare"
  | "entertainment"
  | "shopping"
  | "subscriptions"
  | "debt_payments"
  | "childcare"
  | "personal_care"
  | "other";

export type SavingsType =
  | "emergency_fund"
  | "general_savings"
  | "high_yield"
  | "fixed_deposit"
  | "retirement"
  | "investment"
  | "education_fund"
  | "other";

export type DebtType =
  | "credit_card"
  | "personal_loan"
  | "student_loan"
  | "auto_loan"
  | "mortgage"
  | "medical_debt"
  | "buy_now_pay_later"
  | "family_loan"
  | "business_loan"
  | "other";

export type GoalCategory =
  | "emergency_fund"
  | "education"
  | "phone"
  | "car"
  | "house"
  | "vacation"
  | "retirement"
  | "wedding"
  | "business"
  | "debt_payoff"
  | "custom";

export type GoalStatus = "active" | "paused" | "completed" | "cancelled";

export type AssetType =
  | "cash"
  | "savings"
  | "investment"
  | "retirement"
  | "property"
  | "vehicle"
  | "business"
  | "collectible"
  | "other";

export type LiabilityType = "credit_card" | "loan" | "mortgage" | "tax_owed" | "other";

export type AssessmentSource =
  | "assessment"
  | "check_in"
  | "recalculation"
  | "simulation_applied";

export type PillarKey = "spend" | "save" | "borrow" | "plan";
export type PillarOrOverall = PillarKey | "overall";
export type Priority = "high" | "medium" | "low";
export type ActionHorizon = "immediate" | "short_term" | "long_term";
export type ActionStatus = "pending" | "completed" | "dismissed";
export type MessageRole = "user" | "assistant";

export type NotificationType =
  | "alert"
  | "opportunity"
  | "score_change"
  | "goal_milestone"
  | "milestone"
  | "checkin_reminder"
  | "action_completed"
  | "system";

export type Severity = "critical" | "warning" | "info" | "success";

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  country: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export type FinancialProfileRow = {
  id: string;
  user_id: string;
  employment_status: EmploymentStatus | null;
  income_frequency: Frequency;
  age_range: AgeRange | null;
  dependents: number;
  created_at: string;
  updated_at: string;
}

export type UserSettingsRow = {
  user_id: string;
  theme: ThemePreference;
  ai_data_permission: boolean;
  ai_conversation_memory: boolean;
  notifications_enabled: boolean;
  score_change_alerts: boolean;
  goal_milestone_alerts: boolean;
  monthly_checkin_reminder: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type IncomeSourceRow = {
  id: string;
  user_id: string;
  name: string;
  type: IncomeType;
  amount: number;
  frequency: Frequency;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ExpenseRow = {
  id: string;
  user_id: string;
  category: ExpenseCategory;
  name: string;
  amount: number;
  frequency: Frequency;
  is_essential: boolean;
  date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SavingsAccountRow = {
  id: string;
  user_id: string;
  name: string;
  type: SavingsType;
  balance: number;
  monthly_contribution: number;
  is_emergency_fund: boolean;
  interest_rate: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  type: DebtType;
  balance: number;
  original_balance: number | null;
  interest_rate: number;
  monthly_payment: number;
  minimum_payment: number | null;
  start_date: string | null;
  target_payoff_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FinancialGoalRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: GoalCategory;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: GoalStatus;
  priority: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AssetRow = {
  id: string;
  user_id: string;
  name: string;
  type: AssetType;
  value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type LiabilityRow = {
  id: string;
  user_id: string;
  name: string;
  type: LiabilityType;
  balance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NetWorthSnapshotRow = {
  id: string;
  user_id: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  recorded_at: string;
}

export type AssessmentRow = {
  id: string;
  user_id: string;
  completed_at: string;
  assessment_version: string;
  scoring_version: string;
  source: AssessmentSource;
  currency: string;
  overall_score: number;
  spend_score: number | null;
  save_score: number | null;
  borrow_score: number | null;
  plan_score: number | null;
  breakdown: Json;
  input_snapshot: Json;
  created_at: string;
}

export type AssessmentAnswerRow = {
  id: string;
  assessment_id: string;
  user_id: string;
  section: string | null;
  question_id: string;
  question: string;
  answer: string;
  answer_value: Json | null;
  created_at: string;
}

export type ScoreHistoryRow = {
  id: string;
  user_id: string;
  assessment_id: string;
  overall_score: number;
  spend_score: number | null;
  save_score: number | null;
  borrow_score: number | null;
  plan_score: number | null;
  recorded_at: string;
}

export type AssessmentDraftRow = {
  user_id: string;
  assessment_version: string;
  answers: Json;
  current_step: number;
  client_revision: number;
  created_at: string;
  updated_at: string;
}

export type ActionPlanRow = {
  id: string;
  user_id: string;
  assessment_id: string | null;
  recommendation_key: string | null;
  title: string;
  description: string;
  rationale: string | null;
  priority: Priority;
  category: PillarOrOverall;
  horizon: ActionHorizon;
  status: ActionStatus;
  impact_points: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type AiConversationRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export type AiMessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  used_financial_context: boolean;
  created_at: string;
}

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  severity: Severity;
  title: string;
  message: string;
  href: string | null;
  dedupe_key: string | null;
  read_at: string | null;
  created_at: string;
}

export type MilestoneRow = {
  id: string;
  user_id: string;
  key: string;
  title: string;
  description: string;
  achieved_at: string;
}

export type CheckInRow = {
  id: string;
  user_id: string;
  period: string;
  changes: Json;
  notes: string | null;
  assessment_id: string | null;
  created_at: string;
}

export type SimulationRow = {
  id: string;
  user_id: string;
  name: string;
  adjustments: Json;
  baseline_scores: Json;
  projected_scores: Json;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, "created_at" | "updated_at" | "country" | "currency">;
      financial_profiles: TableDef<FinancialProfileRow, Managed | "income_frequency" | "dependents">;
      user_settings: TableDef<
        UserSettingsRow,
        | "created_at"
        | "updated_at"
        | "theme"
        | "ai_data_permission"
        | "ai_conversation_memory"
        | "notifications_enabled"
        | "score_change_alerts"
        | "goal_milestone_alerts"
        | "monthly_checkin_reminder"
        | "onboarding_completed_at"
      >;
      income_sources: TableDef<IncomeSourceRow, Managed | "type" | "frequency" | "is_active" | "notes">;
      expenses: TableDef<
        ExpenseRow,
        Managed | "category" | "frequency" | "is_essential" | "date" | "notes"
      >;
      savings_accounts: TableDef<
        SavingsAccountRow,
        | Managed
        | "type"
        | "balance"
        | "monthly_contribution"
        | "is_emergency_fund"
        | "interest_rate"
        | "notes"
      >;
      debts: TableDef<
        DebtRow,
        | Managed
        | "type"
        | "balance"
        | "original_balance"
        | "interest_rate"
        | "monthly_payment"
        | "minimum_payment"
        | "start_date"
        | "target_payoff_date"
        | "notes"
      >;
      financial_goals: TableDef<
        FinancialGoalRow,
        | Managed
        | "description"
        | "category"
        | "current_amount"
        | "target_date"
        | "status"
        | "priority"
        | "completed_at"
      >;
      assets: TableDef<AssetRow, Managed | "type" | "value" | "notes">;
      liabilities: TableDef<LiabilityRow, Managed | "type" | "balance" | "notes">;
      net_worth_snapshots: TableDef<NetWorthSnapshotRow, "id" | "recorded_at">;
      assessments: TableDef<
        AssessmentRow,
        | "id"
        | "created_at"
        | "completed_at"
        | "source"
        | "currency"
        | "breakdown"
        | "input_snapshot"
        | "spend_score"
        | "save_score"
        | "borrow_score"
        | "plan_score"
      >;
      assessment_answers: TableDef<
        AssessmentAnswerRow,
        "id" | "created_at" | "section" | "answer_value"
      >;
      score_history: TableDef<
        ScoreHistoryRow,
        "id" | "recorded_at" | "spend_score" | "save_score" | "borrow_score" | "plan_score"
      >;
      assessment_drafts: TableDef<
        AssessmentDraftRow,
        "created_at" | "updated_at" | "answers" | "current_step" | "client_revision"
      >;
      action_plans: TableDef<
        ActionPlanRow,
        | Managed
        | "assessment_id"
        | "recommendation_key"
        | "description"
        | "rationale"
        | "priority"
        | "category"
        | "horizon"
        | "status"
        | "impact_points"
        | "completed_at"
      >;
      ai_conversations: TableDef<AiConversationRow, Managed | "title">;
      ai_messages: TableDef<AiMessageRow, "id" | "created_at" | "used_financial_context">;
      notifications: TableDef<
        NotificationRow,
        "id" | "created_at" | "type" | "severity" | "message" | "href" | "dedupe_key" | "read_at"
      >;
      milestones: TableDef<MilestoneRow, "id" | "achieved_at" | "description">;
      check_ins: TableDef<CheckInRow, "id" | "created_at" | "changes" | "notes" | "assessment_id">;
      simulations: TableDef<
        SimulationRow,
        Managed | "name" | "adjustments" | "baseline_scores" | "projected_scores" | "applied_at"
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      /** Deletes the calling user and everything that cascades from them. */
      meridian_delete_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      meridian_frequency: Frequency;
      meridian_employment_status: EmploymentStatus;
      meridian_age_range: AgeRange;
      meridian_theme: ThemePreference;
      meridian_income_type: IncomeType;
      meridian_expense_category: ExpenseCategory;
      meridian_savings_type: SavingsType;
      meridian_debt_type: DebtType;
      meridian_goal_category: GoalCategory;
      meridian_goal_status: GoalStatus;
      meridian_asset_type: AssetType;
      meridian_liability_type: LiabilityType;
      meridian_assessment_source: AssessmentSource;
      meridian_pillar: PillarOrOverall;
      meridian_priority: Priority;
      meridian_action_horizon: ActionHorizon;
      meridian_action_status: ActionStatus;
      meridian_message_role: MessageRole;
      meridian_notification_type: NotificationType;
      meridian_severity: Severity;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
