-- Phase 5: billing rails (PORTAL_PLAN.md 4.2, 7.3, 9.1; R22).
-- profiles.stripe_customer_id and the services billing columns already exist
-- (Migrations 1/2), so this adds only the two ledgers.

-- ---------------------------------------------------------------------------
-- billing_events: Stripe webhook idempotency + audit. PK is the Stripe event
-- id, so replays are a single ON CONFLICT no-op. Service role writes; admins
-- read (Billing tab surfaces failed payments from here).
-- ---------------------------------------------------------------------------
create table public.billing_events (
  id text primary key,
  type text not null,
  service_id uuid references public.services (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index billing_events_type_created_idx on public.billing_events (type, created_at desc);

alter table public.billing_events enable row level security;

create policy "billing_events_admin_select" on public.billing_events
  for select to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- manual_payments: append-only ledger for legacy payers (R22). No UPDATE or
-- DELETE policies for any role: corrections are reversing entries (negative
-- amounts are allowed for exactly that purpose).
-- ---------------------------------------------------------------------------
create table public.manual_payments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null,
  method public.payment_method not null,
  paid_on date not null default current_date,
  note text,
  recorded_by uuid,
  recorded_by_email text,
  created_at timestamptz not null default now(),
  constraint manual_payments_amount_nonzero check (amount_cents <> 0)
);

create index manual_payments_service_id_idx on public.manual_payments (service_id, paid_on desc);
create index manual_payments_profile_id_idx on public.manual_payments (profile_id);

alter table public.manual_payments enable row level security;

create policy "manual_payments_admin_select" on public.manual_payments
  for select to authenticated
  using ((select private.is_admin()));

create policy "manual_payments_admin_insert" on public.manual_payments
  for insert to authenticated
  with check ((select private.is_admin()) and recorded_by = (select auth.uid()));
