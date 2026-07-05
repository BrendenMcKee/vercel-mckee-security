-- admin_create_client: treat empty-string tier args as "not provided", matching
-- how the email/address args are normalized. The generated PostgREST arg types
-- are non-nullable strings, so callers pass '' rather than null.
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
  v_monitoring_tier text := nullif(trim(p_monitoring_tier), '');
  v_cloud_tier text := nullif(trim(p_cloud_tier), '');
begin
  insert into public.profiles (first_name, last_name, email, address)
  values (p_first_name, p_last_name, lower(nullif(trim(p_email), '')), nullif(trim(p_address), ''))
  returning id into v_profile_id;

  if v_monitoring_tier is not null then
    insert into public.services (profile_id, service_type, tier)
    values (v_profile_id, 'monitoring', v_monitoring_tier);
  end if;

  if v_cloud_tier is not null then
    insert into public.services (profile_id, service_type, tier)
    values (v_profile_id, 'cloud_backup', v_cloud_tier);
  end if;

  insert into public.invitations (profile_id, token_hash, target_email, created_by)
  values (v_profile_id, p_token_hash, lower(nullif(trim(p_target_email), '')), (select auth.uid()));

  return v_profile_id;
end;
$$;
