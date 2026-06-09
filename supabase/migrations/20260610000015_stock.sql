-- ─── stock_items ──────────────────────────────────────────────────────────────

create table stock_items (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  catalog_item_id   uuid references catalog_items(id) on delete set null,
  name              text not null,
  sku               text not null default '',
  category          text not null default 'misc',
  description       text not null default '',
  unit_cost         numeric(10,2) not null default 0,
  unit_of_measure   text not null default 'ea',
  manufacturer_name text not null default '',
  location_bin      text not null default '',
  qty_on_hand       integer not null default 0,
  min_stock_level   integer not null default 0,
  max_stock_level   integer not null default 0,
  image_url         text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table stock_items enable row level security;

create policy "stock_items_select" on stock_items
  for select using (tenant_id = current_tenant_id());

create policy "stock_items_insert" on stock_items
  for insert with check (tenant_id = current_tenant_id());

create policy "stock_items_update" on stock_items
  for update using (tenant_id = current_tenant_id());

create policy "stock_items_delete" on stock_items
  for delete using (tenant_id = current_tenant_id());

create trigger set_stock_items_updated_at
  before update on stock_items
  for each row execute function set_updated_at();

-- ─── stock_movements ──────────────────────────────────────────────────────────

create table stock_movements (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  stock_item_id uuid not null references stock_items(id) on delete cascade,
  type          text not null check (type in ('received', 'consumed', 'adjusted', 'returned')),
  qty_delta     integer not null,
  note          text,
  job_reference text,
  created_by    uuid references user_profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table stock_movements enable row level security;

create policy "stock_movements_select" on stock_movements
  for select using (tenant_id = current_tenant_id());

create policy "stock_movements_insert" on stock_movements
  for insert with check (tenant_id = current_tenant_id());
