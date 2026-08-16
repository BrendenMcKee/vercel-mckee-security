-- Station identity for Lanvac. People stay in caller_id_contacts.
-- Police / fire / ambulance are not portal contacts; they come from lanvac_city
-- at API write (usePoliceNumbers + policeNumbersCity).

alter table public.profiles
  add column lanvac_account_code text,
  add column lanvac_city text;

alter table public.profiles
  add constraint profiles_lanvac_account_code_format
    check (
      lanvac_account_code is null
      or lanvac_account_code ~ '^[0-9A-Za-z]{1,2}[0-9A-Fa-f]{4}$'
    );

alter table public.profiles
  add constraint profiles_lanvac_city_length
    check (lanvac_city is null or length(lanvac_city) between 1 and 240);

create unique index profiles_lanvac_account_code_unique
  on public.profiles (upper(lanvac_account_code))
  where lanvac_account_code is not null;

comment on column public.profiles.lanvac_account_code is
  'Lanvac account CODE (e.g. O5985). Required later for EmergencyContact writes.';

comment on column public.profiles.lanvac_city is
  'Exact Lanvac CITY string for policeNumbersCity (e.g. Haliburton - On).';
