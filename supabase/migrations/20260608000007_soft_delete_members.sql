-- Soft delete support for user_profiles
alter table user_profiles add column is_active boolean not null default true;

-- SELECT: only show active profiles within tenant
drop policy "profiles_select" on user_profiles;
create policy "profiles_select" on user_profiles
  for select using (tenant_id = current_tenant_id() and is_active = true);

-- UPDATE: allow any tenant member to update any profile in their tenant
-- (restricted to owner/admin roles when role permissions are wired up)
drop policy "profiles_update" on user_profiles;
create policy "profiles_update" on user_profiles
  for update using (tenant_id = current_tenant_id() and id != auth.uid());

-- Self-update (name, etc.) still allowed
create policy "profiles_update_self" on user_profiles
  for update using (id = auth.uid());

-- handle_new_user: upsert so re-inviting a removed user reactivates their profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id    uuid;
  assigned_role_id uuid;
begin
  if (new.raw_user_meta_data->>'tenant_id') is not null then
    new_tenant_id := (new.raw_user_meta_data->>'tenant_id')::uuid;

    select id into assigned_role_id
      from roles
      where tenant_id = new_tenant_id
        and name = coalesce(new.raw_user_meta_data->>'role_name', 'Technician')
      limit 1;

    if assigned_role_id is null then
      select id into assigned_role_id
        from roles where tenant_id = new_tenant_id and name = 'Admin'
        limit 1;
    end if;
  else
    insert into public.tenants (name)
      values (coalesce(new.raw_user_meta_data->>'company_name', 'My Company'))
      returning id into new_tenant_id;

    perform seed_default_roles(new_tenant_id);

    select id into assigned_role_id
      from roles where tenant_id = new_tenant_id and name = 'Owner'
      limit 1;
  end if;

  insert into public.user_profiles (id, tenant_id, full_name, role_id, email, is_active)
  values (
    new.id,
    new_tenant_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    assigned_role_id,
    new.email,
    true
  )
  on conflict (id) do update set
    tenant_id = excluded.tenant_id,
    role_id   = excluded.role_id,
    full_name = excluded.full_name,
    is_active = true;

  return new;
end;
$$;
