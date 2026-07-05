-- Covering indexes for billing_events foreign keys (performance lint 0001).
create index billing_events_service_id_idx on public.billing_events (service_id);
create index billing_events_profile_id_idx on public.billing_events (profile_id);
