-- Stakeholder round 2 (2026-07-06):
--  1. Caller ID contacts carry a monitoring-station passcode: the word each
--     person uses to prove who they are when the station calls. Stored with
--     the contact, included in the Lanvac diff email, audited in
--     caller_id_changes like everything else.
--  2. Clients can see their own payment history (manual_payments SELECT own),
--     so the dashboard can show "payments you've made" for legacy payers.

-- ---------------------------------------------------------------------------
-- 1. Passcode column. Nullable for pre-existing rows; the app requires it for
--    every newly added contact.
-- ---------------------------------------------------------------------------
alter table public.caller_id_contacts add column passcode text;

alter table public.caller_id_contacts
  add constraint caller_id_contacts_passcode_length
  check (passcode is null or length(passcode) between 1 and 40);

-- Transactional list save now diffs and stores (phone, label, passcode)
-- triplets, so a passcode change on an existing person audits as
-- remove + add just like a name edit.
create or replace function public.save_caller_id_list(
  p_profile_id uuid,
  p_contacts jsonb,
  p_changed_via text,
  p_changed_by_email text,
  p_authorized_via text default null,
  p_change_reason text default null
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_added jsonb;
  v_removed jsonb;
  v_change_id uuid := gen_random_uuid();
begin
  select coalesce(
    jsonb_agg(jsonb_build_object('phone', n.phone, 'label', n.label, 'passcode', n.passcode)),
    '[]'::jsonb
  )
  into v_added
  from (
    select distinct c->>'phone' as phone, c->>'label' as label, nullif(trim(c->>'passcode'), '') as passcode
    from jsonb_array_elements(p_contacts) c
  ) n
  where not exists (
    select 1 from public.caller_id_contacts o
    where o.profile_id = p_profile_id
      and o.phone = n.phone
      and o.label = n.label
      and o.passcode is not distinct from n.passcode
  );

  select coalesce(
    jsonb_agg(jsonb_build_object('phone', o.phone, 'label', o.label, 'passcode', o.passcode)),
    '[]'::jsonb
  )
  into v_removed
  from public.caller_id_contacts o
  where o.profile_id = p_profile_id
    and not exists (
      select 1 from jsonb_array_elements(p_contacts) c
      where c->>'phone' = o.phone
        and c->>'label' = o.label
        and o.passcode is not distinct from nullif(trim(c->>'passcode'), '')
    );

  if v_added = '[]'::jsonb and v_removed = '[]'::jsonb then
    return jsonb_build_object('no_change', true);
  end if;

  delete from public.caller_id_contacts where profile_id = p_profile_id;

  insert into public.caller_id_contacts (profile_id, phone, label, passcode)
  select p_profile_id, n.phone, n.label, n.passcode
  from (
    select distinct c->>'phone' as phone, c->>'label' as label, nullif(trim(c->>'passcode'), '') as passcode
    from jsonb_array_elements(p_contacts) c
  ) n;

  insert into public.caller_id_changes
    (id, profile_id, changed_by, changed_by_email, changed_via, added, removed, authorized_via, change_reason)
  values
    (v_change_id, p_profile_id, (select auth.uid()), nullif(trim(p_changed_by_email), ''), p_changed_via,
     v_added, v_removed, nullif(trim(p_authorized_via), ''), nullif(trim(p_change_reason), ''));

  return jsonb_build_object('change_id', v_change_id, 'added', v_added, 'removed', v_removed);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Clients read their own payment ledger. Replaces the admin-only SELECT
--    policy with one permissive policy per action (performance lint 0006).
--    Writes stay exactly as they were: admin INSERT only, no UPDATE/DELETE.
-- ---------------------------------------------------------------------------
drop policy "manual_payments_admin_select" on public.manual_payments;

create policy "manual_payments_select" on public.manual_payments
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  );
