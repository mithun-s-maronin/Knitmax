-- ============================================================================
-- Meridian — 0005 row level security
--
-- Every table is owner-scoped: a row is visible and writable only to the user
-- whose id it carries. Authorization is never left to the client — the
-- policies below are the enforcement point, and tests/db asserts that a second
-- user gets zero rows and zero writes against the first user's data (§45, §82).
--
-- The historical tables (assessments, assessment_answers, score_history) get
-- SELECT and INSERT only. There is deliberately no UPDATE or DELETE policy:
-- combined with the immutability trigger in 0003, a completed assessment can
-- never be altered or removed through the API (§76). Account deletion still
-- works because it cascades from auth.users, which runs as the table owner.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

alter table public.profiles             enable row level security;
alter table public.financial_profiles   enable row level security;
alter table public.user_settings        enable row level security;
alter table public.income_sources       enable row level security;
alter table public.expenses             enable row level security;
alter table public.savings_accounts     enable row level security;
alter table public.debts                enable row level security;
alter table public.financial_goals      enable row level security;
alter table public.assets               enable row level security;
alter table public.liabilities          enable row level security;
alter table public.net_worth_snapshots  enable row level security;
alter table public.assessments          enable row level security;
alter table public.assessment_answers   enable row level security;
alter table public.score_history        enable row level security;
alter table public.assessment_drafts    enable row level security;
alter table public.action_plans         enable row level security;
alter table public.ai_conversations     enable row level security;
alter table public.ai_messages          enable row level security;
alter table public.notifications        enable row level security;
alter table public.milestones           enable row level security;
alter table public.check_ins            enable row level security;
alter table public.simulations          enable row level security;

-- Force RLS so it also applies to the tables' owner role in local testing.
alter table public.assessments        force row level security;
alter table public.assessment_answers force row level security;
alter table public.score_history      force row level security;

-- ---------------------------------------------------------------------------
-- Grants: authenticated users act only through policies; anon gets nothing.
-- ---------------------------------------------------------------------------

do $$
declare
  full_crud text[] := array[
    'profiles', 'financial_profiles', 'user_settings', 'income_sources', 'expenses',
    'savings_accounts', 'debts', 'financial_goals', 'assets', 'liabilities',
    'net_worth_snapshots', 'assessment_drafts', 'action_plans', 'ai_conversations',
    'ai_messages', 'notifications', 'milestones', 'check_ins', 'simulations'
  ];
  append_only text[] := array['assessments', 'assessment_answers', 'score_history'];
  t text;
begin
  foreach t in array full_crud loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;

  foreach t in array append_only loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Owner-scoped policies
--
-- Generated so that every table gets exactly the same four policies keyed on
-- the same column — one shape, no table that quietly missed a policy.
-- ---------------------------------------------------------------------------

do $$
declare
  -- table name, owner column
  spec text[][] := array[
    ['profiles', 'id'],
    ['user_settings', 'user_id'],
    ['financial_profiles', 'user_id'],
    ['income_sources', 'user_id'],
    ['expenses', 'user_id'],
    ['savings_accounts', 'user_id'],
    ['debts', 'user_id'],
    ['financial_goals', 'user_id'],
    ['assets', 'user_id'],
    ['liabilities', 'user_id'],
    ['net_worth_snapshots', 'user_id'],
    ['assessment_drafts', 'user_id'],
    ['action_plans', 'user_id'],
    ['ai_conversations', 'user_id'],
    ['ai_messages', 'user_id'],
    ['notifications', 'user_id'],
    ['milestones', 'user_id'],
    ['check_ins', 'user_id'],
    ['simulations', 'user_id']
  ];
  tbl text;
  col text;
  i int;
begin
  for i in 1 .. array_length(spec, 1) loop
    tbl := spec[i][1];
    col := spec[i][2];

    execute format('drop policy if exists %I on public.%I', tbl || '_select_own', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_insert_own', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_update_own', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_delete_own', tbl);

    execute format(
      'create policy %I on public.%I for select to authenticated using (%I = (select auth.uid()))',
      tbl || '_select_own', tbl, col);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (%I = (select auth.uid()))',
      tbl || '_insert_own', tbl, col);
    execute format(
      'create policy %I on public.%I for update to authenticated using (%I = (select auth.uid())) with check (%I = (select auth.uid()))',
      tbl || '_update_own', tbl, col, col);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (%I = (select auth.uid()))',
      tbl || '_delete_own', tbl, col);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Append-only historical tables: SELECT + INSERT, nothing else.
-- ---------------------------------------------------------------------------

do $$
declare
  append_only text[] := array['assessments', 'assessment_answers', 'score_history'];
  tbl text;
begin
  foreach tbl in array append_only loop
    execute format('drop policy if exists %I on public.%I', tbl || '_select_own', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_insert_own', tbl);

    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      tbl || '_select_own', tbl);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      tbl || '_insert_own', tbl);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Extra ownership checks on rows that hang off a parent row.
--
-- A matching user_id is not enough for these: the referenced parent must also
-- belong to the caller, otherwise a user could attach a message to somebody
-- else's conversation.
-- ---------------------------------------------------------------------------

drop policy if exists ai_messages_insert_own on public.ai_messages;
create policy ai_messages_insert_own on public.ai_messages
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists assessment_answers_insert_own on public.assessment_answers;
create policy assessment_answers_insert_own on public.assessment_answers
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.assessments a
      where a.id = assessment_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists score_history_insert_own on public.score_history;
create policy score_history_insert_own on public.score_history
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.assessments a
      where a.id = assessment_id and a.user_id = (select auth.uid())
    )
  );
