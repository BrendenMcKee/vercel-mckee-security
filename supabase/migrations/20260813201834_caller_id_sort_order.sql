-- Call order is a stored value (1 = first person the station calls).
-- The same phone may appear more than once (a parent listing their number
-- for a child). Reordering is a real change: the RPC records it and the
-- Lanvac email highlights those rows in blue.

alter table public.caller_id_contacts
  add column if not exists sort_order integer;

update public.caller_id_contacts c
set sort_order = s.n
from (
  select id, row_number() over (partition by profile_id order by created_at, id) as n
  from public.caller_id_contacts
) s
where c.id = s.id
  and c.sort_order is null;

alter table public.caller_id_contacts
  alter column sort_order set not null;

alter table public.caller_id_contacts
  drop constraint if exists caller_id_contacts_profile_id_phone_key;

alter table public.caller_id_contacts
  drop constraint if exists caller_id_contacts_profile_sort;

alter table public.caller_id_contacts
  add constraint caller_id_contacts_profile_sort unique (profile_id, sort_order);

alter table public.caller_id_contacts
  drop constraint if exists caller_id_contacts_sort_order_positive;

alter table public.caller_id_contacts
  add constraint caller_id_contacts_sort_order_positive check (sort_order >= 1);

alter table public.caller_id_changes
  add column if not exists reordered jsonb not null default '[]'::jsonb;

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
  v_reordered jsonb;
  v_change_id uuid := gen_random_uuid();
begin
  with new_list as (
    select
      c->>'phone' as phone,
      c->>'label' as label,
      nullif(trim(c->>'passcode'), '') as passcode,
      ord::int as sort_order,
      row_number() over (
        partition by c->>'phone', c->>'label', nullif(trim(c->>'passcode'), '')
        order by ord
      ) as rn
    from jsonb_array_elements(p_contacts) with ordinality as t(c, ord)
  ),
  old_list as (
    select
      phone,
      label,
      passcode,
      sort_order,
      row_number() over (
        partition by phone, label, passcode
        order by sort_order, id
      ) as rn
    from public.caller_id_contacts
    where profile_id = p_profile_id
  )
  select
    coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'phone', n.phone,
          'label', n.label,
          'passcode', n.passcode,
          'sort_order', n.sort_order
        ) order by n.sort_order)
        from new_list n
        where not exists (
          select 1 from old_list o
          where o.phone = n.phone
            and o.label = n.label
            and o.passcode is not distinct from n.passcode
            and o.rn = n.rn
        )
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'phone', o.phone,
          'label', o.label,
          'passcode', o.passcode,
          'sort_order', o.sort_order
        ) order by o.sort_order)
        from old_list o
        where not exists (
          select 1 from new_list n
          where n.phone = o.phone
            and n.label = o.label
            and n.passcode is not distinct from o.passcode
            and n.rn = o.rn
        )
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'phone', n.phone,
          'label', n.label,
          'passcode', n.passcode,
          'from_order', o.sort_order,
          'to_order', n.sort_order
        ) order by n.sort_order)
        from new_list n
        join old_list o
          on o.phone = n.phone
         and o.label = n.label
         and o.passcode is not distinct from n.passcode
         and o.rn = n.rn
        where o.sort_order is distinct from n.sort_order
      ),
      '[]'::jsonb
    )
  into v_added, v_removed, v_reordered;

  if v_added = '[]'::jsonb and v_removed = '[]'::jsonb and v_reordered = '[]'::jsonb then
    return jsonb_build_object('no_change', true);
  end if;

  delete from public.caller_id_contacts where profile_id = p_profile_id;

  insert into public.caller_id_contacts (profile_id, phone, label, passcode, sort_order)
  select
    p_profile_id,
    c->>'phone',
    c->>'label',
    nullif(trim(c->>'passcode'), ''),
    ord::int
  from jsonb_array_elements(p_contacts) with ordinality as t(c, ord);

  insert into public.caller_id_changes
    (id, profile_id, changed_by, changed_by_email, changed_via, added, removed, reordered, authorized_via, change_reason)
  values
    (v_change_id, p_profile_id, (select auth.uid()), nullif(trim(p_changed_by_email), ''), p_changed_via,
     v_added, v_removed, v_reordered, nullif(trim(p_authorized_via), ''), nullif(trim(p_change_reason), ''));

  return jsonb_build_object(
    'change_id', v_change_id,
    'added', v_added,
    'removed', v_removed,
    'reordered', v_reordered
  );
end;
$$;
