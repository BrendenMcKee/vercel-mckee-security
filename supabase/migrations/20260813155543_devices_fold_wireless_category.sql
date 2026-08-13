-- Fold wireless_device into device_battery. Battery maintenance on wireless
-- sensors (motion, door, smoke/CO batteries) is the same category. Smoke/CO
-- detector units stay on `detector` because they expire on a different clock.

update public.devices
  set category = 'device_battery'
  where category = 'wireless_device';

alter table public.devices
  drop constraint devices_category_valid;

alter table public.devices
  add constraint devices_category_valid
    check (category in ('system_battery', 'device_battery', 'detector', 'other'));
