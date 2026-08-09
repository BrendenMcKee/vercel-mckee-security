-- Allow the deposit escalation to use the reminder guard table.
--
-- An unreturned deposit is the one item in the rental system where the money
-- belongs to the customer, so a line in the daily digest is not enough. Once it
-- has sat for a day the booking also gets its own email, repeated daily with
-- the day count in the subject until someone ticks Deposit returned.
--
-- Unlike the other two kinds, `sent_for` here is the date the reminder was sent
-- rather than the date it is about: that is what makes it recur daily while the
-- unique constraint still stops a double send within one run.

alter table public.rental_reminders
  drop constraint rental_reminders_kind_check;

alter table public.rental_reminders
  add constraint rental_reminders_kind_check
  check (kind in ('pickup_today','payment_before_pickup','deposit_overdue'));
