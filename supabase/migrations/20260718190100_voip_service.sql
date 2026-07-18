-- VoIP phone service plans + per-line billing (R42, stakeholder 2026-07-18).
-- Interim pricing while the tier structure settles (D14):
--   residential   Residential Unlimited Canada-Wide   $34.99/mo + tax
--   professional  VoIP Professional (per line)        $59.99/mo per line + tax
-- VoIP bills MONTHLY on either rail (unlike monitoring's annual invoicing).
-- line_count multiplies the per-line professional rate and becomes the Stripe
-- subscription quantity; monitoring and cloud backup keep the default of 1.

alter table public.services
  add column line_count integer not null default 1;

alter table public.services
  add constraint services_line_count_valid check (line_count >= 1 and line_count <= 100);

alter table public.services drop constraint services_tier_valid;
alter table public.services add constraint services_tier_valid check (
  (service_type = 'monitoring' and tier in ('landline', 'cellular', 'cellular_tc', 'cellular_tc_home'))
  or (service_type = 'cloud_backup' and tier in ('7day', '30day', '90day'))
  or (service_type = 'voip' and tier in ('residential', 'professional'))
);

-- admin_create_client gains an optional VoIP plan + line count. The new
-- parameters have defaults, so existing 8-argument callers (older deploys)
-- keep resolving to this same function.
drop function if exists public.admin_create_client(text, text, text, text, text, text, text, text);
create function public.admin_create_client(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_address text,
  p_monitoring_tier text,
  p_cloud_tier text,
  p_token_hash text,
  p_target_email text,
  p_voip_tier text default '',
  p_voip_lines integer default 1
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

  if nullif(trim(p_voip_tier), '') is not null then
    insert into public.services (profile_id, service_type, tier, line_count)
    values (v_profile_id, 'voip', p_voip_tier, greatest(coalesce(p_voip_lines, 1), 1));
  end if;

  insert into public.invitations (profile_id, token_hash, target_email, created_by)
  values (v_profile_id, p_token_hash, lower(nullif(trim(p_target_email), '')), (select auth.uid()));

  return v_profile_id;
end;
$$;
