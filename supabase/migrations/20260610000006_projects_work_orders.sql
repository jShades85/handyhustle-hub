-- ─── Projects ─────────────────────────────────────────────────────────────────
-- A project is a multi-visit, multi-phase job converted from a closed-won
-- opportunity (or created manually). Work orders are child tasks of a project
-- or standalone single-visit jobs.

create table projects (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  code            text,
  name            text not null,
  company_id      uuid references companies(id) on delete set null,
  contact_id      uuid references contacts(id) on delete set null,
  opportunity_id  uuid references opportunities(id) on delete set null,
  site_address    text,
  status          text not null default 'scheduled'
    check (status in ('quoted','scheduled','in-progress','on-hold','completed','cancelled')),
  contract_value  numeric(12,2),
  budgeted_cost   numeric(12,2),
  budgeted_hours  numeric(8,2),
  start_date      date,
  target_end_date date,
  pm_id           uuid references user_profiles(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now()
);

alter table projects enable row level security;

create policy "projects_select" on projects
  for select using (tenant_id = current_tenant_id());
create policy "projects_insert" on projects
  for insert with check (tenant_id = current_tenant_id());
create policy "projects_update" on projects
  for update using (tenant_id = current_tenant_id());
create policy "projects_delete" on projects
  for delete using (tenant_id = current_tenant_id());

-- ─── Work Orders ──────────────────────────────────────────────────────────────
-- Standalone single-visit jobs (converted from opportunity with no quote phases,
-- or no quote attached) OR child tasks dispatched under a project.

create table work_orders (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  code            text,
  name            text not null,
  company_id      uuid references companies(id) on delete set null,
  contact_id      uuid references contacts(id) on delete set null,
  opportunity_id  uuid references opportunities(id) on delete set null,
  project_id      uuid references projects(id) on delete set null,
  site_address    text,
  status          text not null default 'scheduled'
    check (status in ('scheduled','in-progress','on-hold','completed','cancelled')),
  contract_value  numeric(12,2),
  budgeted_cost   numeric(12,2),
  budgeted_hours  numeric(8,2),
  scheduled_date  date,
  assigned_to     uuid references user_profiles(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now()
);

alter table work_orders enable row level security;

create policy "work_orders_select" on work_orders
  for select using (tenant_id = current_tenant_id());
create policy "work_orders_insert" on work_orders
  for insert with check (tenant_id = current_tenant_id());
create policy "work_orders_update" on work_orders
  for update using (tenant_id = current_tenant_id());
create policy "work_orders_delete" on work_orders
  for delete using (tenant_id = current_tenant_id());
