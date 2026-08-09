-- Starlink rental reminder guard (internal notifications).
--
-- One row per reminder actually delivered, so a date-specific nudge ("pickup is
-- today", "payment is not in yet") is sent once instead of every time the daily
-- cron runs. `sent_for` is the date the reminder is about, so moving a booking's
-- pickup date legitimately earns a fresh reminder for the new date.
--
-- Recurring "you still have not done this" items (overdue returns, deposits to
-- refund) intentionally have no guard: they belong in the daily digest and
-- should keep appearing until someone acts on them.

create table public.rental_reminders (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals(id) on delete cascade,
  kind text not null
    check (kind in ('pickup_today','payment_before_pickup')),
  sent_for date not null,
  sent_at timestamptz not null default now(),
  constraint rental_reminders_once unique (rental_id, kind, sent_for)
);

create index rental_reminders_rental_idx on public.rental_reminders (rental_id);

-- RLS: enabled with no policies, matching units/rentals. Service role bypasses
-- RLS (the cron job); anon and authenticated are denied.
alter table public.rental_reminders enable row level security;
