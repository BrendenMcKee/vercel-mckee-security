-- VoIP rate card (R50 / company knowledge 3.12): one system, not per line.
-- number_count and seat_count replace line_count. Base includes 1 number +
-- 1 seat. Residential cannot add seats. port_count is one-time, not recurring.

alter table public.services
  add column number_count integer not null default 1,
  add column seat_count integer not null default 1,
  add column port_count integer not null default 0;

update public.services
set number_count = line_count
where service_type = 'voip';

alter table public.services
  drop constraint if exists services_line_count_valid;

alter table public.services
  drop column line_count;

alter table public.services
  add constraint services_number_count_valid check (number_count >= 1 and number_count <= 100),
  add constraint services_seat_count_valid check (seat_count >= 1 and seat_count <= 100),
  add constraint services_port_count_valid check (port_count >= 0 and port_count <= 100),
  add constraint services_voip_residential_seats check (
    service_type <> 'voip'
    or tier <> 'residential'
    or seat_count = 1
  );

drop function if exists public.admin_create_client(text, text, text, text, text, text, text, text);
drop function if exists public.admin_create_client(text, text, text, text, text, text, text, text, text, integer);

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
  p_voip_numbers integer default 1,
  p_voip_seats integer default 1,
  p_voip_ports integer default 0
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_numbers integer;
  v_seats integer;
  v_ports integer;
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
    v_numbers := greatest(coalesce(p_voip_numbers, 1), 1);
    v_seats := case
      when p_voip_tier = 'residential' then 1
      else greatest(coalesce(p_voip_seats, 1), 1)
    end;
    v_ports := greatest(coalesce(p_voip_ports, 0), 0);
    insert into public.services (
      profile_id, service_type, tier, number_count, seat_count, port_count
    )
    values (v_profile_id, 'voip', p_voip_tier, v_numbers, v_seats, v_ports);
  end if;

  insert into public.invitations (profile_id, token_hash, target_email, created_by)
  values (v_profile_id, p_token_hash, lower(nullif(trim(p_target_email), '')), (select auth.uid()));

  return v_profile_id;
end;
$$;

grant execute on function public.admin_create_client(text, text, text, text, text, text, text, text, text, integer, integer, integer) to anon, authenticated, service_role;
