-- Hosted auto-grants table DML to JWT roles, which restored SELECT on
-- delay / notify_list / signal_code / restore_code after the column revoke.
-- Those fields are unused until the write sitting. Drop them from the
-- public cache so a client JWT cannot read them. The write sitting will
-- add a service-role-only table, not put them back on lanvac_zones.

alter table public.lanvac_zones
  drop column if exists delay,
  drop column if exists notify_list,
  drop column if exists signal_code,
  drop column if exists restore_code;
