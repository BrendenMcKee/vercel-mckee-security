-- Staff may delete a grouping suggestion that failed to persist its sites,
-- so a broken fingerprint does not block the queue.

drop policy if exists "account_group_suggestions_admin_delete"
  on public.account_group_suggestions;
create policy "account_group_suggestions_admin_delete"
  on public.account_group_suggestions
  for delete to authenticated
  using ((select private.is_admin()));

grant delete on public.account_group_suggestions to authenticated, service_role;
