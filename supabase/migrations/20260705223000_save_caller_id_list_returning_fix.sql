-- Fix: INSERT ... RETURNING requires the new row to pass the SELECT policy,
-- and caller_id_changes is deliberately admin-read-only (clients get no
-- SELECT). Pre-generate the history id instead of RETURNING it, so client
-- saves work while the history table stays invisible to them.
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
  select coalesce(jsonb_agg(jsonb_build_object('phone', n.phone, 'label', n.label)), '[]'::jsonb)
  into v_added
  from (
    select distinct c->>'phone' as phone, c->>'label' as label
    from jsonb_array_elements(p_contacts) c
  ) n
  where not exists (
    select 1 from public.caller_id_contacts o
    where o.profile_id = p_profile_id and o.phone = n.phone and o.label = n.label
  );

  select coalesce(jsonb_agg(jsonb_build_object('phone', o.phone, 'label', o.label)), '[]'::jsonb)
  into v_removed
  from public.caller_id_contacts o
  where o.profile_id = p_profile_id
    and not exists (
      select 1 from jsonb_array_elements(p_contacts) c
      where c->>'phone' = o.phone and c->>'label' = o.label
    );

  if v_added = '[]'::jsonb and v_removed = '[]'::jsonb then
    return jsonb_build_object('no_change', true);
  end if;

  delete from public.caller_id_contacts where profile_id = p_profile_id;

  insert into public.caller_id_contacts (profile_id, phone, label)
  select p_profile_id, n.phone, n.label
  from (
    select distinct c->>'phone' as phone, c->>'label' as label
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
