-- Portal foundation: private schema, enums, profiles, RLS
-- PORTAL_PLAN.md Phase 1, Migration 1 (validated on the develop branch, advisors clean)

create schema if not exists private;
grant usage on schema private to authenticated;

-- Enums (PORTAL_PLAN.md 4.1)
create type public.user_role       as enum ('client', 'admin', 'technician');
create type public.profile_status  as enum ('pending', 'active', 'disabled');
create type public.service_type    as enum ('monitoring', 'cloud_backup');
create type public.monitoring_tier as enum ('basic', 'standard', 'pro');
create type public.cloud_tier      as enum ('7day', '30day', '90day');
create type public.service_status  as enum ('active', 'paused', 'cancelled', 'unpaid');
create type public.device_type     as enum ('battery', 'smoke_detector');
create type public.footage_status  as enum ('pending', 'processing', 'ready', 'failed', 'expired');
create type public.billing_method  as enum ('stripe', 'manual');
create type public.payment_method  as enum ('etransfer', 'cheque', 'cash', 'other');

-- Shared updated_at trigger (runs as table owner; search_path pinned per advisor 0011)
create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles (PORTAL_PLAN.md 4.2): row exists before the auth user does
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  address text,
  role public.user_role not null default 'client',
  status public.profile_status not null default 'pending',
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_unique on public.profiles (lower(email)) where email is not null;
create unique index profiles_stripe_customer_id_unique on public.profiles (stripe_customer_id) where stripe_customer_id is not null;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Admin check for RLS (security definer: owner reads profiles without RLS recursion)
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- RLS (PORTAL_PLAN.md 4.3): anon none; client SELECT own; admin SELECT/INSERT/UPDATE all; no DELETE
alter table public.profiles enable row level security;

create policy "profiles_client_select_own" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "profiles_admin_select_all" on public.profiles
  for select to authenticated
  using ((select private.is_admin()));

create policy "profiles_admin_insert" on public.profiles
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
