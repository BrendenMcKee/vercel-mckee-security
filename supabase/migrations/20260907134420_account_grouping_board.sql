-- Staff grouping board (R53 slice 4). Suggestions are a review queue, never
-- an auto-merge. Accept attaches sites. Reject keeps the fingerprint so the
-- same set does not come back. Empty-queue sign-off is portal_settings.org_grouping_reviewed_at.

create table public.account_group_suggestions (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  status text not null default 'open',
  suggested_name text not null,
  fingerprint text not null,
  accepted_account_id uuid references public.accounts (id) on delete set null,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_group_suggestions_kind_valid check (
    kind in ('same_name', 'same_email', 'qb_parent')
  ),
  constraint account_group_suggestions_status_valid check (
    status in ('open', 'accepted', 'rejected', 'resolved')
  )
);

create unique index account_group_suggestions_fingerprint_idx
  on public.account_group_suggestions (fingerprint);

create index account_group_suggestions_status_idx
  on public.account_group_suggestions (status, created_at desc);

create trigger account_group_suggestions_set_updated_at
  before update on public.account_group_suggestions
  for each row execute function private.set_updated_at();

comment on table public.account_group_suggestions is
  'Human review queue for sites that might belong on one account. Accept attaches. Reject dismisses.';

create table public.account_group_suggestion_sites (
  suggestion_id uuid not null references public.account_group_suggestions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (suggestion_id, profile_id)
);

create index account_group_suggestion_sites_profile_idx
  on public.account_group_suggestion_sites (profile_id);

comment on table public.account_group_suggestion_sites is
  'Sites listed on one grouping suggestion.';

alter table public.account_group_suggestions enable row level security;
alter table public.account_group_suggestion_sites enable row level security;

create policy "account_group_suggestions_admin_select"
  on public.account_group_suggestions
  for select to authenticated
  using ((select private.is_admin()));

create policy "account_group_suggestions_admin_insert"
  on public.account_group_suggestions
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "account_group_suggestions_admin_update"
  on public.account_group_suggestions
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "account_group_suggestion_sites_admin_select"
  on public.account_group_suggestion_sites
  for select to authenticated
  using ((select private.is_admin()));

create policy "account_group_suggestion_sites_admin_insert"
  on public.account_group_suggestion_sites
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "account_group_suggestion_sites_admin_delete"
  on public.account_group_suggestion_sites
  for delete to authenticated
  using ((select private.is_admin()));

-- Moving a site off its last account must drop that empty account, same as delete.
drop trigger if exists profiles_move_delete_empty_account on public.profiles;
create trigger profiles_move_delete_empty_account
  after update of account_id on public.profiles
  for each row
  when (old.account_id is distinct from new.account_id)
  execute function private.delete_empty_account();

grant select, insert, update on public.account_group_suggestions to authenticated, service_role;
grant select, insert, delete on public.account_group_suggestion_sites to authenticated, service_role;

-- Staff may delete an account they just created if attach fails before sites move.
-- Non-empty accounts stay blocked by profiles.account_id.
drop policy if exists "accounts_admin_delete" on public.accounts;
create policy "accounts_admin_delete"
  on public.accounts
  for delete to authenticated
  using ((select private.is_admin()));
