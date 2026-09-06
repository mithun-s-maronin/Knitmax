-- ============================================================================
-- Meridian — 0004 engagement
--
-- Action plans, AI conversations, notifications/alerts, milestones, monthly
-- check-ins and saved simulations.
-- ============================================================================

do $$ begin
  create type meridian_pillar as enum ('spend', 'save', 'borrow', 'plan', 'overall');
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_priority as enum ('high', 'medium', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_action_horizon as enum ('immediate', 'short_term', 'long_term');
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_action_status as enum ('pending', 'completed', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_message_role as enum ('user', 'assistant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_notification_type as enum (
    'alert', 'opportunity', 'score_change', 'goal_milestone', 'milestone',
    'checkin_reminder', 'action_completed', 'system'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_severity as enum ('critical', 'warning', 'info', 'success');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- action_plans
-- ---------------------------------------------------------------------------

create table if not exists public.action_plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  assessment_id  uuid references public.assessments (id) on delete set null,
  recommendation_key text,
  title          text not null,
  description    text not null default '',
  rationale      text,
  priority       meridian_priority not null default 'medium',
  category       meridian_pillar not null default 'overall',
  horizon        meridian_action_horizon not null default 'short_term',
  status         meridian_action_status not null default 'pending',
  impact_points  numeric(5, 2),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  completed_at   timestamptz,

  constraint action_plans_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint action_plans_description_length check (char_length(description) <= 2000),
  constraint action_plans_impact_range check (impact_points is null or (impact_points >= 0 and impact_points <= 100)),
  constraint action_plans_completed_consistency check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create index if not exists action_plans_user_idx on public.action_plans (user_id, status, priority);
create unique index if not exists action_plans_user_key_idx
  on public.action_plans (user_id, recommendation_key)
  where recommendation_key is not null;

drop trigger if exists action_plans_set_updated_at on public.action_plans;
create trigger action_plans_set_updated_at
  before update on public.action_plans
  for each row execute function public.meridian_set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_conversations / ai_messages
-- ---------------------------------------------------------------------------

create table if not exists public.ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_conversations_title_length check (char_length(btrim(title)) between 1 and 200)
);

create index if not exists ai_conversations_user_idx
  on public.ai_conversations (user_id, updated_at desc);

drop trigger if exists ai_conversations_set_updated_at on public.ai_conversations;
create trigger ai_conversations_set_updated_at
  before update on public.ai_conversations
  for each row execute function public.meridian_set_updated_at();

create table if not exists public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            meridian_message_role not null,
  content         text not null,
  -- Whether personal financial context was in scope for this turn, so the
  -- transcript stays honest about what the assistant could see.
  used_financial_context boolean not null default false,
  created_at      timestamptz not null default now(),

  constraint ai_messages_content_length check (char_length(content) between 1 and 100000)
);

create index if not exists ai_messages_conversation_idx
  on public.ai_messages (conversation_id, created_at asc);

-- ---------------------------------------------------------------------------
-- notifications — deterministic alerts and milestone notices
--
-- dedupe_key stops the alert engine re-raising the same warning on every page
-- load; it is unique per user where present.
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        meridian_notification_type not null default 'system',
  severity    meridian_severity not null default 'info',
  title       text not null,
  message     text not null default '',
  href        text,
  dedupe_key  text,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),

  constraint notifications_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint notifications_message_length check (char_length(message) <= 2000)
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create unique index if not exists notifications_user_dedupe_idx
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

-- ---------------------------------------------------------------------------
-- milestones — subtle, professional recognition (§65)
-- ---------------------------------------------------------------------------

create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  key         text not null,
  title       text not null,
  description text not null default '',
  achieved_at timestamptz not null default now(),

  constraint milestones_key_length check (char_length(key) between 1 and 80),
  constraint milestones_unique_per_user unique (user_id, key)
);

create index if not exists milestones_user_idx
  on public.milestones (user_id, achieved_at desc);

-- ---------------------------------------------------------------------------
-- check_ins — the recurring monthly update (§34)
-- ---------------------------------------------------------------------------

create table if not exists public.check_ins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  period        date not null,
  changes       jsonb not null default '{}'::jsonb,
  notes         text,
  assessment_id uuid references public.assessments (id) on delete set null,
  created_at    timestamptz not null default now(),

  constraint check_ins_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint check_ins_one_per_period unique (user_id, period)
);

create index if not exists check_ins_user_idx on public.check_ins (user_id, period desc);

-- ---------------------------------------------------------------------------
-- simulations — saved what-if scenarios (§29)
-- ---------------------------------------------------------------------------

create table if not exists public.simulations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  name              text not null default 'Scenario',
  adjustments       jsonb not null default '{}'::jsonb,
  baseline_scores   jsonb not null default '{}'::jsonb,
  projected_scores  jsonb not null default '{}'::jsonb,
  applied_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint simulations_name_length check (char_length(btrim(name)) between 1 and 120)
);

create index if not exists simulations_user_idx on public.simulations (user_id, created_at desc);

drop trigger if exists simulations_set_updated_at on public.simulations;
create trigger simulations_set_updated_at
  before update on public.simulations
  for each row execute function public.meridian_set_updated_at();
