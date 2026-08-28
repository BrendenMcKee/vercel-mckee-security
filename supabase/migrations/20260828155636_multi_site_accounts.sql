-- R53 slices 1-2: accounts + members, membership RLS, client insert trigger.
-- docs/MULTI_SITE_ACCOUNTS.md. Single-site clients keep one account + one owner.
-- Extra people are members; access is membership only (not leftover user_id).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  auto_onboard boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function private.set_updated_at();

comment on table public.accounts is
  'Household or organization. A profile (site) belongs to one account.';

create table public.account_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  role text not null,
  password_set_at timestamptz,
  invite_token_hash text,
  invite_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_members_role_valid check (role in ('owner', 'member')),
  constraint account_members_email_len check (char_length(btrim(email)) between 3 and 320)
);

create trigger account_members_set_updated_at
  before update on public.account_members
  for each row execute function private.set_updated_at();

create unique index account_members_account_email_idx
  on public.account_members (account_id, lower(btrim(email)));
create unique index account_members_account_user_idx
  on public.account_members (account_id, user_id)
  where user_id is not null;
create unique index account_members_one_owner_idx
  on public.account_members (account_id)
  where role = 'owner';
create index account_members_user_id_idx on public.account_members (user_id);
create index account_members_account_id_idx on public.account_members (account_id);

comment on table public.account_members is
  'People who can sign in to an account. owner = Account admin. Extra people do not get profiles.user_id.';

alter table public.profiles
  add column account_id uuid references public.accounts (id) on delete restrict;

create index profiles_account_id_idx on public.profiles (account_id);

alter table public.portal_settings
  add column org_grouping_reviewed_at timestamptz;

comment on column public.portal_settings.org_grouping_reviewed_at is
  'Human grouping sign-off. GO LIVE refuses until this is set. Empty-queue sign-off is allowed.';

-- ---------------------------------------------------------------------------
-- Backfill existing client rows (one account each). Admins stay account-less.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_account_id uuid;
  v_email text;
begin
  for r in
    select id, first_name, last_name, email, user_id, password_set_at
    from public.profiles
    where role = 'client' and account_id is null
  loop
    insert into public.accounts (name)
    values (nullif(btrim(concat_ws(' ', r.first_name, r.last_name)), '') || ' Account')
    returning id into v_account_id;

    update public.profiles
    set account_id = v_account_id
    where id = r.id;

    if r.user_id is not null then
      v_email := nullif(btrim(r.email), '');
      if v_email is null then
        v_email := r.user_id::text || '@pending.invalid';
      end if;
      insert into public.account_members (
        account_id, user_id, email, role, password_set_at
      ) values (
        v_account_id, r.user_id, v_email, 'owner', r.password_set_at
      );
    end if;
  end loop;
end
$$;

alter table public.profiles
  add constraint profiles_client_has_account check (
    (role = 'client' and account_id is not null)
    or (role <> 'client' and account_id is null)
  );

drop index if exists public.profiles_email_unique;

-- ---------------------------------------------------------------------------
-- Triggers: new client rows get an account; linked users get an owner member.
-- ---------------------------------------------------------------------------
create or replace function private.ensure_client_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid;
  v_name text;
begin
  if new.role is distinct from 'client' then
    new.account_id := null;
    return new;
  end if;

  if new.account_id is null then
    v_name := nullif(btrim(concat_ws(' ', new.first_name, new.last_name)), '');
    insert into public.accounts (name)
    values (coalesce(v_name, 'Client') || ' Account')
    returning id into v_account_id;
    new.account_id := v_account_id;
  end if;
  return new;
end;
$$;

create trigger profiles_ensure_client_account
  before insert on public.profiles
  for each row execute function private.ensure_client_account();

create or replace function private.ensure_client_owner_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if new.role is distinct from 'client' then
    return new;
  end if;
  if new.user_id is null or new.account_id is null then
    return new;
  end if;
  if exists (
    select 1 from public.account_members
    where account_id = new.account_id and role = 'owner'
  ) then
    return new;
  end if;
  v_email := nullif(btrim(new.email), '');
  if v_email is null then
    v_email := new.user_id::text || '@pending.invalid';
  end if;
  insert into public.account_members (account_id, user_id, email, role, password_set_at)
  values (new.account_id, new.user_id, v_email, 'owner', new.password_set_at)
  on conflict do nothing;
  return new;
end;
$$;

create trigger profiles_ensure_client_owner_member
  after insert or update of user_id, account_id on public.profiles
  for each row execute function private.ensure_client_owner_member();

create or replace function private.copy_member_password_set_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stamp timestamptz;
begin
  if new.user_id is null or new.password_set_at is not null then
    return new;
  end if;
  select m.password_set_at into v_stamp
  from public.account_members m
  where m.user_id = new.user_id
    and m.password_set_at is not null
  limit 1;
  if v_stamp is null then
    select p.password_set_at into v_stamp
    from public.profiles p
    where p.user_id = new.user_id
      and p.password_set_at is not null
    limit 1;
  end if;
  new.password_set_at := v_stamp;
  return new;
end;
$$;

create trigger account_members_copy_password_set_at
  before insert on public.account_members
  for each row execute function private.copy_member_password_set_at();

create or replace function private.delete_empty_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.account_id is not null
     and not exists (
       select 1 from public.profiles p where p.account_id = old.account_id
     )
  then
    delete from public.accounts where id = old.account_id;
  end if;
  return old;
end;
$$;

create trigger profiles_delete_empty_account
  after delete on public.profiles
  for each row execute function private.delete_empty_account();

-- ---------------------------------------------------------------------------
-- Access helper (membership only; does not treat leftover user_id as ACL)
-- ---------------------------------------------------------------------------
create or replace function private.can_access_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.account_members m on m.account_id = p.account_id
    where p.id = p_profile_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke execute on function private.can_access_profile(uuid) from public;
grant execute on function private.can_access_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.accounts enable row level security;
alter table public.account_members enable row level security;

create policy "accounts_select" on public.accounts
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.account_members m
      where m.account_id = accounts.id
        and m.user_id = (select auth.uid())
    )
  );

create policy "accounts_admin_insert" on public.accounts
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "accounts_admin_update" on public.accounts
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "account_members_select" on public.account_members
  for select to authenticated
  using (
    (select private.is_admin())
    or user_id = (select auth.uid())
  );

create policy "account_members_admin_insert" on public.account_members
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "account_members_admin_update" on public.account_members
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "account_members_admin_delete" on public.account_members
  for delete to authenticated
  using ((select private.is_admin()));

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.can_access_profile(id))
  );

drop policy if exists "services_select" on public.services;
create policy "services_select" on public.services
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.can_access_profile(profile_id))
  );

drop policy if exists "caller_id_contacts_select" on public.caller_id_contacts;
create policy "caller_id_contacts_select" on public.caller_id_contacts
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.can_access_profile(profile_id))
  );

drop policy if exists "caller_id_contacts_insert" on public.caller_id_contacts;
create policy "caller_id_contacts_insert" on public.caller_id_contacts
  for insert to authenticated
  with check (
    (select private.is_admin())
    or (select private.can_access_profile(profile_id))
  );

drop policy if exists "caller_id_contacts_delete" on public.caller_id_contacts;
create policy "caller_id_contacts_delete" on public.caller_id_contacts
  for delete to authenticated
  using (
    (select private.is_admin())
    or (select private.can_access_profile(profile_id))
  );

drop policy if exists "caller_id_changes_insert" on public.caller_id_changes;
create policy "caller_id_changes_insert" on public.caller_id_changes
  for insert to authenticated
  with check (
    changed_by = (select auth.uid())
    and (
      ((select private.is_admin()) and changed_via = 'admin_dashboard')
      or (
        changed_via = 'client_dashboard'
        and (select private.can_access_profile(profile_id))
      )
    )
  );

drop policy if exists "devices_select" on public.devices;
create policy "devices_select" on public.devices
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.can_access_profile(profile_id))
  );

drop policy if exists "manual_payments_select" on public.manual_payments;
create policy "manual_payments_select" on public.manual_payments
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.can_access_profile(profile_id))
  );

drop policy if exists "billing_events_select" on public.billing_events;
create policy "billing_events_select" on public.billing_events
  for select to authenticated
  using (
    (select private.is_admin())
    or (
      type = 'invoice.paid'
      and (select private.can_access_profile(profile_id))
    )
  );

drop policy if exists "Authorized users can view cloud backup interest"
  on public.cloud_backup_interest;
create policy "Authorized users can view cloud backup interest"
on public.cloud_backup_interest
for select
to authenticated
using (
  (select private.is_admin())
  or (
    (select private.can_access_profile(profile_id))
    and exists (
      select 1 from public.profiles p
      where p.id = cloud_backup_interest.profile_id
        and p.status = 'active'
    )
  )
);

drop policy if exists "Clients can join cloud backup interest list"
  on public.cloud_backup_interest;
create policy "Clients can join cloud backup interest list"
on public.cloud_backup_interest
for insert
to authenticated
with check (
  (select private.can_access_profile(profile_id))
  and exists (
    select 1 from public.profiles p
    where p.id = cloud_backup_interest.profile_id
      and p.status = 'active'
  )
);

drop policy if exists "Clients can leave cloud backup interest list"
  on public.cloud_backup_interest;
create policy "Clients can leave cloud backup interest list"
on public.cloud_backup_interest
for delete
to authenticated
using (
  (select private.can_access_profile(profile_id))
  and exists (
    select 1 from public.profiles p
    where p.id = cloud_backup_interest.profile_id
      and p.status = 'active'
  )
);

drop policy if exists "lanvac_zones_select" on public.lanvac_zones;
create policy "lanvac_zones_select" on public.lanvac_zones
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.can_access_profile(profile_id))
  );

drop policy if exists "lanvac_account_state_select" on public.lanvac_account_state;
create policy "lanvac_account_state_select" on public.lanvac_account_state
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.can_access_profile(profile_id))
  );

drop policy if exists "lanvac_signals_select" on public.lanvac_signals;
create policy "lanvac_signals_select" on public.lanvac_signals
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.can_access_profile(profile_id))
  );

-- ---------------------------------------------------------------------------
-- Caller-ID RPC: membership check inside the function (not only child RLS)
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
  v_reordered jsonb;
  v_change_id uuid := gen_random_uuid();
begin
  if not (
    (select private.is_admin())
    or (select private.can_access_profile(p_profile_id))
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

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

-- Hosted auto-grants; local Postgres after start/reset does not. Authenticated
-- needs DML so RLS policies can run (admin insert/update; client select).
grant select, insert, update, delete on table public.accounts to authenticated, service_role;
grant select, insert, update, delete on table public.account_members to authenticated, service_role;
