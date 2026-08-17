-- Phase 8A first slice (PORTAL_PLAN.md 4.2). Read-only QuickBooks mirrors
-- plus services.started_on. Does not post, does not enqueue, does not
-- write Lanvac. qb_tasks is 8B.

-- ---------------------------------------------------------------------------
-- services.started_on (R49 / D15). Specified in the plan, never shipped.
-- Nullable in the column; admin UI / seed require it for monitoring.
-- ---------------------------------------------------------------------------
alter table public.services
  add column started_on date;

comment on column public.services.started_on is
  'Day this client actually began the service. Not invitation, not activation. Seed infers from the earliest matching QB invoice.';

-- ---------------------------------------------------------------------------
-- qb_bridges: one install, sandbox = PORTAL-TEST until 8C.
-- ---------------------------------------------------------------------------
create table public.qb_bridges (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  secret_hash text not null,
  mode text not null default 'sandbox',
  expected_company_file text not null,
  qb_company_file text,
  qb_company_name text,
  qb_version text,
  last_seen_at timestamptz,
  last_mirror_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qb_bridges_mode_check check (mode in ('sandbox', 'live'))
);

create trigger qb_bridges_set_updated_at
  before update on public.qb_bridges
  for each row execute function private.set_updated_at();

comment on table public.qb_bridges is
  'Office QuickBooks bridge. Sandbox opens only the PORTAL-TEST company file.';

-- ---------------------------------------------------------------------------
-- qb_customers: CustomerQuery mirror. profile_id unique when set.
-- ---------------------------------------------------------------------------
create table public.qb_customers (
  list_id text primary key,
  edit_sequence text not null,
  name text not null,
  company_name text,
  email text,
  phone text,
  is_active boolean not null default true,
  parent_list_id text,
  balance_cents integer not null default 0,
  profile_id uuid references public.profiles (id) on delete set null,
  synced_at timestamptz not null default now()
);

create unique index qb_customers_profile_id_unique
  on public.qb_customers (profile_id)
  where profile_id is not null;

create index qb_customers_is_active_name_idx
  on public.qb_customers (is_active, name);

create index qb_customers_parent_list_id_idx
  on public.qb_customers (parent_list_id)
  where parent_list_id is not null;

-- ---------------------------------------------------------------------------
-- qb_invoices: InvoiceQuery mirror. amount_cents is QB TxnAmount (usually
-- after tax). Seed matches net tier prices and gross x 1.13.
-- ---------------------------------------------------------------------------
create table public.qb_invoices (
  txn_id text primary key,
  edit_sequence text not null,
  customer_list_id text not null,
  ref_number text,
  txn_date date not null,
  due_on date,
  amount_cents integer not null,
  subtotal_cents integer,
  tax_cents integer,
  balance_cents integer not null default 0,
  is_paid boolean not null default false,
  is_memorized boolean not null default false,
  line_items jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now()
);

create index qb_invoices_customer_list_id_idx
  on public.qb_invoices (customer_list_id, txn_date);

create index qb_invoices_txn_date_idx
  on public.qb_invoices (txn_date);

-- ---------------------------------------------------------------------------
-- qb_payments: ReceivePaymentQuery mirror. Read-only in 8A.
-- ---------------------------------------------------------------------------
create table public.qb_payments (
  txn_id text primary key,
  edit_sequence text not null,
  customer_list_id text not null,
  txn_date date not null,
  amount_cents integer not null,
  payment_method text,
  ref_number text,
  deposit_account text,
  synced_at timestamptz not null default now(),
  constraint qb_payments_amount_positive check (amount_cents > 0)
);

create index qb_payments_customer_list_id_idx
  on public.qb_payments (customer_list_id, txn_date);

-- ---------------------------------------------------------------------------
-- qb_todos: ToDoQuery mirror. One-time device-draft source.
-- ---------------------------------------------------------------------------
create table public.qb_todos (
  todo_id text primary key,
  notes text not null,
  is_done boolean not null default false,
  reminder_date date,
  synced_at timestamptz not null default now()
);

create index qb_todos_is_done_idx
  on public.qb_todos (is_done, reminder_date);

-- ---------------------------------------------------------------------------
-- RLS: admin SELECT only. Clients see none. Writes are service-role
-- (bridge routes), which bypass RLS.
-- ---------------------------------------------------------------------------
alter table public.qb_bridges enable row level security;
alter table public.qb_customers enable row level security;
alter table public.qb_invoices enable row level security;
alter table public.qb_payments enable row level security;
alter table public.qb_todos enable row level security;

create policy "qb_bridges_admin_select" on public.qb_bridges
  for select to authenticated
  using ((select private.is_admin()));

create policy "qb_customers_admin_select" on public.qb_customers
  for select to authenticated
  using ((select private.is_admin()));

create policy "qb_invoices_admin_select" on public.qb_invoices
  for select to authenticated
  using ((select private.is_admin()));

create policy "qb_payments_admin_select" on public.qb_payments
  for select to authenticated
  using ((select private.is_admin()));

create policy "qb_todos_admin_select" on public.qb_todos
  for select to authenticated
  using ((select private.is_admin()));
