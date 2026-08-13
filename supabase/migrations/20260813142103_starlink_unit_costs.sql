-- Monthly service cost per Starlink kit, with history so a rate change does
-- not rewrite past months. Profitability (the Profit tab) uses these rows as
-- the cost side and rental `amount_received` as the revenue side — deposits
-- are never mixed in, because they go back to the customer.
--
-- `effective_from` is the first calendar day the rate applies. Saving a new
-- rate inserts a row rather than overwriting, so August at $200 and September
-- at $220 can coexist. A unique (unit_id, effective_from) keeps one rate per
-- kit per day.

create table public.unit_costs (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  monthly_cost numeric(10,2) not null check (monthly_cost >= 0),
  plan_name text,
  effective_from date not null,
  created_at timestamptz not null default now(),
  constraint unit_costs_once unique (unit_id, effective_from)
);

create index unit_costs_unit_idx on public.unit_costs (unit_id, effective_from);

alter table public.unit_costs enable row level security;

-- Seed the rates in force as of 2026-08-13, backdated to each kit's Toronto
-- creation date so every rental already on the books is costed. Matched by
-- name rather than id so this file stays valid against a fresh local database.
insert into public.unit_costs (unit_id, monthly_cost, plan_name, effective_from)
select
  u.id,
  case u.name
    when 'Starlink 1' then 200.00
    when 'Starlink 2' then 110.00
    when 'Starlink 3' then 200.00
  end,
  case u.name
    when 'Starlink 1' then 'Roam - Unlimited'
    when 'Starlink 2' then 'Roam - 300GB'
    when 'Starlink 3' then 'Roam - Unlimited'
  end,
  (u.created_at at time zone 'America/Toronto')::date
from public.units u
where u.name in ('Starlink 1', 'Starlink 2', 'Starlink 3');
