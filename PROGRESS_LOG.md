# PROGRESS_LOG.md — BearingPro

> Read this + PROJECT_CONTEXT.md at the start of every session before touching code.

---

## Current Status

**Phase:** Backend — POs/Vendors live, Finance next
**Last Updated:** Session 032
**Live URL:** https://bearingpro.tech (Vercel + Cloudflare DNS)
**Supabase Project:** `erdtfwelbdlvammfdtgz`

---

## What's Next

**Start here next session:**

1. **Finance → Invoices / Payments** — next module to wire to backend

---

## Open Questions / Blockers

- Quote Builder deferred — needs backend (catalog + projects)
- Planner/Gantt deferred — needs backend (phases + team assignments)
- D-Tools SI integration: needs real license key from SI software (Control Panel → Manage Integrations)

---

## Module Status

| Module | Status | Notes |
|---|---|---|
| UI Shell / Layout | ✅ Complete | AppShell, sidebar, topbar, PageMetaContext |
| Theme System | ✅ Complete | Light/dark/system toggle, no flash |
| Dashboard | ✅ Complete (demo) | Owner dashboard, demo data |
| Auth | ✅ Complete | Login/signup, session guard, sign-out popover |
| Supabase Client | ✅ Complete | Browser + server clients, typed Database |
| DB: tenants + user_profiles | ✅ Live | RLS + handle_new_user trigger |
| Vercel Deployment | ✅ Live | bearingpro.tech, nitro vercel preset |
| CRM (Contacts/Companies/Lead Inbox) | ✅ Live | Schema + RLS live; all pages wired; Lead Inbox reads/writes `leads` table; Convert button creates Contact + Opportunity atomically |
| Sales (Opps, Quotes) | ✅ Opps live | Opportunities reads/writes DB; kanban stage moves + new opp modal wired; Quotes still demo |
| Operations (Projects, Work Orders, Team, Scheduling) | ✅ Projects + WOs live | Schema + RLS live; list + detail pages read/write DB; status persists; Edit drawer live (name, dates, PM, value); Convert from Opportunity wired; Team + Scheduling still demo |
| Service (Tickets, Plans) | ✅ Live | Tickets: status + notes + new ticket wired; Service Plans: schema + RLS live; 8 seed plans; all CRUD wired (tier/status inline, notes blur-save, Renew/Cancel, New Plan modal) |
| Inventory → Catalog | ✅ Live | Schema + RLS live; category landing + item grid wired; tenant-defined categories with trade templates + icon picker; CategorySetupModal on first visit; New Category / New Item context-aware button |
| Inventory → Stock | ✅ Live | Schema + RLS live; 12 seed items + 35 movements; all CRUD wired; Adjust popover writes to DB; movements lazy-loaded per item in drawer; manufacturers derived from live data |
| Inventory → POs, Vendors | ✅ Live | Schema + RLS live; 7 vendors + 11 POs seeded; all CRUD wired; vendor stats derived from shared PO cache; Send PO + Mark All Received quick actions; linkedJobId encoded as p:/w: |
| Finance (Invoices, Payments) | 🟡 Demo data | Full UI built |
| Reports | 🟡 Placeholder | 27-report catalog defined, all coming soon |
| Settings (Company, Tiers, Integrations) | ✅ Company live | Company Profile reads/writes `tenants` table; Tiers + Integrations still demo |
| Settings → Roles | ✅ Live | Full CRUD, module-level read/write permissions, color picker, expandable permission grid |
| Settings → Team Members | ✅ Live | Member list, edit panel (role/vehicle), invite flow (base64 token link), soft delete |
| Quote Builder | ⏸ Deferred | Needs Inventory/catalog backend first; triggers from Estimating stage on Opportunity |
| Planner / Gantt | ⏸ Deferred | Needs backend |

---

## Backend Schema (Migrations Applied)

| Migration | Tables / Changes | Status |
|---|---|---|
| `20260608000001_init` | `tenants`, `user_profiles`, `current_tenant_id()` RLS helper | ✅ Live |
| `20260608000002_auth_trigger` | `handle_new_user()` trigger on `auth.users` | ✅ Live |
| `20260608000003_roles_vehicles_locations` | `roles`, `vehicles`, `inventory_locations`, `seed_default_roles()` | ✅ Live |
| `20260608000004_role_permissions` | `role_permissions`, `app_module` enum, 9 default roles with module permissions | ✅ Live |
| `20260608000005_user_profiles_email` | `email` column on `user_profiles`, updated trigger | ✅ Live |
| `20260608000006_user_profiles_delete_policy` | DELETE RLS policy on `user_profiles` | ✅ Live |
| `20260608000007_soft_delete_members` | `is_active` column, updated SELECT/UPDATE policies, upsert in trigger | ✅ Live |
| `20260608000008_fix_update_policy` | Consolidated UPDATE policy to `tenant_id = current_tenant_id()` | ✅ Live |
| `20260608000009_deactivate_member_fn` | `deactivate_member(uuid)` security definer RPC | ✅ Live |
| `20260608000010_grant_deactivate_member` | `GRANT EXECUTE` on `deactivate_member` to `authenticated` | ✅ Live |
| `20260608000011_user_profiles_ops_fields` | `phone`, `availability`, `skills`, `certifications`, `pay_type`, `pay_rate`, `start_date` on `user_profiles` | ✅ Live |
| `20260608000012_crm` | `companies`, `contacts` tables with full RLS | ✅ Live |
| `20260609000001_crm_seed` | 7 test companies + 13 test contacts | ✅ Live |
| `20260609000002_user_seed` | 8 test auth users (one per default role), password `Test1234!` | ✅ Live |
| `20260609000003_user_seed_profiles` | Full profile data for seed users (skills, certs, pay, phone, start date) | ✅ Live |
| `20260610000003_opportunities` | `opportunities` table + full RLS | ✅ Live |
| `20260610000004_leads` | `leads` table + full RLS | ✅ Live |
| `20260610000005_fix_opportunity_priority` | Fixed priority check constraint `'med'` (was `'medium'`) | ✅ Live |
| `20260610000006_projects_work_orders` | `projects` + `work_orders` tables + full RLS | ✅ Live |
| `20260610000007_operations_seed` | 5 seed projects + 5 work orders for test tenant | ✅ Live |
| `20260610000008_service_tickets` | `service_tickets` table + full RLS | ✅ Live |
| `20260610000009_service_tickets_seed` | 6 seed service tickets for test tenant | ✅ Live |
| `20260610000012_categories_catalog` | `categories` + `catalog_items` tables, full RLS, `set_updated_at()` trigger, AV/Security seed data (6 categories, 12 items) | ✅ Live |
| `20260610000013_catalog_image_urls` | Seed `image_url` for Axis P3245-V item | ✅ Live |
| `20260610000014_categories_icon` | `icon` column on `categories` (default `Package2`), backfill for seeded categories | ✅ Live |
| `20260610000015_stock` | `stock_items` + `stock_movements` tables, full RLS, `set_updated_at` trigger on stock_items | ✅ Live |
| `20260610000016_stock_seed` | 12 seed stock items + 35 movements; links to catalog items by name ilike match | ✅ Live |
| `20260610000017_service_plans` | `service_plans` table with full RLS, `set_updated_at` trigger | ✅ Live |
| `20260610000018_service_plans_seed` | 8 seed service plans with activity jsonb; looks up companies + team members by name/offset | ✅ Live |
| `20260610000019_vendors` | `vendors` table with full RLS; `set_vendors_updated_at` trigger | ✅ Live |
| `20260610000020_purchase_orders` | `purchase_orders` + `po_line_items` tables with full RLS; `set_purchase_orders_updated_at` trigger | ✅ Live |
| `20260610000021_vendors_pos_seed` | 7 vendors + 11 POs + 18 line items for test tenant; POs linked to seeded projects by code; line items linked to catalog items by SKU | ✅ Live |

**Trigger logic:** New signup → creates `tenants` row + `user_profiles` row (Owner role). Invited user (has `tenant_id` in metadata) → joins existing tenant with assigned role. Upserts on conflict so re-inviting a removed user reactivates their profile.

**Key pattern learned:** Every security definer function callable from the frontend needs `GRANT EXECUTE ON FUNCTION ... TO authenticated` or PostgREST silently drops the call with no error.

**Seed users** (password `Test1234!` for all):
`chris.navarro@example.com` (Admin), `sarah.kim@example.com` (Sales Rep), `riley.torres@example.com` (Dispatcher), `mike.okafor@example.com` (Technician), `jordan.vale@example.com` (Technician), `dana.park@example.com` (Warehouse Staff), `priya.anand@example.com` (Service Coordinator), `morgan.ellis@example.com` (Finance)

---

## Key Decisions (Permanent)

- **Schema follows UI** — build the page first, derive the schema from what it needs
- **Invite-only for existing companies** — signup creates new tenant; teammates join via invite link (tenant_id in metadata)
- **Stripe** for payments — card + ACH, payment links for commercial NET 30 clients
- **Full data trail** — every record links back to its origin: Lead → Contact → Opportunity → Quote (versioned) → Project → Work Orders → Invoices. No orphaned records.
- **Quote Builder triggers from Estimating stage** — "Create Quote" button on opp in Estimating; "Edit Quote" in Negotiation (versioned v1→v2→v3); opp value stays in sync with latest revision. Closed Won converts accepted quote to Project.
- **Catalog (Inventory) is a prerequisite for Quote Builder** — can't build real quotes without priceable line items. Build order: Inventory → Quote Builder → Project conversion.
- **Email confirmation disabled** in dev (`mailer_autoconfirm: true` via Management API)
- **Nitro preset: `vercel`** — set in `vite.config.ts`; Lovable config defaults to cloudflare and skips nitro outside sandbox
- **`.npmrc`** — `legacy-peer-deps=true` required for Vercel installs
- **`stat bar → tabs → filter bar`** — locked layout order on every list page
- **View-before-edit** — row click = view panel, hover Edit = shortcut to edit form

---

## Session Archive (001–017)

Sessions 001–015 established the full frontend UI: all module pages, shared component library (`page-components.tsx`), command palette, settings module, reports placeholder, theme system, Linear-inspired design.

Session 016: Command palette wired, inbox alignment fixed, full Settings module (Company Profile, Service Plan Tiers, Integrations), gear icon → `/settings/company`.

Session 017: Reports page — 27-report catalog across 6 categories + custom report builder teaser (post-launch).

---

## Session 018 — Supabase Backend Foundation + Auth + Deployment

**Date:** June 8, 2026

**Completed:**

- Installed `@supabase/supabase-js` + `@supabase/ssr`; created `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (SSR)
- `supabase init` + `supabase link` to project `erdtfwelbdlvammfdtgz`
- Migration 001: `tenants`, `user_profiles`, RLS policies, `current_tenant_id()` helper
- Migration 002: `handle_new_user()` trigger — auto-creates tenant + profile on signup
- Auth: `AuthContext`, login/signup pages, `ProtectedApp` guard in `__root.tsx`, sign-out popover
- Vercel deployment: `.npmrc` for peer deps, `nitro: { preset: "vercel" }` in `vite.config.ts`
- Custom domain `bearingpro.tech` via Cloudflare DNS → Vercel (DNS-only, no proxy)
- Supabase config: `site_url` → `bearingpro.tech`, `mailer_autoconfirm: true`, allowed origins set
- Rebranded auth pages to BearingPro (BP badge, correct copy)
- Theme toggle added to auth pages; sign-out changed to confirmation popover
- Investigated D-Tools SI API — example key in docs is illustrative only, not functional; needs real SI license

**Schema notes:** `tenants` and `user_profiles` are live. All future tables need `tenant_id uuid not null references tenants(id)` + RLS policy using `current_tenant_id()`.

---

## Session 019 — Settings Company Profile Wired

**Date:** June 8, 2026

**Completed:**

- Settings → Company Profile reads from and writes to the live `tenants` table
- Fixed form-reset bug: `useRef` guard prevents `useEffect` from re-populating the form on every refetch (was overwriting typed values with DB nulls after save)
- `onSuccess` uses `setQueryData` instead of `invalidateQueries` — cache updated directly, no round-trip refetch
- Added `.select().single()` to update call so 0-row updates (RLS mismatch) surface as errors instead of false success

**Pattern to follow for future data pages:** `useRef` initialized flag + `setQueryData` on save instead of invalidate.

---

## Session 019 (continued) — Sidebar polish

- Removed duplicate search button from sidebar (top bar only)
- Sidebar company name and initials badge now read from `tenants` table (shares `["tenant"]` cache with Company Profile — no extra fetch)

---

## Session 020 — Roles, Team Members, Invite Flow

**Date:** June 8, 2026

**Completed:**

- **Settings → Roles** (live): full CRUD against `roles` + `role_permissions` tables; inline rename (blur to save); color picker (12 swatches); expandable module permission grid (8 modules, 3-state none/read/write toggle); optimistic updates via `setQueryData`
- **Settings → Team Members** (live): member table with avatar (name-based gradient, 8 options), role badge, vehicle, joined date; click row → edit panel (role + vehicle assignment); invite panel generates base64-encoded link (`?t=TOKEN`) — hides tenant UUID, pre-fills name/email on signup form
- **Invite flow** (`/auth/signup?t=BASE64`): `validateSearch` decodes token, hides company field, shows "Join your team / You've been invited as {role}", passes `{ tenant_id, role_name }` in signup metadata
- **Soft delete**: `is_active` column on `user_profiles`; removing a member sets `is_active=false` via `deactivate_member()` RPC; RLS SELECT filters inactive users; `handle_new_user` trigger upserts so re-invite reactivates the profile automatically
- **RLS fixes**: added DELETE policy, consolidated UPDATE policy, added `GRANT EXECUTE` to `deactivate_member` (PostgREST requires explicit grant for security definer functions)
- **routeTree.gen.ts**: manually added both new settings routes (TanStack Router CLI unavailable due to missing prettier)

**Deferred:**
- Invite URL cleanup: `/join/$slug` with tenant slug in path (current base64 token works fine)
- Deactivated Members UI: view/reactivate removed users (pre-launch task)
- Hard delete (auth.users): requires service-role Edge Function; use Supabase dashboard for now

---

## Session 021 — CRM Schema + Data Wiring + Seed Data

**Date:** June 9, 2026

**Completed:**

- **Migration 012**: `companies` + `contacts` tables, full RLS policies (`select/insert/update/delete` scoped to `current_tenant_id()`)
- **Companies page** (`/crm/companies`): fully wired — list reads from DB, card + list views, "New Company" modal inserts to DB with `tenant_id` from query cache
- **Contacts page** (`/crm/contacts`): fully wired — list reads from DB with joined company name + assignee name (`user_profiles!assigned_to`), "New Contact" modal inserts with company dropdown (real companies) and Assign To (real team members)
- **Company detail page** (`/crm/companies/$companyId`): loads company from DB, shows real linked contacts via `company_id` FK, stubs Opportunities/Projects with "available after X module" message
- **CRM seed data**: 7 companies (AV & Technology, Healthcare, Hospitality, Education, Real Estate; mix of active/prospect/inactive) + 13 contacts (9 commercial linked to companies, 4 standalone residential)
- **User seed data**: 8 test `auth.users` inserted via migration (trigger creates `user_profiles`); one per default role; password `Test1234!`
- **User profile seed**: all 8 users filled with phone, availability, skills[], certifications[], pay_type, pay_rate, start_date

**Patterns established:**
- `tenant_id` for inserts: read from `qc.getQueryData<{ id: string }>(["tenant"])` inside mutations
- Supabase join syntax for FK with non-default column: `user_profiles!assigned_to(id, full_name)`
- Seeding `auth.users` via migration: use `extensions.crypt()` + `extensions.gen_salt('bf')` (pgcrypto in extensions schema); pass `{ tenant_id, role_name }` in `raw_user_meta_data` so trigger assigns correct role
- Type casting: Supabase returns `stage` as `string`; cast fetched data with `as DbCompany[]` to satisfy TS

**Deferred:**
- Contact edit form (drawer is view-only)
- Company detail notes save
- Assign seeded contacts to seeded team members

---

## Session 024 — Operations Pages Live (Projects + Work Orders)

**Date:** June 9, 2026

**Completed:**

- **Migration 006**: `projects` + `work_orders` tables with full RLS (`select/insert/update/delete` scoped to `current_tenant_id()`)
  - `projects`: code, name, company_id, contact_id, opportunity_id, site_address, status (quoted/scheduled/in-progress/on-hold/completed/cancelled), contract_value, budgeted_cost, budgeted_hours, start_date, target_end_date, pm_id, notes
  - `work_orders`: same fields + project_id FK (nullable; child WOs link to a project), scheduled_date instead of start/target dates, assigned_to instead of pm_id; no `'quoted'` status
- **TypeScript types regenerated** via `supabase gen types typescript`
- **Projects list page** (`/operations/projects`): fully wired — reads from `projects` table with company + PM joins; "New Project" modal inserts to DB with auto-generated code (`AV-YYYY-NNN`); filter by status + search
- **Work Orders list page** (`/operations/work-orders`): fully wired — reads from `work_orders` table with company + assignee joins; "New Work Order" modal inserts to DB with auto-generated code (`WO-NNNN`); filter by status + search
- **Project detail page** (`/operations/projects/$projectId`): fetches by UUID from DB; maps DB → `ProjectRecord` shape for overview; status dropdown saves to DB on change (optimistic update); tab panels (Phases/Parts/Team/Activity) remain as stubs
- **Work Order detail page** (`/operations/work-orders/$workOrderId`): same pattern; status saves to DB; assignee + scheduled date pulled from DB
- **Convert to Project / Work Order** on Opportunity drawer (closed-won stage): "Convert to Project / Work Order" button → inline picker → "Project" or "Work Order" → inserts the record with opportunity_id FK, carries over title/company/contact/value/assignee; invalidates `["projects"]` or `["work-orders"]` cache; closes drawer after conversion

**Patterns used:**
- `useRef` initialized flag + optimistic `setQueryData` for status dropdown (no form reset on refetch)
- Code generation: count existing records + 1, zero-pad (same RLS scope means count is tenant-scoped)
- `work_orders.assigned_to` FK uses `user_profiles!assigned_to(id,full_name)` join alias

---

## Session 022 — CRM Polish + Lead Inbox Move + Sales Architecture

**Date:** June 9, 2026

**Completed:**

- **Contact edit drawer** (`/crm/contacts`): drawer now has view/edit modes; pencil icon → edit form; all fields editable; mutation updates DB + invalidates `["contacts"]` cache
- **Company edit modal** (`/crm/companies/$companyId`): "Edit" button in header opens modal with all company fields (name, industry, stage, phone, email, website, city, state, billing_address, service_address); saves to DB, updates query cache + page title via `onSaved`
- **Company notes inline edit**: notes textarea in sidebar saves on blur via mutation; `useRef` guard prevents refetch from overwriting in-progress edits
- **Deactivated Members UI** (`/settings/team-members`): "Deactivated Members" section appears below active table; `get_inactive_members()` + `reactivate_member()` RPCs; optimistic cache swap on remove/reactivate
- **Invite URL cleanup**: `/join/$slug` public route live; tenant slug auto-generated in `handle_new_user` trigger; `get_tenant_by_slug` RPC (GRANT to `anon`); invite panel generates slug URL when slug exists, falls back to base64 token for pre-migration tenants
- **Lead Inbox moved to CRM**: route moved from `/sales/lead-inbox` → `/crm/lead-inbox`; sidebar Lead Inbox now first item under CRM section; Sales section now only has Opportunities + Quotes; command palette updated
- **Migrations**: `20260610000001_inactive_members` (get_inactive_members + reactivate_member RPCs), `20260610000002_tenant_slug` (slug column, backfill, get_tenant_by_slug RPC, updated trigger)

**Architecture decision — Sales schema (Option B):**
- `leads` table is **separate from contacts** — leads are anonymous/unqualified web inquiries; contacts are known people
- Lead conversion flow: Convert button → modal pre-filled from lead → creates Contact + skeleton Opportunity → lead marked `converted`
- Opportunity fields auto-populated from lead: name, assigned rep, linked contact, notes
- Opportunity fields filled in later by rep: deal value, close date, probability
- Build order: `opportunities` table first → `leads` table second → wire Convert button third

---

## Session 028 — Lead Conversion Modal + Minor Bug Fixes

**Date:** June 9, 2026

**Completed:**

- **Lead conversion modal** (`/crm/lead-inbox`): Convert button now opens a modal instead of converting immediately. Modal pre-fills with the lead's name, runs an ilike search against existing contacts, and shows up to 5 matches as radio options. User can link to an existing contact (skips contact insert, links opportunity directly) or choose "Create new contact" (default — preserves prior behavior). Prevents duplicate contacts when the same person submits a second lead.
- **Disabled unimplemented dropdown actions** on Project detail and Work Order detail pages: Duplicate / Archive / Delete items had `onClick={() => console.log(...)}` stubs — replaced with `disabled` so they visually signal unavailability instead of silently doing nothing.

---

## Session 026 — Production Bug Fixes (Roles + Project Detail)

**Date:** June 9, 2026

**Completed:**

- **Roles page crash** (`/settings/roles`): crashed only when navigating from Team Members. Root cause: both pages used `queryKey: ["roles"]`, but team-members fetched a partial shape (`id, name, color` — no `role_permissions`). That stale partial data was served immediately to the Roles page, which accessed `role.role_permissions.some(...)` during render → TypeError. Fixed by renaming team-members' query key to `["roles-basic"]`.
- **Project detail crash** (`/operations/projects/$projectId`): `toProjectRecord(dbProject)` created a new object on every render. It was a dep in `useEffect([project])`, so the effect fired every render → called `setMeta` → updated `PageMetaContext` → re-rendered `AppShellContent` → re-rendered outlet → re-rendered component → new object → loop → React error #185. Fixed with `useMemo`.
- **PageMetaContext stabilized**: `value={{ meta, setMeta }}` was creating a new object every render, causing all consumers to re-render unnecessarily. Wrapped in `useMemo(() => ({ meta, setMeta }), [meta])`.

**Patterns to remember (also in Claude memory):**
- Query key collision: if a page crashes only when coming from a specific other page, check for two queries using the same key but different select shapes
- React error #185: look for derived objects (created inline during render) inside `useEffect` dependency arrays — wrap them in `useMemo`

---

## Session 030 — Inventory Stock Live

**Date:** June 9, 2026

**Completed:**

- **Migration 20260610000015**: `stock_items` + `stock_movements` tables with full RLS; `updated_at` trigger on `stock_items`; `stock_movements` is insert-only (no update/delete policies — movements are immutable)
- **Migration 20260610000016**: 12 seed stock items + 35 movements for test tenant; links `catalog_item_id` to real catalog rows via `ilike` name match; `created_by` attributed to first 3 user profiles; "System" movements use `null`
- **Stock page fully wired** (`/inventory/stock`): all demo data removed
  - Main query: `stock_items` fetched on mount, manufacturers derived from live item data
  - Movements query: lazy per-item — only fires when a drawer opens in view mode (`enabled: !!drawerItem && drawerOpen && drawerMode === "view"`)
  - Catalog link dropdown: populated from real `catalog_items` (active only); auto-fills name, SKU, manufacturer, cost, UoM on link
  - Save mutation: insert vs update determined by whether item.id exists in current query cache; uses `setQueryData` for optimistic update
  - Adjust mutation: inserts `stock_movements` row (with `created_by` from `supabase.auth.getUser()`) + updates `qty_on_hand`; invalidates movements cache for the adjusted item
  - Loading state: body dims while initial fetch runs

**Architecture note:** `stock_movements` has no DELETE RLS policy — movements are a permanent audit trail. Corrections are made by adding an opposite movement (same as accounting).

---

## Session 029 — Inventory Catalog Live

**Date:** June 9, 2026

**Completed:**

- **Migration 20260610000012**: `categories` + `catalog_items` tables with full RLS; `set_updated_at()` trigger on catalog_items; AV/Security seed data (6 categories, 12 items) for test tenant
- **Catalog page fully rewritten** (`/inventory/catalog`): wired to Supabase — no more demo data
  - **Category landing**: colored card grid per tenant category; click to drill in; breadcrumb nav back
  - **CategorySetupModal**: auto-appears on first visit (no categories yet); multi-select trade templates (AV, Security, HVAC, Plumbing, Electrical, General Contractor); custom category input; Labor deduped across templates; color palette auto-assigned; icon included per category from template config
  - **Item card grid**: product photo when `image_url` set, falls back to category initial; manufacturer badge; category chip; MSRP; hover Edit shortcut
  - **Item list view**: full table with category chip, cost, MSRP, UoM, status, hover Edit
  - **ItemDrawer**: view mode (pricing grid with margin %, labor details, product image if set) + edit mode (all fields, category select, manufacturer datalist, UoM suggestions, labor attach with hours + rate override)
  - **Search**: bypasses category hierarchy, shows Category chip on results, global across all items
  - **Context-aware New button**: "New Category" on landing → `NewCategoryDialog` (name + color swatches + searchable icon picker); "New Item" when drilled in → item drawer
- **Icon system**: `src/data/catalog-icons.ts` — 70-icon curated set across 8 trade groups (Security, AV, Networking, Electrical, HVAC, Plumbing, Construction, General); `ICON_MAP` for dynamic Lucide rendering; `ICON_GROUPS` for searchable picker UI
- **Migration 20260610000014**: `icon` column on `categories`; backfilled for seeded AV/Security categories
- **CategoryCard**: renders Lucide icon (h-10, colored) instead of initials
- **Trade templates updated**: `src/data/trade-templates.ts` — categories now `{ name, icon }[]`; all 30 template categories pre-assigned relevant icons
- **Product image**: Axis P3245-V image URL seeded (migration 20260610000013); `ItemCard` + drawer view show `<img>` when `image_url` is set, fall back to category initial otherwise

**Architecture decisions:**
- Catalog = master data (what you can quote/sell); Stock = transactional (quantities per location) — separate tables, confirmed industry standard
- Categories are tenant-defined — no hardcoded enum; trade-type templates are static app config inserted to DB on first setup
- Icon stored as Lucide component name string in DB (e.g. `"Camera"`); rendered via `ICON_MAP[icon]` lookup; falls back to `Package2`

---

## Session 031 — Service Plans Live

**Date:** June 9, 2026

**Completed:**

- **Migration 20260610000017**: `service_plans` table with full RLS (select/insert/update/delete scoped to `current_tenant_id()`); `set_updated_at` trigger reused from catalog migration
- **Migration 20260610000018**: 8 seed service plans matching prior demo data (Vertex Capital, Helio Health, Pinecrest, Northbeam, Arden & Loom, Quay Residential, Halcyon Schools, Cinder & Oak); activity stored as jsonb with actor names; company FKs looked up by `name ilike`, account manager by `user_profiles` offset
- **Service Plans page fully rewritten** (`/service/service-plans`): wired to Supabase — no more demo data
  - **Card grid**: tier badge + status badge; covered systems chips; MRR / SLA / renewal date; visits progress bar; account manager avatar/name; live data from DB
  - **Stat bar**: Active Plans, MRR, Annual Revenue, Expiring Soon (amber accent)
  - **Status tabs**: all / active / expiring / expired / pending / cancelled with live counts
  - **PlanDrawer**: tier dropdown (inline save), status dropdown (inline save), notes textarea (blur-to-save); Renew Plan / Cancel Plan buttons; contact + site info; activity timeline; account manager avatar
  - **NewPlanModal**: all fields wired — customer, contact, phone, tier, billing cycle, MRR, SLA, visits/year, start date, account manager, site address, covered systems (toggle chips), notes; auto-generates code `SP-YYYY-NNN`; inserts to DB
  - **Removed** `SERVICE_PLANS` demo data import; removed `ownerNames` import; `@/data/service-plans` import retained for type/config exports only
- **TypeScript**: used `TablesUpdate<"service_plans">` for update patch type (avoids Supabase's `RejectExcessProperties` constraint on `Record<string, unknown>`)

**Patterns used:**
- `useRef` initialized flag in `PlanDrawer` to prevent notes field from resetting after a save refetch
- `TablesUpdate<"table">` from `@/lib/supabase/types` for typed partial-update patches
- Account manager name via FK join: `user_profiles!account_manager_id(full_name)` in select + seed migration
- `activity` column as `jsonb` — read-only in UI (no add-activity button yet); populated at seed time

---

## Session 032 — Inventory POs / Vendors Live

**Date:** June 9, 2026

**Completed:**

- **Migration 20260610000019**: `vendors` table with full RLS; `set_vendors_updated_at` trigger
- **Migration 20260610000020**: `purchase_orders` + `po_line_items` tables with full RLS; `set_purchase_orders_updated_at` trigger; `po_line_items` is insert/delete only on edit (no update policy needed — delete + reinsert on every save)
- **Migration 20260610000021**: 7 vendors + 11 POs + 18 line items for test tenant; POs linked to seeded projects by code; line items linked to catalog items by SKU ilike
- **Vendors page fully rewritten** (`/inventory/vendors`): live `useQuery(["vendors"])`; vendor stats (`ytdSpend`, `totalPOs`, `activePOs`, `lastOrderDate`) derived client-side from shared `["purchase-orders"]` cache using `useMemo`; `saveMutation` for edit; `createMutation` for new; card + list views
- **Purchase Orders page fully rewritten** (`/inventory/purchase-orders`): 5 queries — POs (with `vendors`, `po_line_items`, `projects!linked_project_id`, `work_orders!linked_work_order_id` joins), vendors, projects-basic, work-orders-basic, catalog-items-po; `saveMutation` handles create (INSERT po + line items) and update (UPDATE header, DELETE old line items, re-INSERT new ones); `statusMutation` for Send PO / Mark All Received quick actions; `linkedJobId` encoded as `"p:uuid"` / `"w:uuid"` / `""` in UI, parsed to separate FK columns on save; date inputs use `type="date"` with `fmtDate(iso)` for display; `TablesUpdate<"purchase_orders">` for typed quick-status patches
- **Fixed `src/lib/supabase/types.ts`**: removed stray `Initialising login role...` line from Supabase CLI output that was causing TS parse error

**Patterns established:**
- Vendor stats: always derive client-side from `["purchase-orders"]` cache in `useMemo` — vendors and PO pages share the same cache key
- Linked FK encoding: `"p:uuid"` = project, `"w:uuid"` = work order, `""` = unlinked; parse with `startsWith("p:")` / `startsWith("w:")` to split back into separate DB columns
- PO line item update strategy: DELETE WHERE `po_id = ?` then bulk INSERT; simpler than tracking individual adds/removes; acceptable since there are no external references to line item IDs
- `projects!linked_project_id(id, code, name)` — Supabase `!column` syntax for FK joins where the FK column name differs from the default; result key matches the alias prefix
- `catalog_items.is_active` (boolean) not `status` — use `.eq("is_active", true)` to filter active items
