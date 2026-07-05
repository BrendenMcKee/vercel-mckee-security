-- Starlink rental system schema (applied via MCP 2026-06-29; file backfilled for history sync)

-- Extensions
create extension if not exists btree_gist with schema extensions;

-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- units (the fleet)
create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#c91818',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- rentals (bookings)
create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested','confirmed','active','returned','cancelled')),
  source text not null default 'admin'
    check (source in ('website','admin')),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_address text,
  usage_location text,
  pickup_date date not null,
  pickup_time text,
  return_date date not null,
  daily_rate numeric(10,2),
  quoted_price numeric(10,2),
  deposit_amount numeric(10,2),
  deposit_received boolean not null default false,
  deposit_received_at timestamptz,
  deposit_returned boolean not null default false,
  deposit_returned_at timestamptz,
  deposit_returned_amount numeric(10,2),
  amount_received numeric(10,2),
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rentals_dates_chk check (return_date >= pickup_date)
);

-- prevent overlapping confirmed/active rentals for the same unit
alter table public.rentals
  add constraint rentals_no_overlap
  exclude using gist (
    unit_id with =,
    daterange(pickup_date, return_date, '[]') with &&
  ) where (status in ('confirmed','active') and unit_id is not null);

-- indexes
create index rentals_pickup_return_idx on public.rentals (pickup_date, return_date);
create index rentals_unit_idx on public.rentals (unit_id);
create index rentals_status_idx on public.rentals (status);
create index rentals_customer_email_idx on public.rentals (customer_email);

-- updated_at trigger
create trigger rentals_set_updated_at
  before update on public.rentals
  for each row execute function public.set_updated_at();

-- RLS: enabled with no policies. Service role bypasses RLS; anon is denied.
alter table public.units enable row level security;
alter table public.rentals enable row level security;
