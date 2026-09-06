-- ============================================================================
-- Meridian — 0003 assessments
--
-- Completed assessments are historical records, not mutable rows. They store
-- the answers, the derived scoring input, every component score, and the
-- scoring version that produced them, so a score from a year ago can still be
-- explained exactly as it was calculated (§12, §76, §77).
--
-- Immutability is enforced twice over: RLS grants only SELECT and INSERT
-- (0005), and the trigger below refuses UPDATE for every role including the
-- service role. DELETE is left to cascade from auth.users so that a full
-- account deletion still works.
-- ============================================================================

do $$ begin
  create type meridian_assessment_source as enum (
    'assessment', 'check_in', 'recalculation', 'simulation_applied'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------------

create table if not exists public.assessments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  completed_at       timestamptz not null default now(),
  assessment_version text not null,
  scoring_version    text not null,
  source             meridian_assessment_source not null default 'assessment',
  currency           text not null default 'USD',

  overall_score      integer not null,
  spend_score        integer,
  save_score         integer,
  borrow_score       integer,
  plan_score         integer,

  -- Full audit trail: every component score, metric and insufficient-data flag
  -- exactly as the engine emitted it, plus the input it was given.
  breakdown          jsonb not null default '{}'::jsonb,
  input_snapshot     jsonb not null default '{}'::jsonb,

  created_at         timestamptz not null default now(),

  constraint assessments_overall_range check (overall_score between 0 and 100),
  constraint assessments_spend_range check (spend_score is null or spend_score between 0 and 100),
  constraint assessments_save_range check (save_score is null or save_score between 0 and 100),
  constraint assessments_borrow_range check (borrow_score is null or borrow_score between 0 and 100),
  constraint assessments_plan_range check (plan_score is null or plan_score between 0 and 100),
  constraint assessments_version_format check (assessment_version ~ '^v[0-9]+\.[0-9]+$'),
  constraint assessments_scoring_version_format check (scoring_version ~ '^v[0-9]+\.[0-9]+$'),
  constraint assessments_currency_format check (currency ~ '^[A-Z]{3}$')
);

create index if not exists assessments_user_completed_idx
  on public.assessments (user_id, completed_at desc);

-- ---------------------------------------------------------------------------
-- assessment_answers
-- ---------------------------------------------------------------------------

create table if not exists public.assessment_answers (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  section       text,
  question_id   text not null,
  question      text not null,
  answer        text not null,
  answer_value  jsonb,
  created_at    timestamptz not null default now(),

  constraint assessment_answers_question_id_length check (char_length(question_id) between 1 and 80),
  constraint assessment_answers_question_length check (char_length(question) between 1 and 500),
  constraint assessment_answers_answer_length check (char_length(answer) <= 2000),
  constraint assessment_answers_unique_per_assessment unique (assessment_id, question_id)
);

create index if not exists assessment_answers_assessment_idx
  on public.assessment_answers (assessment_id);

-- ---------------------------------------------------------------------------
-- score_history — one row per assessment, the series behind the trend charts
-- ---------------------------------------------------------------------------

create table if not exists public.score_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  overall_score integer not null,
  spend_score   integer,
  save_score    integer,
  borrow_score  integer,
  plan_score    integer,
  recorded_at   timestamptz not null default now(),

  constraint score_history_overall_range check (overall_score between 0 and 100),
  constraint score_history_spend_range check (spend_score is null or spend_score between 0 and 100),
  constraint score_history_save_range check (save_score is null or save_score between 0 and 100),
  constraint score_history_borrow_range check (borrow_score is null or borrow_score between 0 and 100),
  constraint score_history_plan_range check (plan_score is null or plan_score between 0 and 100),
  constraint score_history_one_per_assessment unique (assessment_id)
);

create index if not exists score_history_user_recorded_idx
  on public.score_history (user_id, recorded_at asc);

-- ---------------------------------------------------------------------------
-- Immutability guard (§76)
-- ---------------------------------------------------------------------------

create or replace function public.meridian_reject_update()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Historical records are immutable: % cannot be updated. Create a new assessment instead.',
    tg_table_name
    using errcode = 'restrict_violation';
end;
$$;

comment on function public.meridian_reject_update() is
  'Blocks UPDATE on the historical tables for every role, service role included.';

drop trigger if exists assessments_immutable on public.assessments;
create trigger assessments_immutable
  before update on public.assessments
  for each row execute function public.meridian_reject_update();

drop trigger if exists assessment_answers_immutable on public.assessment_answers;
create trigger assessment_answers_immutable
  before update on public.assessment_answers
  for each row execute function public.meridian_reject_update();

drop trigger if exists score_history_immutable on public.score_history;
create trigger score_history_immutable
  before update on public.score_history
  for each row execute function public.meridian_reject_update();

-- ---------------------------------------------------------------------------
-- assessment_drafts
--
-- One live draft per user. client_revision lets the offline-resilient client
-- resolve a conflict without silently discarding newer work (§74).
-- ---------------------------------------------------------------------------

create table if not exists public.assessment_drafts (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  assessment_version text not null,
  answers            jsonb not null default '{}'::jsonb,
  current_step       integer not null default 0,
  client_revision    bigint not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint assessment_drafts_step_range check (current_step >= 0 and current_step < 100),
  constraint assessment_drafts_revision_nonneg check (client_revision >= 0)
);

drop trigger if exists assessment_drafts_set_updated_at on public.assessment_drafts;
create trigger assessment_drafts_set_updated_at
  before update on public.assessment_drafts
  for each row execute function public.meridian_set_updated_at();
