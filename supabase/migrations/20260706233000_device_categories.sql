-- Device categories (stakeholder round 4): every tracked device belongs to a
-- fixed category so admins can filter expiring equipment by kind (all smoke
-- detectors, all system batteries) instead of scanning free-text names.
-- The name stays free text; only the category is constrained.

alter table public.devices
  add column category text not null default 'other';

alter table public.devices
  add constraint devices_category_valid
    check (category in ('system_battery', 'device_battery', 'detector', 'wireless_device', 'other'));

-- Backfill existing rows from their labels. Order matters: device/keypad
-- batteries before the generic battery match.
update public.devices set category = case
  when label ilike '%smoke%' or label ilike '%carbon%' or label ilike '%detector%' then 'detector'
  when label ilike '%keypad%' or label ilike '%device%battery%' or label ilike '%sensor%battery%' then 'device_battery'
  when label ilike '%battery%' then 'system_battery'
  when label ilike '%motion%' or label ilike '%contact%' or label ilike '%wireless%' then 'wireless_device'
  else 'other'
end;

-- The old generic default name was wrong (stakeholder): panel batteries are
-- 4Ah or 7Ah security system batteries, not "alarm backup" batteries.
update public.devices
  set label = 'Security System Battery'
  where label = 'Alarm Backup Battery';
