create table service_tickets (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null references tenants(id),
  code            text,
  company_id      uuid        references companies(id),
  contact_id      uuid        references contacts(id),
  customer_name   text,
  contact_name    text,
  phone           text,
  site_address    text,
  issue           text        not null,
  category        text        not null default 'General',
  priority        text        not null default 'medium'
                    check (priority in ('urgent','high','medium','low')),
  status          text        not null default 'open'
                    check (status in ('open','assigned','in-progress','pending-parts','resolved','closed')),
  assigned_to     uuid        references user_profiles(id),
  on_service_plan boolean     not null default false,
  due_date        date,
  notes           text,
  created_at      timestamptz not null default now()
);

alter table service_tickets enable row level security;

create policy "tenant_select" on service_tickets
  for select using (tenant_id = current_tenant_id());

create policy "tenant_insert" on service_tickets
  for insert with check (tenant_id = current_tenant_id());

create policy "tenant_update" on service_tickets
  for update using (tenant_id = current_tenant_id());

create policy "tenant_delete" on service_tickets
  for delete using (tenant_id = current_tenant_id());
