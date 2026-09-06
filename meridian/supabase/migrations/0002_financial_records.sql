-- ============================================================================
-- Meridian — 0002 financial records
--
-- The editable ledger: income, expenses, savings, debts, goals, assets and
-- liabilities. Every amount is numeric (never float) so totals are exact, and
-- every table carries a user_id that RLS keys off in 0005.
-- ============================================================================

do $$ begin
  create type meridian_income_type as enum (
    'primary', 'secondary', 'passive', 'benefits', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_expense_category as enum (
    'housing', 'food', 'transportation', 'utilities', 'education', 'insurance',
    'healthcare', 'entertainment', 'shopping', 'subscriptions', 'debt_payments',
    'childcare', 'personal_care', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_savings_type as enum (
    'emergency_fund', 'general_savings', 'high_yield', 'fixed_deposit',
    'retirement', 'investment', 'education_fund', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_debt_type as enum (
    'credit_card', 'personal_loan', 'student_loan', 'auto_loan', 'mortgage',
    'medical_debt', 'buy_now_pay_later', 'family_loan', 'business_loan', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_goal_category as enum (
    'emergency_fund', 'education', 'phone', 'car', 'house', 'vacation',
    'retirement', 'wedding', 'business', 'debt_payoff', 'custom'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_goal_status as enum (
    'active', 'paused', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_asset_type as enum (
    'cash', 'savings', 'investment', 'retirement', 'property', 'vehicle',
    'business', 'collectible', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_liability_type as enum (
    'credit_card', 'loan', 'mortgage', 'tax_owed', 'other'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- income_sources
-- ---------------------------------------------------------------------------

create table if not exists public.income_sources (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  type       meridian_income_type not null default 'primary',
  amount     numeric(14, 2) not null,
  frequency  meridian_frequency not null default 'monthly',
  is_active  boolean not null default true,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint income_sources_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint income_sources_amount_range check (amount >= 0 and amount <= 1e12),
  constraint income_sources_notes_length check (notes is null or char_length(notes) <= 1000)
);

create index if not exists income_sources_user_idx on public.income_sources (user_id, is_active);

drop trigger if exists income_sources_set_updated_at on public.income_sources;
create trigger income_sources_set_updated_at
  before update on public.income_sources
  for each row execute function public.meridian_set_updated_at();

-- ---------------------------------------------------------------------------
-- expenses
--
-- is_essential drives both the essential-vs-discretionary analytics and the
-- denominator of the emergency-fund calculation.
-- ---------------------------------------------------------------------------

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  category     meridian_expense_category not null default 'other',
  name         text not null,
  amount       numeric(14, 2) not null,
  frequency    meridian_frequency not null default 'monthly',
  is_essential boolean not null default true,
  date         date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint expenses_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint expenses_amount_range check (amount >= 0 and amount <= 1e12),
  constraint expenses_notes_length check (notes is null or char_length(notes) <= 1000)
);

create index if not exists expenses_user_idx on public.expenses (user_id, category);
create index if not exists expenses_user_date_idx on public.expenses (user_id, date desc nulls last);

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.meridian_set_updated_at();

-- ---------------------------------------------------------------------------
-- savings_accounts
-- ---------------------------------------------------------------------------

create table if not exists public.savings_accounts (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  name                 text not null,
  type                 meridian_savings_type not null default 'general_savings',
  balance              numeric(14, 2) not null default 0,
  monthly_contribution numeric(14, 2) not null default 0,
  is_emergency_fund    boolean not null default false,
  interest_rate        numeric(6, 3),
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint savings_accounts_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint savings_accounts_balance_range check (balance >= 0 and balance <= 1e12),
  constraint savings_accounts_contribution_range check (monthly_contribution >= 0 and monthly_contribution <= 1e12),
  constraint savings_accounts_rate_range check (interest_rate is null or (interest_rate >= 0 and interest_rate <= 100))
);

create index if not exists savings_accounts_user_idx on public.savings_accounts (user_id);

drop trigger if exists savings_accounts_set_updated_at on public.savings_accounts;
create trigger savings_accounts_set_updated_at
  before update on public.savings_accounts
  for each row execute function public.meridian_set_updated_at();

-- ---------------------------------------------------------------------------
-- debts
-- ---------------------------------------------------------------------------

create table if not exists public.debts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null,
  type               meridian_debt_type not null default 'other',
  balance            numeric(14, 2) not null default 0,
  original_balance   numeric(14, 2),
  interest_rate      numeric(6, 3) not null default 0,
  monthly_payment    numeric(14, 2) not null default 0,
  minimum_payment    numeric(14, 2),
  start_date         date,
  target_payoff_date date,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint debts_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint debts_balance_range check (balance >= 0 and balance <= 1e12),
  constraint debts_original_balance_range check (original_balance is null or (original_balance >= 0 and original_balance <= 1e12)),
  constraint debts_rate_range check (interest_rate >= 0 and interest_rate <= 200),
  constraint debts_payment_range check (monthly_payment >= 0 and monthly_payment <= 1e12),
  constraint debts_minimum_payment_range check (minimum_payment is null or (minimum_payment >= 0 and minimum_payment <= 1e12)),
  constraint debts_payoff_after_start check (
    start_date is null or target_payoff_date is null or target_payoff_date >= start_date
  )
);

create index if not exists debts_user_idx on public.debts (user_id);
create index if not exists debts_user_rate_idx on public.debts (user_id, interest_rate desc);

drop trigger if exists debts_set_updated_at on public.debts;
create trigger debts_set_updated_at
  before update on public.debts
  for each row execute function public.meridian_set_updated_at();

-- ---------------------------------------------------------------------------
-- financial_goals
-- ---------------------------------------------------------------------------

create table if not exists public.financial_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  description    text,
  category       meridian_goal_category not null default 'custom',
  target_amount  numeric(14, 2) not null,
  current_amount numeric(14, 2) not null default 0,
  target_date    date,
  status         meridian_goal_status not null default 'active',
  priority       smallint not null default 2,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint financial_goals_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint financial_goals_description_length check (description is null or char_length(description) <= 2000),
  constraint financial_goals_target_range check (target_amount > 0 and target_amount <= 1e12),
  constraint financial_goals_current_range check (current_amount >= 0 and current_amount <= 1e12),
  constraint financial_goals_priority_range check (priority between 1 and 3)
);

create index if not exists financial_goals_user_idx on public.financial_goals (user_id, status);

drop trigger if exists financial_goals_set_updated_at on public.financial_goals;
create trigger financial_goals_set_updated_at
  before update on public.financial_goals
  for each row execute function public.meridian_set_updated_at();

-- ---------------------------------------------------------------------------
-- assets / liabilities (net worth)
--
-- Liabilities here are the ones NOT already tracked as debts; the net worth
-- calculation sums both tables so nothing is double counted.
-- ---------------------------------------------------------------------------

create table if not exists public.assets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  type       meridian_asset_type not null default 'other',
  value      numeric(14, 2) not null default 0,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint assets_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint assets_value_range check (value >= 0 and value <= 1e13)
);

create index if not exists assets_user_idx on public.assets (user_id);

drop trigger if exists assets_set_updated_at on public.assets;
create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.meridian_set_updated_at();

create table if not exists public.liabilities (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  type       meridian_liability_type not null default 'other',
  balance    numeric(14, 2) not null default 0,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint liabilities_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint liabilities_balance_range check (balance >= 0 and balance <= 1e13)
);

create index if not exists liabilities_user_idx on public.liabilities (user_id);

drop trigger if exists liabilities_set_updated_at on public.liabilities;
create trigger liabilities_set_updated_at
  before update on public.liabilities
  for each row execute function public.meridian_set_updated_at();

-- ---------------------------------------------------------------------------
-- net_worth_snapshots — an append-only series for the growth chart
-- ---------------------------------------------------------------------------

create table if not exists public.net_worth_snapshots (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  total_assets      numeric(14, 2) not null,
  total_liabilities numeric(14, 2) not null,
  net_worth         numeric(14, 2) not null,
  recorded_at       timestamptz not null default now(),

  constraint net_worth_snapshots_totals_nonneg check (total_assets >= 0 and total_liabilities >= 0)
);

create index if not exists net_worth_snapshots_user_idx
  on public.net_worth_snapshots (user_id, recorded_at desc);
