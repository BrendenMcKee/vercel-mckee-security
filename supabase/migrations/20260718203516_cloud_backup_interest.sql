-- Explicit opt-in list for the future Camera Cloud Backup service.
-- A row exists only while the client has consented to receive launch updates.
create table public.cloud_backup_interest (
  profile_id uuid primary key
    references public.profiles(id) on delete cascade,
  email text not null
    check (char_length(btrim(email)) between 3 and 320),
  consent_version text not null default 'cloud_backup_updates_v1'
    check (consent_version = 'cloud_backup_updates_v1'),
  consented_at timestamptz not null default now()
);

comment on table public.cloud_backup_interest is
  'Clients who explicitly opted in to Camera Cloud Backup availability updates.';

alter table public.cloud_backup_interest enable row level security;

-- Data API access is explicit: anonymous users get nothing; signed-in users
-- can only manage their own consent row, while admins can read the full list.
revoke all on table public.cloud_backup_interest from anon;
grant select, insert, delete on table public.cloud_backup_interest to authenticated;
grant all on table public.cloud_backup_interest to service_role;

create policy "Clients can view own cloud backup interest"
on public.cloud_backup_interest
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = cloud_backup_interest.profile_id
      and p.user_id = (select auth.uid())
      and p.status = 'active'
  )
);

create policy "Clients can join cloud backup interest list"
on public.cloud_backup_interest
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = cloud_backup_interest.profile_id
      and p.user_id = (select auth.uid())
      and p.status = 'active'
      and lower(btrim(p.email)) = lower(btrim(cloud_backup_interest.email))
  )
);

create policy "Clients can leave cloud backup interest list"
on public.cloud_backup_interest
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = cloud_backup_interest.profile_id
      and p.user_id = (select auth.uid())
      and p.status = 'active'
  )
);

create policy "Admins can view cloud backup interest"
on public.cloud_backup_interest
for select
to authenticated
using ((select private.is_admin()));
