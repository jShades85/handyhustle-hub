-- ─── App Module Enum ──────────────────────────────────────────────────────────
create type app_module as enum (
  'crm',
  'sales',
  'finance',
  'operations',
  'service',
  'inventory',
  'reports',
  'settings'
);

-- ─── Role Permissions ─────────────────────────────────────────────────────────
-- One row per role+module combo. Absence of a row = no access.
create table role_permissions (
  id        uuid primary key default gen_random_uuid(),
  role_id   uuid not null references roles(id) on delete cascade,
  module    app_module not null,
  can_write boolean not null default false,
  unique (role_id, module)
);

create index role_permissions_role_id_idx on role_permissions (role_id);

alter table role_permissions enable row level security;

create policy "role_permissions_select" on role_permissions
  for select using (
    exists (
      select 1 from roles r
      where r.id = role_id and r.tenant_id = current_tenant_id()
    )
  );

create policy "role_permissions_insert" on role_permissions
  for insert with check (
    exists (
      select 1 from roles r
      where r.id = role_id and r.tenant_id = current_tenant_id()
    )
  );

create policy "role_permissions_update" on role_permissions
  for update using (
    exists (
      select 1 from roles r
      where r.id = role_id and r.tenant_id = current_tenant_id()
    )
  );

create policy "role_permissions_delete" on role_permissions
  for delete using (
    exists (
      select 1 from roles r
      where r.id = role_id and r.tenant_id = current_tenant_id()
    )
  );

-- ─── Make tier nullable so re-seeding can insert without it ─────────────────
alter table roles alter column tier drop not null;

-- ─── Updated seed_default_roles ───────────────────────────────────────────────
create or replace function seed_default_roles(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r_owner     uuid;
  r_admin     uuid;
  r_sales     uuid;
  r_dispatch  uuid;
  r_finance   uuid;
  r_service   uuid;
  r_warehouse uuid;
  r_tech      uuid;
  r_readonly  uuid;
  all_modules app_module[] := array[
    'crm','sales','finance','operations','service','inventory','reports','settings'
  ]::app_module[];
  m app_module;
begin
  insert into roles (tenant_id, name, color, is_default)
    values (p_tenant_id, 'Owner', '#8b5cf6', true) returning id into r_owner;
  insert into roles (tenant_id, name, color, is_default)
    values (p_tenant_id, 'Admin', '#6366f1', true) returning id into r_admin;
  insert into roles (tenant_id, name, color, is_default)
    values (p_tenant_id, 'Sales Rep', '#0ea5e9', true) returning id into r_sales;
  insert into roles (tenant_id, name, color, is_default)
    values (p_tenant_id, 'Dispatcher', '#06b6d4', true) returning id into r_dispatch;
  insert into roles (tenant_id, name, color, is_default)
    values (p_tenant_id, 'Finance', '#10b981', true) returning id into r_finance;
  insert into roles (tenant_id, name, color, is_default)
    values (p_tenant_id, 'Service Coordinator', '#f59e0b', true) returning id into r_service;
  insert into roles (tenant_id, name, color, is_default)
    values (p_tenant_id, 'Warehouse Staff', '#f97316', true) returning id into r_warehouse;
  insert into roles (tenant_id, name, color, is_default)
    values (p_tenant_id, 'Technician', '#84cc16', true) returning id into r_tech;
  insert into roles (tenant_id, name, color, is_default)
    values (p_tenant_id, 'View Only', '#94a3b8', true) returning id into r_readonly;

  -- Owner: all modules, read/write
  foreach m in array all_modules loop
    insert into role_permissions (role_id, module, can_write) values (r_owner, m, true);
  end loop;

  -- Admin: all modules, read/write
  foreach m in array all_modules loop
    insert into role_permissions (role_id, module, can_write) values (r_admin, m, true);
  end loop;

  -- Sales Rep: CRM (rw), Sales (rw)
  insert into role_permissions (role_id, module, can_write) values
    (r_sales, 'crm',   true),
    (r_sales, 'sales', true);

  -- Dispatcher: Operations (rw), CRM (r)
  insert into role_permissions (role_id, module, can_write) values
    (r_dispatch, 'operations', true),
    (r_dispatch, 'crm',        false);

  -- Finance: Finance (rw), Reports (r), Sales (r)
  insert into role_permissions (role_id, module, can_write) values
    (r_finance, 'finance', true),
    (r_finance, 'reports', false),
    (r_finance, 'sales',   false);

  -- Service Coordinator: Service (rw), CRM (r)
  insert into role_permissions (role_id, module, can_write) values
    (r_service, 'service', true),
    (r_service, 'crm',     false);

  -- Warehouse Staff: Inventory (rw)
  insert into role_permissions (role_id, module, can_write) values
    (r_warehouse, 'inventory', true);

  -- Technician: Operations (rw), Inventory (r)
  insert into role_permissions (role_id, module, can_write) values
    (r_tech, 'operations', true),
    (r_tech, 'inventory',  false);

  -- View Only: all modules, read only
  foreach m in array all_modules loop
    insert into role_permissions (role_id, module, can_write) values (r_readonly, m, false);
  end loop;
end;
$$;

-- ─── Re-seed existing tenants ─────────────────────────────────────────────────
do $$
declare
  t            record;
  new_owner_id uuid;
begin
  for t in select id from tenants loop
    delete from roles where tenant_id = t.id;
    perform seed_default_roles(t.id);

    select id into new_owner_id
      from roles where tenant_id = t.id and name = 'Owner'
      limit 1;

    update user_profiles set role_id = new_owner_id where tenant_id = t.id;
  end loop;
end;
$$;

-- ─── Drop tier from roles ─────────────────────────────────────────────────────
alter table roles drop column tier;
drop type permission_tier;

-- ─── Updated handle_new_user trigger ─────────────────────────────────────────
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

  insert into public.user_profiles (id, tenant_id, full_name, role_id)
  values (
    new.id,
    new_tenant_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    assigned_role_id
  );

  return new;
end;
$$;
