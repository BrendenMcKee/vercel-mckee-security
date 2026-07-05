-- Dummy-proof auth (stakeholder 2026-07-05): every client must end up with a
-- password even when they activate via Google, so "I don't know my password"
-- can never lock anyone out. The dashboard gate forces password setup for
-- client profiles where this stamp is null.
alter table public.profiles add column password_set_at timestamptz;

-- Backfill: users that already have a password (password-path activations,
-- seeded test users) should not be prompted again.
update public.profiles p
set password_set_at = now()
from auth.users u
where p.user_id = u.id
  and u.encrypted_password is not null
  and u.encrypted_password <> '';
