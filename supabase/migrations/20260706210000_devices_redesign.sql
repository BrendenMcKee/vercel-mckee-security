-- Devices redesign (stakeholder round 3): tracked equipment is an open,
-- admin-managed list instead of a fixed battery + smoke detector pair.
-- Each device gets a custom name and its own replacement interval in years;
-- accounts start with no devices and admins add what they want reminders for.
-- Existing rows are migrated from the old enum before it is dropped.

alter table public.devices
  add column label text,
  add column lifetime_years integer;

update public.devices set
  label = case device_type
    when 'battery' then 'Alarm Backup Battery'
    else 'Smoke Detector'
  end,
  lifetime_years = case device_type
    when 'battery' then 5
    else 10
  end;

alter table public.devices
  alter column label set not null,
  alter column lifetime_years set not null;

alter table public.devices
  add constraint devices_label_length
    check (char_length(btrim(label)) between 1 and 80),
  add constraint devices_lifetime_years_valid
    check (lifetime_years between 1 and 50);

alter table public.devices
  drop constraint devices_profile_id_device_type_key;

alter table public.devices drop column device_type;

drop type public.device_type;

-- Admins can now remove devices they no longer track (there was no DELETE
-- policy before because the battery/smoke pair was fixed).
create policy "devices_admin_delete" on public.devices
  for delete to authenticated
  using ((select private.is_admin()));
