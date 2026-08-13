-- Monitoring is always invoiced annually (site terms / R26). The admin
-- interval picker used to offer monthly; lock it the same way VoIP is
-- locked to monthly.

update public.services
set billing_interval = 'annual'
where service_type = 'monitoring'
  and billing_interval <> 'annual';

alter table public.services
  drop constraint if exists services_monitoring_annual;

alter table public.services
  add constraint services_monitoring_annual check (
    service_type <> 'monitoring'
    or billing_interval = 'annual'
  );
