-- Write-only zone fields stay off lanvac_zones (JWT SELECT is auto-granted
-- on public tables). Service role writes. Admins may SELECT for the edit
-- form. Clients have no policy.

create table public.lanvac_zone_write (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  zone_number integer not null,
  delay integer not null default 1,
  notify_list jsonb not null default '[]'::jsonb,
  signal_code text,
  restore_code text,
  updated_at timestamptz not null default now(),
  primary key (profile_id, zone_number),
  constraint lanvac_zone_write_zones_fkey
    foreign key (profile_id, zone_number)
    references public.lanvac_zones (profile_id, zone_number)
    on delete cascade,
  constraint lanvac_zone_write_delay_range check (delay between 1 and 999),
  constraint lanvac_zone_write_signal_code check (
    signal_code is null or signal_code ~ '^[A-Z0-9]{6}$'
  ),
  constraint lanvac_zone_write_restore_code check (
    restore_code is null or restore_code ~ '^[A-Z0-9]{6}$'
  )
);

create index lanvac_zone_write_profile_id_idx
  on public.lanvac_zone_write (profile_id);

create trigger lanvac_zone_write_set_updated_at
  before update on public.lanvac_zone_write
  for each row execute function private.set_updated_at();

comment on table public.lanvac_zone_write is
  'Lanvac zone write fields (delay, extra notify, codes). Not on the public zone cache.';

alter table public.lanvac_zone_write enable row level security;

create policy "lanvac_zone_write_admin_select" on public.lanvac_zone_write
  for select to authenticated
  using ((select private.is_admin()));
