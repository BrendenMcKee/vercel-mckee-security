-- Starlink base rental rates (what we quote) and dated advertising spend
-- (what Meta/Google costs us per day). Profit still uses `amount_received`
-- as income — these rates only pre-fill new requests and add ad spend to
-- the cost side. Saving a new ad rate inserts a row rather than overwriting,
-- so a later change does not rewrite earlier months.
--
-- The $300 band starts at 12 days: the live card listed both "8 to 11" and
-- "11 to 14", and the first range wins so an 11-day rental is $250.

create table public.rental_rate_tiers (
  id uuid primary key default gen_random_uuid(),
  min_days integer not null check (min_days >= 1),
  max_days integer not null check (max_days >= min_days),
  amount numeric(10,2) not null check (amount >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rental_rate_tiers_range_idx
  on public.rental_rate_tiers (min_days, max_days);

create trigger rental_rate_tiers_set_updated_at
  before update on public.rental_rate_tiers
  for each row execute function public.set_updated_at();

alter table public.rental_rate_tiers enable row level security;

insert into public.rental_rate_tiers (min_days, max_days, amount, sort_order)
values
  (1, 3, 150.00, 1),
  (4, 7, 200.00, 2),
  (8, 11, 250.00, 3),
  (12, 14, 300.00, 4),
  (15, 21, 400.00, 5),
  (22, 30, 500.00, 6);

create table public.ad_spend_rates (
  id uuid primary key default gen_random_uuid(),
  daily_cost numeric(10,2) not null check (daily_cost >= 0),
  effective_from date not null,
  created_at timestamptz not null default now(),
  constraint ad_spend_rates_once unique (effective_from)
);

create index ad_spend_rates_from_idx
  on public.ad_spend_rates (effective_from);

alter table public.ad_spend_rates enable row level security;

-- $2.50/day from the start of the rental programme; $5/day from Saturday
-- 8 August 2026, the day the Meta switch was flipped.
insert into public.ad_spend_rates (daily_cost, effective_from)
values
  (2.50, '2026-06-01'),
  (5.00, '2026-08-08');
