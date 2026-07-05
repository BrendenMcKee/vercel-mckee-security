-- Phase 4: caller ID contacts + immutable change history + devices
-- (PORTAL_PLAN.md 4.2, Migration for Phase 4; R23/R24 audit model).

-- ---------------------------------------------------------------------------
-- caller_id_contacts: the live list. List saves are transactional
-- delete+insert via public.save_caller_id_list below, so there is no UPDATE
-- policy at all.
-- ---------------------------------------------------------------------------
create table public.caller_id_contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  phone text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, phone),
  constraint caller_id_contacts_phone_nanp check (phone ~ '^\+1[2-9]\d{9}$'),
  constraint caller_id_contacts_label_length check (length(label) between 1 and 80)
);

create index caller_id_contacts_profile_id_idx on public.caller_id_contacts (profile_id);

alter table public.caller_id_contacts enable row level security;

-- Single permissive policy per action (performance lint 0006): admin or own.
create policy "caller_id_contacts_select" on public.caller_id_contacts
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  );

create policy "caller_id_contacts_insert" on public.caller_id_contacts
  for insert to authenticated
  with check (
    (select private.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  );

create policy "caller_id_contacts_delete" on public.caller_id_contacts
  for delete to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- caller_id_changes: append-only audit history (R24). No UPDATE or DELETE
-- policy for any role, so the trail cannot be rewritten from any session.
-- changed_by has NO foreign key on purpose: audit rows must never block or be
-- destroyed by auth-user lifecycle (write-time integrity is enforced by the
-- INSERT policy, and the actor's email is denormalized for durability).
-- client_notified_at is stamped by the service role after the notification
-- email sends.
-- ---------------------------------------------------------------------------
create table public.caller_id_changes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  changed_by uuid not null,
  changed_by_email text,
  changed_via text not null,
  added jsonb not null default '[]'::jsonb,
  removed jsonb not null default '[]'::jsonb,
  authorized_via text,
  change_reason text,
  client_notified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint caller_id_changes_via_valid check (changed_via in ('client_dashboard', 'admin_dashboard')),
  constraint caller_id_changes_authorized_via_valid check (
    authorized_via is null
    or authorized_via in ('client_email', 'client_verbal', 'client_in_person', 'mckee_initiated')
  ),
  -- R24 integrity: an admin change cannot exist without recorded authorization
  -- and a non-empty reason.
  constraint caller_id_changes_admin_requires_authorization check (
    changed_via = 'client_dashboard'
    or (authorized_via is not null and length(trim(change_reason)) > 0)
  )
);

create index caller_id_changes_profile_id_idx on public.caller_id_changes (profile_id, created_at desc);

alter table public.caller_id_changes enable row level security;

-- History is admin-facing in v1 (D6/Q9 default; clients get their own diff
-- emails as the record on their side).
create policy "caller_id_changes_admin_select" on public.caller_id_changes
  for select to authenticated
  using ((select private.is_admin()));

-- The actor writes their own history row: admins write admin_dashboard rows,
-- clients write client_dashboard rows for their own profile. Neither side can
-- masquerade as the other.
create policy "caller_id_changes_insert" on public.caller_id_changes
  for insert to authenticated
  with check (
    changed_by = (select auth.uid())
    and (
      ((select private.is_admin()) and changed_via = 'admin_dashboard')
      or (
        changed_via = 'client_dashboard'
        and exists (
          select 1 from public.profiles p
          where p.id = profile_id and p.user_id = (select auth.uid())
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- devices: battery + smoke detector maintenance dates (handover 6.5). Expiry
-- is computed in the app (battery +5y, smoke +10y), never stored.
-- ---------------------------------------------------------------------------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  device_type public.device_type not null,
  installed_on date not null,
  expiry_alerted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, device_type)
);

create index devices_profile_id_idx on public.devices (profile_id);

create trigger devices_set_updated_at
  before update on public.devices
  for each row execute function private.set_updated_at();

alter table public.devices enable row level security;

create policy "devices_select" on public.devices
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  );

create policy "devices_admin_insert" on public.devices
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "devices_admin_update" on public.devices
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Transactional list save (R23): replace the list, compute the exact diff,
-- and write the audit row in ONE transaction. SECURITY INVOKER: RLS on the
-- three tables is the authorization, so a client can only ever save their own
-- list as a client_dashboard change, and only admins can record
-- admin_dashboard changes. Returns the diff for the notification emails.
-- Contacts are compared as (phone, label) pairs, so a label edit audits as
-- remove + add.
-- ---------------------------------------------------------------------------
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
  v_change_id uuid;
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
    (profile_id, changed_by, changed_by_email, changed_via, added, removed, authorized_via, change_reason)
  values
    (p_profile_id, (select auth.uid()), nullif(trim(p_changed_by_email), ''), p_changed_via,
     v_added, v_removed, nullif(trim(p_authorized_via), ''), nullif(trim(p_change_reason), ''))
  returning id into v_change_id;

  return jsonb_build_object('change_id', v_change_id, 'added', v_added, 'removed', v_removed);
end;
$$;

revoke execute on function public.save_caller_id_list(uuid, jsonb, text, text, text, text) from public, anon;
grant execute on function public.save_caller_id_list(uuid, jsonb, text, text, text, text) to authenticated;
