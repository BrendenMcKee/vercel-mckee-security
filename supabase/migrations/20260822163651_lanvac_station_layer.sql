-- R54 station layer cache (PORTAL_PLAN.md / docs/LANVAC_STATION.md).
-- Lanvac is the system of record for Historic. These tables are a per-site
-- cache keyed by profile_id so R53 is a helper swap, not a rewrite.
-- Authenticated clients may SELECT own zones / state / signals. They cannot
-- INSERT, UPDATE, or DELETE. Service role writes after a server pull.
-- Events are admin-readable and append-only.

-- ---------------------------------------------------------------------------
-- lanvac_zones: what the station thinks the sensors are (not portal devices).
-- Write-only fields stay null until the later O5985 write sitting.
-- ---------------------------------------------------------------------------
create table public.lanvac_zones (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  zone_number integer not null,
  description text not null default '',
  zone_type text not null default '',
  on_test boolean not null default false,
  use_call_list boolean,
  delay integer,
  notify_list jsonb not null default '[]'::jsonb,
  signal_code text,
  restore_code text,
  last_synced_at timestamptz not null default now(),
  unique (profile_id, zone_number),
  constraint lanvac_zones_number_range check (zone_number between 1 and 999),
  constraint lanvac_zones_delay_range check (delay is null or delay between 1 and 999),
  constraint lanvac_zones_description_length check (char_length(description) <= 200),
  constraint lanvac_zones_type_length check (char_length(zone_type) <= 80)
);

create index lanvac_zones_profile_id_idx on public.lanvac_zones (profile_id);

comment on table public.lanvac_zones is
  'Cached Lanvac zone list per site. Portal devices stay a separate replacement list.';

-- ---------------------------------------------------------------------------
-- lanvac_account_state: one row per site. last-known chip inputs.
-- ---------------------------------------------------------------------------
create table public.lanvac_account_state (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  panel_type text not null default '',
  is_disabled boolean not null default false,
  on_test_until timestamptz,
  last_signal_at timestamptz,
  last_signal_class text,
  last_signal_description text,
  last_synced_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),
  constraint lanvac_account_state_class_valid check (
    last_signal_class is null
    or last_signal_class in (
      'alarm', 'restore', 'comm_restore', 'open_close', 'on_test', 'ops', 'unknown'
    )
  )
);

create trigger lanvac_account_state_set_updated_at
  before update on public.lanvac_account_state
  for each row execute function private.set_updated_at();

comment on table public.lanvac_account_state is
  'Last-known Lanvac account chip (disabled / on test / last signal). Not a live console.';

-- ---------------------------------------------------------------------------
-- lanvac_signals: last Historic page. Lanvac remains SoR.
-- ---------------------------------------------------------------------------
create table public.lanvac_signals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  occurred_at timestamptz not null,
  occurred_at_text text not null default '',
  signal text not null default '',
  description text not null default '',
  signal_class text not null default 'unknown',
  sort_index integer not null default 0,
  last_synced_at timestamptz not null default now(),
  constraint lanvac_signals_class_valid check (
    signal_class in (
      'alarm', 'restore', 'comm_restore', 'open_close', 'on_test', 'ops', 'unknown'
    )
  )
);

create index lanvac_signals_profile_sort_idx
  on public.lanvac_signals (profile_id, sort_index);

comment on table public.lanvac_signals is
  'Cached last Historic page per site. Color class is derived; Lanvac is SoR.';

-- ---------------------------------------------------------------------------
-- lanvac_station_events: append-only audit. No UPDATE or DELETE policy.
-- ---------------------------------------------------------------------------
create table public.lanvac_station_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  lanvac_account_code text,
  actor_user_id uuid,
  actor_email text,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint lanvac_station_events_type_valid check (
    event_type in (
      'pull', 'pull_failed', 'zone_write', 'on_test', 'off_test', 'code_change'
    )
  )
);

create index lanvac_station_events_profile_id_idx
  on public.lanvac_station_events (profile_id, created_at desc);

comment on table public.lanvac_station_events is
  'Append-only station audit (pulls, later writes, on/off test, CODE change).';

-- ---------------------------------------------------------------------------
-- RLS. Single permissive policy per action (lint 0006). Writes are service
-- role only, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.lanvac_zones enable row level security;
alter table public.lanvac_account_state enable row level security;
alter table public.lanvac_signals enable row level security;
alter table public.lanvac_station_events enable row level security;

create policy "lanvac_zones_select" on public.lanvac_zones
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  );

create policy "lanvac_account_state_select" on public.lanvac_account_state
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  );

create policy "lanvac_signals_select" on public.lanvac_signals
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  );

create policy "lanvac_station_events_admin_select" on public.lanvac_station_events
  for select to authenticated
  using ((select private.is_admin()));
