-- ============================================================================
-- Meridian — 0001 core
--
-- Extensions, shared enums, the updated_at trigger, and the three tables that
-- describe a person rather than their money: profiles, financial_profiles and
-- user_settings. A row in each is created automatically when an auth user is
-- created, so the rest of the app can assume they exist.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type meridian_frequency as enum (
    'weekly', 'fortnightly', 'monthly', 'quarterly', 'annually', 'one_time'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_employment_status as enum (
    'employed_full_time', 'employed_part_time', 'self_employed', 'business_owner',
    'student', 'retired', 'unemployed', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_age_range as enum (
    'under_18', '18_24', '25_34', '35_44', '45_54', '55_64', '65_plus'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type meridian_theme as enum ('light', 'dark', 'system');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.meridian_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.meridian_set_updated_at() is
  'Keeps updated_at honest — the client never supplies it.';

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  country     text not null default 'US',
  currency    text not null default 'USD',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint profiles_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint profiles_country_format check (country ~ '^[A-Z]{2}$'),
  constraint profiles_full_name_length check (full_name is null or char_length(full_name) <= 120)
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.meridian_set_updated_at();

-- ---------------------------------------------------------------------------
-- financial_profiles
-- ---------------------------------------------------------------------------

create table if not exists public.financial_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users (id) on delete cascade,
  employment_status meridian_employment_status,
  income_frequency  meridian_frequency not null default 'monthly',
  age_range         meridian_age_range,
  dependents        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint financial_profiles_dependents_range check (dependents >= 0 and dependents <= 30)
);

create index if not exists financial_profiles_user_id_idx on public.financial_profiles (user_id);

drop trigger if exists financial_profiles_set_updated_at on public.financial_profiles;
create trigger financial_profiles_set_updated_at
  before update on public.financial_profiles
  for each row execute function public.meridian_set_updated_at();

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------

create table if not exists public.user_settings (
  user_id                  uuid primary key references auth.users (id) on delete cascade,
  theme                    meridian_theme not null default 'system',
  notifications_enabled    boolean not null default true,
  score_change_alerts      boolean not null default true,
  goal_milestone_alerts    boolean not null default true,
  monthly_checkin_reminder boolean not null default true,
  onboarding_completed_at  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.meridian_set_updated_at();

-- ---------------------------------------------------------------------------
-- Bootstrap rows for a brand new auth user
-- ---------------------------------------------------------------------------

create or replace function public.meridian_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.financial_profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists meridian_on_auth_user_created on auth.users;
create trigger meridian_on_auth_user_created
  after insert on auth.users
  for each row execute function public.meridian_handle_new_user();
