-- Clients and staff JWTs must not read zone write-only fields via PostgREST.
-- Service role (server pull / later writes) still has full column access.

revoke select (delay, notify_list, signal_code, restore_code)
  on table public.lanvac_zones
  from public, anon, authenticated;
