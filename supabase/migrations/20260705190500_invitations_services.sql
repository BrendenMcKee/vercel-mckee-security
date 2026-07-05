-- Phase 2: invitations + services (PORTAL_PLAN.md 4.2, Migration 2)
-- Iterated and smoke-tested on the develop branch 2026-07-05.

-- ---------------------------------------------------------------------------
-- invitations: single-use activation tokens (R8). Raw token is never stored;
-- only its SHA-256 hash. Pre-session validation uses the service role, so
-- clients get no policies at all.
-- ---------------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  target_email text,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one open invitation per profile; resend expires the old row first.
create unique index invitations_one_open_per_profile on public.invitations (profile_id) where used_at is null;
create index invitations_profile_id_idx on public.invitations (profile_id);
create index invitations_created_by_idx on public.invitations (created_by);

create trigger invitations_set_updated_at
  before update on public.invitations
  for each row execute function private.set_updated_at();

alter table public.invitations enable row level security;

create policy "invitations_admin_select" on public.invitations
  for select to authenticated
  using ((select private.is_admin()));

create policy "invitations_admin_insert" on public.invitations
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "invitations_admin_update" on public.invitations
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- services: one row per client per product (handover 9.4). Billing rails per
-- R22 (Stripe autopay vs manual). Tier values constrained per service type.
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  service_type public.service_type not null,
  tier text not null,
  status public.service_status not null default 'unpaid',
  stripe_subscription_id text,
  billing_method public.billing_method not null default 'manual',
  monthly_amount_cents integer,
  next_due_on date,
  due_alerted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, service_type),
  constraint services_tier_valid check (
    (service_type = 'monitoring' and tier in ('basic', 'standard', 'pro'))
    or (service_type = 'cloud_backup' and tier in ('7day', '30day', '90day'))
  ),
  constraint services_monthly_amount_positive check (monthly_amount_cents is null or monthly_amount_cents > 0)
);

create unique index services_stripe_subscription_id_unique on public.services (stripe_subscription_id) where stripe_subscription_id is not null;
create index services_profile_id_idx on public.services (profile_id);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function private.set_updated_at();

alter table public.services enable row level security;

-- Single permissive SELECT policy per role/action (performance lint 0006).
create policy "services_select" on public.services
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  );

create policy "services_admin_insert" on public.services
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "services_admin_update" on public.services
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- profiles: consolidate the two permissive SELECT policies from Migration 1
-- into one (performance lint 0006). Behavior is unchanged.
-- ---------------------------------------------------------------------------
drop policy "profiles_client_select_own" on public.profiles;
drop policy "profiles_admin_select_all" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Atomic create-client (PORTAL_PLAN.md 6.2): profile + services + invitation
-- in one transaction. SECURITY INVOKER: the caller's RLS admin policies are
-- the authorization; non-admins hit an RLS violation on the first insert.
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_client(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_address text,
  p_monitoring_tier text,
  p_cloud_tier text,
  p_token_hash text,
  p_target_email text
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  insert into public.profiles (first_name, last_name, email, address)
  values (p_first_name, p_last_name, lower(nullif(trim(p_email), '')), nullif(trim(p_address), ''))
  returning id into v_profile_id;

  if p_monitoring_tier is not null then
    insert into public.services (profile_id, service_type, tier)
    values (v_profile_id, 'monitoring', p_monitoring_tier);
  end if;

  if p_cloud_tier is not null then
    insert into public.services (profile_id, service_type, tier)
    values (v_profile_id, 'cloud_backup', p_cloud_tier);
  end if;

  insert into public.invitations (profile_id, token_hash, target_email, created_by)
  values (v_profile_id, p_token_hash, lower(nullif(trim(p_target_email), '')), (select auth.uid()));

  return v_profile_id;
end;
$$;

revoke execute on function public.admin_create_client(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.admin_create_client(text, text, text, text, text, text, text, text) to authenticated;
