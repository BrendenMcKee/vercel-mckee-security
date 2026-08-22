-- Client-facing portal mail stays off until go-live (import + live QB file).
-- Admin mail (collections digest, card-failed, device expiry to staff) is
-- unchanged. PORTAL_PLAN.md 9.5.5 / Phase 8C human flip.

create table public.portal_settings (
  id integer primary key default 1,
  client_mail_enabled boolean not null default false,
  client_mail_enabled_at timestamptz,
  client_mail_enabled_by uuid,
  updated_at timestamptz not null default now(),
  constraint portal_settings_singleton check (id = 1)
);

create trigger portal_settings_set_updated_at
  before update on public.portal_settings
  for each row execute function private.set_updated_at();

insert into public.portal_settings (id, client_mail_enabled)
values (1, false);

comment on table public.portal_settings is
  'Singleton ops flags. client_mail_enabled stays false through import; flip only at 8C go-live.';

alter table public.portal_settings enable row level security;

create policy "portal_settings_admin_select" on public.portal_settings
  for select to authenticated
  using ((select private.is_admin()));

create policy "portal_settings_admin_update" on public.portal_settings
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
