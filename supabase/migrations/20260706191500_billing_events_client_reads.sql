-- Clients can see their own successful card payments (stakeholder 2026-07-06:
-- "see their own logs of how many payments they've made"). Card payments live
-- in billing_events as invoice.paid rows; everything else in the event stream
-- (failures, subscription changes, raw payloads of other types) stays
-- admin-only. Writes remain service-role only (no INSERT/UPDATE/DELETE
-- policies).
drop policy "billing_events_admin_select" on public.billing_events;

create policy "billing_events_select" on public.billing_events
  for select to authenticated
  using (
    (select private.is_admin())
    or (
      type = 'invoice.paid'
      and exists (
        select 1 from public.profiles p
        where p.id = profile_id and p.user_id = (select auth.uid())
      )
    )
  );
