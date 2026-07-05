-- Real monitoring products (stakeholder pricing 2026-07-05, names from the
-- live site's monitoring section):
--   landline          Telephone Land Line                       $24.95/mo + tax
--   cellular          Cellular Communicator                     $34.95/mo + tax
--   cellular_tc       Cellular + Total Connect 2.0              $39.95/mo + tax
--   cellular_tc_home  Cellular + Total Connect Home Automation  $44.95/mo + tax
-- All monitoring is invoiced ANNUALLY (site disclaimer), so services gain a
-- billing_interval; cloud backup stays monthly by default.

-- The enum is not bound to any column (services.tier is text + CHECK), so it
-- can be swapped in place.
drop type public.monitoring_tier;
create type public.monitoring_tier as enum ('landline', 'cellular', 'cellular_tc', 'cellular_tc_home');

create type public.billing_interval as enum ('monthly', 'annual');

alter table public.services
  add column billing_interval public.billing_interval not null default 'monthly';

-- Drop the old CHECK first: the rename below would violate it.
alter table public.services drop constraint services_tier_valid;

-- Migrate existing rows (placeholder mapping: basic->landline,
-- standard->cellular, pro->cellular_tc).
update public.services
set tier = case tier
  when 'basic' then 'landline'
  when 'standard' then 'cellular'
  when 'pro' then 'cellular_tc'
  else tier
end
where service_type = 'monitoring';

update public.services set billing_interval = 'annual' where service_type = 'monitoring';

alter table public.services add constraint services_tier_valid check (
  (service_type = 'monitoring' and tier in ('landline', 'cellular', 'cellular_tc', 'cellular_tc_home'))
  or (service_type = 'cloud_backup' and tier in ('7day', '30day', '90day'))
);

-- admin_create_client: monitoring services are invoiced annually from birth.
create or replace function public.admin_create_client(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_address text,
  p_monitoring_tier text,
  p_cloud_tier text,
  p_token_hash text,
  p_target_email text
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  insert into public.profiles (first_name, last_name, email, address)
  values (p_first_name, p_last_name, lower(nullif(trim(p_email), '')), nullif(trim(p_address), ''))
  returning id into v_profile_id;

  if nullif(trim(p_monitoring_tier), '') is not null then
    insert into public.services (profile_id, service_type, tier, billing_interval)
    values (v_profile_id, 'monitoring', p_monitoring_tier, 'annual');
  end if;

  if nullif(trim(p_cloud_tier), '') is not null then
    insert into public.services (profile_id, service_type, tier)
    values (v_profile_id, 'cloud_backup', p_cloud_tier);
  end if;

  insert into public.invitations (profile_id, token_hash, target_email, created_by)
  values (v_profile_id, p_token_hash, lower(nullif(trim(p_target_email), '')), (select auth.uid()));

  return v_profile_id;
end;
$$;
