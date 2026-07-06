-- Phase 7: rate limiting (PORTAL_PLAN.md 6.6) + operational alerts surface
-- (handover 22.3: email send failures land somewhere an admin actually looks).

-- ---------------------------------------------------------------------------
-- Rate limits: small per-key counter in the unexposed private schema.
-- Consumed only through the SECURITY DEFINER RPC below, callable by the
-- service role alone (server actions call it with the admin client).
-- ---------------------------------------------------------------------------

create table private.rate_limits (
  key text primary key,
  hits integer not null default 0,
  window_started_at timestamptz not null default now()
);

create or replace function public.consume_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed boolean;
begin
  insert into private.rate_limits as rl (key, hits, window_started_at)
  values (p_key, 1, now())
  on conflict (key) do update set
    hits = case
      when rl.window_started_at < now() - make_interval(secs => p_window_seconds) then 1
      else rl.hits + 1
    end,
    window_started_at = case
      when rl.window_started_at < now() - make_interval(secs => p_window_seconds) then now()
      else rl.window_started_at
    end
  returning rl.hits <= p_max into v_allowed;

  return v_allowed;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer) from public;
revoke execute on function public.consume_rate_limit(text, integer, integer) from anon;
revoke execute on function public.consume_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- Called by the daily cleanup cron so the counter table never grows unbounded.
create or replace function public.cleanup_rate_limits() returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from private.rate_limits where window_started_at < now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.cleanup_rate_limits() from public;
revoke execute on function public.cleanup_rate_limits() from anon;
revoke execute on function public.cleanup_rate_limits() from authenticated;
grant execute on function public.cleanup_rate_limits() to service_role;

-- ---------------------------------------------------------------------------
-- Portal alerts: service-role-written operational failures (email sends,
-- webhook/cron errors) surfaced in the admin dashboard Alerts tab. Admins can
-- read and resolve; nobody edits the substance of an alert.
-- ---------------------------------------------------------------------------

create table public.portal_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

create index portal_alerts_open_idx on public.portal_alerts (created_at desc) where resolved_at is null;
create index portal_alerts_resolved_by_idx on public.portal_alerts (resolved_by);

alter table public.portal_alerts enable row level security;

create policy portal_alerts_admin_select on public.portal_alerts
  for select to authenticated
  using (private.is_admin());

-- Resolution only: admins may stamp resolved_at/resolved_by; inserts stay
-- service-role-only (no INSERT policy).
create policy portal_alerts_admin_update on public.portal_alerts
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());
