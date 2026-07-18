-- One SELECT policy avoids evaluating two permissive policies for every read
-- while preserving the exact client-own/admin-all access model.
drop policy if exists "Clients can view own cloud backup interest"
  on public.cloud_backup_interest;
drop policy if exists "Admins can view cloud backup interest"
  on public.cloud_backup_interest;

create policy "Authorized users can view cloud backup interest"
on public.cloud_backup_interest
for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.profiles p
    where p.id = cloud_backup_interest.profile_id
      and p.user_id = (select auth.uid())
      and p.status = 'active'
  )
);
