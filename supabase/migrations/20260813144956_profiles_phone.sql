-- Account phone on profiles (client Settings + admin create/edit).
-- Clients still have no UPDATE policy; the settings action writes via service role.
alter table public.profiles
  add column if not exists phone text;

comment on column public.profiles.phone is
  'Account phone number, stored as NANP E.164 when set.';
