-- Consolidate update policies — single permissive policy for the whole tenant.
-- The id != auth.uid() restriction caused silent RLS failures on soft-delete.
drop policy if exists "profiles_update"      on user_profiles;
drop policy if exists "profiles_update_self" on user_profiles;

create policy "profiles_update" on user_profiles
  for update using (tenant_id = current_tenant_id());
