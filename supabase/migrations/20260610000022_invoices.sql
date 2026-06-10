-- invoices, invoice_line_items, invoice_payments tables + RLS

-- ── invoices ──────────────────────────────────────────────────────────────────

create table invoices (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenants(id) on delete cascade,
  invoice_number       text not null,
  status               text not null default 'draft'
                         check (status in ('draft','sent','partial','paid','overdue','void')),
  company_id           uuid references companies(id) on delete set null,
  contact_id           uuid references contacts(id) on delete set null,
  linked_project_id    uuid references projects(id) on delete set null,
  linked_work_order_id uuid references work_orders(id) on delete set null,
  company_name         text not null default '',
  contact_name         text not null default '',
  issued_date          date not null,
  due_date             date not null,
  payment_terms        text not null default 'Net 30',
  subtotal             numeric(12,2) not null default 0,
  tax_rate             numeric(6,4)  not null default 0,
  tax_amount           numeric(12,2) not null default 0,
  total                numeric(12,2) not null default 0,
  amount_paid          numeric(12,2) not null default 0,
  balance_due          numeric(12,2) not null default 0,
  notes                text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── invoice_line_items ────────────────────────────────────────────────────────

create table invoice_line_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  description text not null,
  qty         numeric(10,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  total       numeric(12,2) not null default 0,
  sort_order  integer not null default 0
);

-- ── invoice_payments ──────────────────────────────────────────────────────────

create table invoice_payments (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  invoice_id  uuid not null references invoices(id) on delete cascade,
  date        date not null,
  amount      numeric(12,2) not null,
  method      text not null check (method in ('check','ach','credit_card','wire','cash')),
  reference   text not null default '',
  created_at  timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table invoice_payments enable row level security;

create policy "tenant_select" on invoices for select using (tenant_id = current_tenant_id());
create policy "tenant_insert" on invoices for insert with check (tenant_id = current_tenant_id());
create policy "tenant_update" on invoices for update using (tenant_id = current_tenant_id());
create policy "tenant_delete" on invoices for delete using (tenant_id = current_tenant_id());

-- line items: access via parent invoice tenant check
create policy "tenant_select" on invoice_line_items for select
  using (exists (select 1 from invoices i where i.id = invoice_id and i.tenant_id = current_tenant_id()));
create policy "tenant_insert" on invoice_line_items for insert
  with check (exists (select 1 from invoices i where i.id = invoice_id and i.tenant_id = current_tenant_id()));
create policy "tenant_delete" on invoice_line_items for delete
  using (exists (select 1 from invoices i where i.id = invoice_id and i.tenant_id = current_tenant_id()));

-- payments: direct tenant_id
create policy "tenant_select" on invoice_payments for select using (tenant_id = current_tenant_id());
create policy "tenant_insert" on invoice_payments for insert with check (tenant_id = current_tenant_id());
create policy "tenant_delete" on invoice_payments for delete using (tenant_id = current_tenant_id());

-- ── updated_at trigger ────────────────────────────────────────────────────────

create trigger set_invoices_updated_at
  before update on invoices
  for each row execute procedure set_updated_at();
