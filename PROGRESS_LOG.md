# PROGRESS_LOG.md — BearingPro

> Read this + PROJECT_CONTEXT.md at the start of every session before touching code.

---

## Current Status

**Phase:** Backend — All modules live; permissions enforced; seed data connected; design polish in progress
**Last Updated:** Session 039
**Live URL:** https://bearingpro.tech (Vercel + Cloudflare DNS)
**Supabase Project:** `erdtfwelbdlvammfdtgz`

---

## What's Next

**Start here next session:**

1. **Resume Derek Paulson flow test** — all blockers cleared. Paused at: work orders created → need to dispatch to Scheduling calendar → then invoice → payment.
2. **Test Add Phase modal** — error handling is now live; verify the `insertProjectPhase` insert succeeds on the deployed Vercel site (open a project → Phases & Tasks → Add Phase → check for error banner or confirm WO appears).
3. **Planner/Gantt backend** — phases + team assignments; deferred until Scheduling is confirmed stable

**Tooling / setup:**
- Set up Codacy Guardrails MCP — free for public repos; ~5 min setup (API token → MCP config); adds real-time security scanning to Claude Code. Docs: https://docs.codacy.com/codacy-guardrails/codacy-guardrails-getting-started/

**Specced items queued for build (in progress log):**
- Referral partner tracking (lead → contact referral FK trail)
- Job number / quote number scheme (Q-YYYY-NNN + source_quote_id on project)
- **Quote → Opportunity auto-stage-advance:** ✅ Complete (Session 038). Full chain now wired: draft saved → Estimating (guarded `.eq("stage", "site-visit")` in `saveQuoteToDb`) → sent → Negotiation → accepted → Closed Won.

---

## Open Questions / Blockers

- Quote Builder deferred — needs backend (catalog + projects)
- Planner/Gantt deferred — needs backend (phases + team assignments)
- D-Tools SI integration: needs real license key from SI software (Control Panel → Manage Integrations)

---

## Planned Feature — Job Number / Quote Number Assignment

**Problem:** Job numbers (project codes like `AV-2026-001`) are assigned at project creation (Closed Won → Convert to Project). Quote Builder is deferred, so there's no quote number yet. Once Quote Builder is built, the numbering scheme needs to be deliberate and consistent across the full pipeline.

**Decision: Two separate number series**

| Record | Number format | Assigned when |
|---|---|---|
| Quote | `Q-YYYY-NNN` | Quote created from Estimating stage |
| Project | `AV-YYYY-NNN` (or trade prefix) | Converted from accepted quote → Closed Won |

Quote number and project code are separate — a client references the quote number during negotiation; the project code is the internal job number used on work orders, POs, and invoices.

### Current behavior (no Quote Builder)
- Project code assigned at "Convert to Project" on Closed Won → correct, no change needed
- No quote number exists yet — `—` shown in opportunity drawer's Linked Quote section

### When Quote Builder is built
- **Estimating stage**: "Create Quote" button → generates `Q-YYYY-NNN`, links to opportunity via `quote_id` FK
- **Opportunity value**: syncs automatically from latest quote revision (no manual entry)
- **Negotiation stage**: quote is versioned (`v1 → v2 → v3`); each revision keeps the same `Q-YYYY-NNN` base number
- **Closed Won**: "Accept Quote" → triggers project conversion → project gets `AV-YYYY-NNN`; quote number is stored on the project as `source_quote_id` for the full audit trail

### Schema additions (when Quote Builder is built)
```sql
-- quotes table (future)
CREATE TABLE quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  opportunity_id uuid not null references opportunities(id),
  number text not null,          -- Q-2026-001
  revision int not null default 1,
  status text not null,          -- draft / sent / viewed / accepted / expired
  value numeric(12,2),
  ...
);

-- projects: add source_quote_id
ALTER TABLE projects ADD COLUMN source_quote_id uuid references quotes(id);
```

### What NOT to do
- Do not assign a job number at lead or opportunity creation — numbers should only exist for things that are real (quoted or sold)
- Do not reuse quote numbers as project codes — they serve different audiences (client-facing vs. internal)

**Build order:** Quote table → quote CRUD UI → number generation → opportunity value sync → project conversion carries `source_quote_id`

---

## Status Progression — Projects

`planning` → `scheduled` → `in-progress` → `on-hold` → `completed` / `cancelled`

`planning` (sky-blue): default status for freshly-converted projects — no schedule/crew assigned yet.
`quoted`: legacy status; still in DB check constraint and UI for backward compat; may be retired when Quote Builder ships.

---

## Planned Feature — Referral Partner Tracking

**Problem:** Leads that come via referral have no FK link to the referring company. Source is just a string ("Referral"). You can't see which contractors/architects are driving business, and the referral context is lost after conversion.

**Goal:** Track which company (and optionally which contact) referred a lead. Carry that relationship forward through conversion into the opportunity so the full trail is preserved.

### Schema — Migration `20260610000025_referral_partner`

```sql
-- leads
ALTER TABLE leads
  ADD COLUMN referred_by_company_id uuid references companies(id),
  ADD COLUMN referred_by_contact_id uuid references contacts(id);

-- opportunities
ALTER TABLE opportunities
  ADD COLUMN referred_by_company_id uuid references companies(id);
```

No RLS changes needed — both FKs reference tenant-scoped tables and existing policies cover the new columns.

### Lead Form Changes

- Source dropdown stays as-is (enum values unchanged)
- When `source = "Referral"`: reveal a **searchable company combobox** — ilike against `companies` table, same pattern as JobCombobox in invoices
- When a company is selected: optionally reveal a **contact combobox** filtered to that company's contacts — lets rep record "Audrey Chen at Northbeam" not just "Northbeam"
- When `source != "Referral"`: both fields hidden (no clutter for web/walk-in leads)

### Convert Modal Changes

- Carry `referred_by_company_id` from lead → opportunity insert (1 line addition to `convertLead`)
- No UI change needed in modal — referral is set at lead creation, not conversion

### Opportunity Drawer Changes

- Add read-only "Referred by" field showing company name (linked chip, like assigned rep)
- Not editable — referral source is established at lead time; changing it mid-pipeline would corrupt reporting

### Company Detail Page Changes

- Add **Referrals panel** to company detail sidebar (below contacts)
- Query: `leads` + `opportunities` where `referred_by_company_id = companyId`
- Show: count of leads referred, count converted, total pipeline value from those opps
- Example: "Northbeam Architects — 3 leads referred · 2 converted · $68K pipeline"

### What This Does NOT Include (Deferred)

- Referral commission tracking or payouts
- Partner portal / external login
- Reports → Partner Performance report (placeholder slot already exists in the 27-report catalog)

### Build Order

1. Migration (`20260610000025_referral_partner`)
2. Lead form — conditional referral fields
3. `convertLead` — pass `referred_by_company_id` to opp insert
4. Opportunity drawer — read-only "Referred by" chip
5. Company detail — Referrals panel

**Estimated scope:** Medium. All pieces follow existing patterns (combobox, FK join, read-only field). No new tables.

---

## Planned Feature — Per-Phase Project Billing

**⏸ BLOCKED on catalog/inventory phase attribute — do not build until that lands. See "Dependency" below.**

**The billing model (decided Session 039):**

- **Project = the billable unit.** The customer signed one contract for one project. Every invoice anchors to the project (`invoices.linked_project_id`), and all invoices for a project must reconcile to its contract total.
- **Phase (task) = the schedulable + costable unit.** Phases are `work_orders` rows (the "Phases & Tasks" tab). They are *not* billed individually as separate contracts — they determine *when* you bill and *which* line items go on each invoice.
- **A phase completing is a billing _prompt_, not a billing _event_.** Completing a phase surfaces "bill this phase?" — a human confirms. The invoice is still cut against the project.
- **Per-phase invoicing:** when a phase is done, invoice the parts **and** labor allocated to that phase (the `project_line_items` where `phase = X`), then mark those rows billed so they can't be billed twice.
- **Optional deposit:** a project-level `deposit_amount` (nullable — different tenants bill differently; some take a deposit, some don't). A deposit invoice anchors to the *project*, not a phase, because it's collected before any phase completes (funds material procurement). Default behavior: deposit is applied as a credit against the final invoice (make adjustable later).

**Why project-not-phase is the billable unit:** the deposit proves it — you bill a deposit before any phase is done, so that money can't belong to a phase. One invoice can also span multiple phases, and a phase like "commissioning" may carry no client-facing line value. The contract is the anchor; phases are the clock.

### Dependency (the reason this is blocked)

Per-phase billing needs line items reliably grouped by phase. Today `project_line_items.phase` is **free text** (typed by hand in PartsPanel, defaults to `"Procurement"`) and is *not* linked to the actual `work_orders` phases. Grouping by a hand-typed string is fragile — a typo ("rough in" vs "Rough-In") silently splits a phase's parts across two invoices.

**The fix comes from the planned catalog/inventory work:** attach a phase attribute to each inventoriable product so that adding a product to a project auto-assigns its phase. For this to feed billing cleanly:

- **Phase must be one shared controlled list** referenced by *both* catalog items and project tasks — not free text on either side.
- **Catalog phase is a default, overridable per project line item** — the same product is usually the same phase, but allow per-job exceptions.

Once catalog items carry a structured phase and it flows onto `project_line_items` automatically, per-phase billing becomes a reliable "group by phase" operation.

### Schema additions (when unblocked)

```sql
ALTER TABLE projects ADD COLUMN deposit_amount numeric(12,2);   -- optional deposit

ALTER TABLE project_line_items
  ADD COLUMN invoiced_at timestamptz,
  ADD COLUMN invoice_id  uuid references invoices(id);          -- double-bill guard / audit trail

ALTER TABLE invoices
  ADD COLUMN kind text not null default 'progress'
    check (kind in ('deposit','progress','final'));             -- distinguish deposit vs phase invoices
```

> `invoices.linked_work_order_id` **already exists** (migration `20260610000022`) — the phase→invoice link is in place.

### Build order (when unblocked)

1. **Tier 1 (small, ~30–45 min, can ship independently):** migration above + type regen; `deposit_amount` field on project Edit drawer; "Bill Deposit" button → creates `kind='deposit'` invoice anchored to project.
2. **Tier 2 (focused session, needs catalog phase done first):**
   - "Generate Invoice for Phase" action on each phase row → pulls unbilled `project_line_items` for that phase → creates `kind='progress'` invoice (project + work-order linked) → copies rows to `invoice_line_items` → stamps `invoiced_at` / `invoice_id`
   - Double-bill guard: exclude already-invoiced rows; "invoiced" badge in PartsPanel
   - Reconciliation strip on project: contract total vs deposit + billed + remaining

### Terminology note

Planned rename "Work Orders" → "Tasks" — change the **UI label only**; keep the DB table named `work_orders` (it's referenced across routes, RLS, types, and FK joins; a real table rename is a large mechanical refactor for zero functional gain).

**Estimated scope:** Tier 1 small; Tier 2 medium and blocked on catalog phase work.

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
| Sales (Opps, Quotes) | ✅ Opps done | Opportunities page complete: reads/writes DB, drag-and-drop kanban (closed stages locked), stage dropdown, new opp modal, quote auto-advance; Quotes still demo |
| Operations (Projects, Work Orders, Team, Scheduling) | ✅ Projects + WOs + Scheduling live | Schema + RLS live; list + detail pages read/write DB; status persists; Edit drawer live; Convert from Opportunity captures site address + copies quote line items; Scheduling calendar wired to `scheduled_jobs` table (multi-tech dispatch, seed events); New WO modal has project picker (auto-fills company/contact/address); Team still demo |
| Service (Tickets, Plans) | ✅ Live | Tickets: status + notes + new ticket wired; Service Plans: schema + RLS live; 8 seed plans; all CRUD wired (tier/status inline, notes blur-save, Renew/Cancel, New Plan modal) |
| Inventory → Catalog | ✅ Live | Schema + RLS live; category landing + item grid wired; tenant-defined categories with trade templates + icon picker; CategorySetupModal on first visit; New Category / New Item context-aware button |
| Inventory → Stock | ✅ Live | Schema + RLS live; 12 seed items + 35 movements; all CRUD wired; Adjust popover writes to DB; movements lazy-loaded per item in drawer; manufacturers derived from live data |
| Inventory → POs, Vendors | ✅ Live | Schema + RLS live; 7 vendors + 11 POs seeded; all CRUD wired; vendor stats derived from shared PO cache; Send PO + Mark All Received quick actions; linkedJobId encoded as p:/w: |
| Finance (Invoices, Payments) | ✅ Live | Schema + RLS live; 10 seed invoices, 55 line items, 6 payments; full CRUD wired; Collect Payment writes to DB + updates invoice status |
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
| `20260610000022_invoices` | `invoices`, `invoice_line_items`, `invoice_payments` tables with full RLS; `set_invoices_updated_at` trigger | ✅ Live |
| `20260610000023_invoices_seed` | 10 seed invoices + 55 line items + 6 payments; `linked_project_id` wired to "Surgical Center A/V Overhaul" via ilike | ✅ Live (replaced by 024) |
| `20260610000024_reseed_connected` | Replaces all operational seed data with a fully connected story — all 5 projects now use real CRM company_ids, carry `opportunity_id` FK, linked POs and invoices carry `linked_project_id`; companies/contacts/leads/tickets/plans/stock untouched | ✅ Live |
| `20260610000025_quotes` | `quotes` + `quote_line_items` tables with full RLS; `set_updated_at` trigger on quotes | ✅ Live |
| `20260610000026_scheduled_jobs` | `scheduled_jobs` + `scheduled_job_techs` tables with full RLS; 9 seed events linked to real WO/project codes; techs seeded (mike, jordan, riley, chris) | ✅ Live |
| `20260611000001_projects_planning_status` | Adds `'planning'` to `projects.status` check constraint; correct initial status for freshly-converted projects | ✅ Live |
| `20260611000002_project_line_items` | `project_line_items` table with full RLS; backfill copies existing `quote_line_items` → `project_line_items` for already-converted projects via `opportunity_id` FK trail | ✅ Live |

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
- **FormSelect over native select** — always use `<FormSelect>` from `@/components/ui/form-select` for any dropdown in a form or drawer; use `<FilterSelect>` from `page-components` for filter bar dropdowns only. Native `<select>` is banned — breaks the visual design system.

---

## Test Scenario — Derek Paulson New Build

Use this to manually walk the full app flow end-to-end. Every step is wired to the live DB.

**The call:** Derek Paulson phones in. He's building a 4,200 sq ft custom home in Naperville, IL and wants whole-home AV and security. Referred by Audrey Chen at Northbeam Architects (existing client). Rough budget $28,000–$35,000.

**What he wants:**
- Whole-home audio — 6 zones (Sonos), patio + living room + kitchen + 3 bedrooms
- Security cameras — 8 exterior cameras + 4 interior
- Smart front door lock + video doorbell
- Living room home theater — 120" motorized screen, 4K laser projector, 7.1 surround

**Step-by-step flow to test:**

1. **Lead Inbox → New Lead**
   - Full name: Derek Paulson
   - Phone: (630) 555-0147
   - Source: Referral
   - Notes: *Referred by Audrey Chen / Northbeam. New build in Naperville, framing complete. Wants whole-home audio, cameras, and home theater. Budget $28–35k. Follow up to schedule site walk.*

2. **Convert Lead**
   - Hit Convert → create new contact (residential)
   - Opportunity name: "Paulson Residence — New Build AV & Security"
   - Assign to: Sarah Kim (Sales Rep)

3. **Opportunities Kanban**
   - Move: Site Visit → (after scheduling walkthrough) → Estimating
   - Add note on the opp with scope details from the site visit

4. **Convert to Project** (since Quote Builder isn't built yet, skip straight to project)
   - Button in opportunity drawer (Closed Won stage) → Convert to Project / Work Order → Project
   - Enter site address: 1847 Whitmore Ln, Naperville, IL 60565 → Convert
   - Project starts in `planning` status; any quote line items carry forward to Parts List automatically
   - PM can be set via Edit drawer after creation

5. **Create Work Orders** (from the project, or the New Work Order modal)
   - WO 1: "Paulson — Rough-In (conduit + cable pull)" → assigned Mike Okafor, scheduled during framing
   - WO 2: "Paulson — Trim-Out (devices + speakers)" → assigned Jordan Vale, scheduled after drywall
   - WO 3: "Paulson — Final Commissioning & Training" → assigned Mike Okafor, scheduled before move-in

6. **Progress Work Orders** — change each WO status as you "complete" the work

7. **Invoices → New Invoice**
   - Link job to the Paulson project
   - Add line items: Sonos Amp ×6, Sonos Era 300 ×8, Axis cameras ×12, Verkada doorbell ×1, Epson projector ×1, labor hours
   - Set status: Sent

8. **Payments → Collect Payment**
   - Record deposit (50%), then final payment
   - Confirm invoice flips to Partial → Paid

**What this tests:** Lead creation → conversion → opportunity stages → project creation → work order dispatch → invoicing → payment collection. Every write goes to the live DB.

**Note on Quote Builder gap:** In the real flow, step 4 would be: Estimating stage → Create Quote (line items from catalog) → client approves → Closed Won → auto-convert to Project. That step is deferred. For now, manually move the opp to Closed Won and convert directly.

---

## Session 039 — Design Polish: Type Scale, Drawer Standardization, Topbar Breadcrumbs

**Date:** June 12, 2026

Worked through the Fable design checklist + drawer standardization. All changes verified with `tsc --noEmit` + `bun run build` and pushed incrementally.

**Type scale (`qw-text-sizes`):**
- Collapsed ~1,500 ad-hoc `text-[Npx]` usages (25 distinct values, incl. blurry half-pixels) into a **7-tier named ramp** in `styles.css` `@theme`: `text-2xs` 10 / `text-xs` 11 / `text-sm` 12 / `text-base` 13 / `text-md` 15 / `text-lg` 18 / `text-display` 22. Line-heights paired via `--tw-leading` fallback so explicit `leading-*` still wins. Stray shadcn named usages now resolve through the same scale. (32/52px auth/hero one-offs left alone.)

**Opportunity kanban cards:**
- Redesigned for hierarchy: colored **priority rail** on the left edge (urgent/high pop), removed redundant on-card stage badge, **value promoted to bold hero number** with divider, owner avatar, 2-line title clamp, hover lift + shadow (`sf-card-grab` + `sf-kanban-drag`).
- Fixed top gap on low/medium cards — moved the stage-move control to absolute positioning so it never reserves an empty header row.
- **Decision (open):** card heights stay variable (kanban standard); user may revisit the priority-flag height jump later via a consistent priority indicator.

**Brand leak (`vp-brand-tabs`):** Replaced stale demo brands ("Port City Sound & Security", "Crosscurrent") in **18 route `head` titles** + TeamPanel email domain → `BearingPro`. All tabs now `Page · BearingPro`.

**Focus rings (`qw-focus-flash`):** Swapped all **195 `focus:ring` → `focus-visible:ring`** across 38 files — ring only shows on keyboard nav, not mouse clicks. `focus:outline-none` left intact.

**Drawer standardization (new `DRAWER_DESIGN_SPEC.md`):**
- New shared **`<DrawerHeader>`** (`src/components/ui/drawer-header.tsx`): slots for `leading` (avatar), `eyebrow` (record code), `title`, `subtitle`, `onEdit`, `actions`, and a children badge row. Edit + Close render as a **matched icon pair** (bare `h-7 w-7` pencil + X, centered together) — fixes the earlier bordered-Edit-vs-floating-X misalignment.
- `SheetContent` gained a **`hideClose`** prop; drawers using `DrawerHeader` pass it so the header owns the X.
- Migrated **14 of 15 drawers** to `DrawerHeader` (contacts reference + 13 others). Remaining: `finance/invoices` (uses a justify-between header) + moving inventory view-drawer Edit from footer → header (both documented in the spec's status table).
- Also fixed: drawer close button no longer grabs a focus-visible ring on open (Radix `onOpenAutoFocus` redirects initial focus to the panel, respecting `autoFocus` inputs); added `pr-12` to every drawer header that lacked it.

**Topbar breadcrumbs (`nav-topbar-breadcrumbs`):**
- Replaced the dead-center page title with a **left-aligned breadcrumb** derived from the nav config (`navTrail` in `app-shell.tsx`). List pages → `Module / Page`; detail pages → `Module / Page (linked) / Record`. Uses the previously-unused `breadcrumb.tsx`.
- Dedupe guards: subtitle hidden when it equals the module/page crumb (fixes payments "Finance / Payments · Finance"); module crumb hidden when it equals the title (Reports/Reports). Informative subtitles (counts, dates, project tab) preserved.

**Bug fixes:**
- **FilterSelect crash on `<optgroup>`** — the Radix `FilterSelect` flattened only direct children, so an optgroup (no value) became an illegal `<SelectItem value="">`, crashing the PO Jobs filter (and its nested options never rendered). Added optgroup → `SelectGroup` + `SelectLabel` support; empty-value options skipped. Regression from the native→Radix FilterSelect conversion.

**Repo hygiene:** Untracked + gitignored stray dev-server logs (`dev-err.txt`, `dev-out.txt`, old `dev_out.txt`); broadened ignore to `dev-*.txt` / `dev_*.txt`.

**Spec'd (not built):** Per-phase project billing model — see the **Planned Feature** section above (blocked on the catalog/inventory phase attribute).

---

## Session 038 — Opportunities Page Done: Quote Auto-Advance + Kanban Drag-and-Drop

**Date:** June 12, 2026

**Completed:**

- **Quote → Opportunity auto-stage-advance — chain complete** (`src/routes/sales/quotes/_shared.tsx`):
  - `saveQuoteToDb` now advances the linked opp `site-visit → estimating` on first draft save, guarded with `.eq("stage", "site-visit")` (same proven pattern as the Sent → Negotiation advance in `$quoteId.tsx`)
  - Full pipeline chain is now automatic: draft saved → Estimating · sent → Negotiation · accepted → Closed Won
  - Closed the last "partial" item in the queued-features list

- **Drag-and-drop kanban** (`src/routes/sales/opportunities.tsx`):
  - **Native HTML5 DnD — zero new dependencies.** Chosen over `@dnd-kit` deliberately: a pipeline only cares which column a card lands in (not intra-column order), and a new dep couldn't be install-tested here against the live Vercel build. No bundle cost, no lockfile change.
  - `isClosedStage()` helper added next to `stageMeta`
  - Cards in the four open stages drag freely between columns; cards in `closed-won`/`closed-lost` have `draggable={false}` — locked in place. Every column (including empty ones) is a drop target, so an open card can be dropped *into* a closed column, just not dragged back out.
  - Drop reuses the existing `onMove → stageMutation` write path, now made **optimistic with rollback** (`onMutate` patches the `["opportunities"]` cache, `onError` restores, `onSettled` invalidates) so a dropped card snaps to its new column instead of flashing back during the refetch
  - Visual feedback: hovered column gets a primary ring; dragged card dims to 50%; draggable cards show `cursor-grab`

- **Closed cards fully locked** — the stage-move dropdown is now hidden on `closed-won`/`closed-lost` cards (renders a static `StageBadge` instead). Combined with `draggable={false}`, a closed deal can't be reopened from the kanban at all. Open-stage cards keep both drag and the dropdown.

**Architecture notes:**
- Kept the stage dropdown alongside DnD as the keyboard/touch-accessible path (native HTML5 DnD has poor touch + a11y support)
- `stageMutation` was previously invalidate-only; optimistic update was the one functional addition DnD required to feel right

**Opportunities page is now considered done** (Module Status flipped to ✅ Opps done). Quote Builder remains the only deferred Sales piece.

- **Company detail — customer panels wired** (`src/routes/crm/companies/$companyId.tsx`):
  - Replaced the two long-standing stubs ("Available after Sales/Operations module") with live data
  - **Open Opportunities**: `["company-opportunities", companyId]` — `opportunities` where `company_id = thisCompany` and `stage NOT IN (closed-won, closed-lost)`; rows link to the kanban (no opp detail route exists), show stage badge + value, sorted by value desc
  - **Active Projects**: `["company-projects", companyId]` — `projects` where `company_id = thisCompany` and `status NOT IN (completed, cancelled)`; rows deep-link to `/operations/projects/$projectId`, show code + status badge + contract value
  - Automatic via existing `company_id` FKs — no new schema, no backfill; new deals appear the moment they're created against the company
  - **Referrals panel deliberately deferred** — that's the `referred_by_company_id` relationship (builder *refers* a homeowner vs. builder *is* the customer). Additive later, reads a different column, zero rework to these panels. Decision: trade-service referrals matter, but capture-then-display can wait; customer panels are the day-one value.
  - **Opportunity deep-linking wired** — opportunity rows now pass `?opp=<id>` to `/sales/opportunities`; the page's `validateSearch` parses it and a guarded once-only effect opens that opp's drawer after the board loads, then strips the param (so it doesn't re-open on refresh/back). Ref guard prevents a refetch from re-triggering it (React #185 safety). Projects already deep-link to `/operations/projects/$projectId`. So both company-page panels now click through to the exact record.

---

## Session 035 — Scheduling Live + Project Parts List + Convert Fixes

**Date:** June 11, 2026

**Completed:**

- **Scheduling calendar wired to Supabase** (`/operations/scheduling`):
  - Migration `20260610000026`: `scheduled_jobs` (soft FK to project or work order, category/status enums, address, time slot) + `scheduled_job_techs` join table (multi-tech per event, cascade delete); 9 seed events linked to real WO/project codes; RLS on both tables
  - Scheduling page fully rewritten: `useQuery(["scheduled-jobs"])` replaces `INITIAL_JOBS` demo array; `saveMutation` handles INSERT + UPDATE with tech delete/re-insert; week nav, day columns, and tech filter all use live data
  - Dispatch drawer: work-order-only picker (projects removed as a separate scheduleable type); tech checkboxes use real member IDs; job selection auto-fills customer name + address from WO joins (falls back through contact → linked project for residential clients with no company)
  - `toHHMM()` helper normalises Postgres `time` column format (`HH:MM:SS` → `HH:MM`)
  - Query keys: `["scheduled-jobs"]`, `["user-profiles-basic"]`, `["work-orders-scheduling"]`

- **New Work Order modal: project picker added**
  - Project combobox at top of form (`["projects-wo-options"]` query); selecting a project auto-fills company, contact, and site address
  - "— Standalone (no project) —" option preserved for WOs with no project

- **Convert to Project: site address captured**
  - `convertToProject` now takes an optional `siteAddress` param and writes it to `projects.site_address`
  - Convert drawer shows a site address input step between type selection and the actual convert call
  - Default project status changed from `'scheduled'` → `'planning'` — a freshly-converted project hasn't had dates/crew assigned yet
  - Migration `20260611000001`: adds `'planning'` to `projects.status` check constraint

- **Project Parts List wired to DB**:
  - Migration `20260611000002`: `project_line_items` table (tenant_id, project_id, catalog_item_id nullable, name, qty, unit_cost, labor_hours, source, status, phase, notes); full RLS; backfill INSERT copies existing `quote_line_items` → `project_line_items` for already-converted projects via the `opportunity_id` FK trail
  - `convertToProject` now copies quote line items to `project_line_items` on every future conversion; `labor_hours` pulled live from `catalog_items` at snapshot time (denormalized)
  - `PartsPanel` fully rewritten: `useQuery(["project-line-items", projectId])`; inline cell edits save on blur/Enter via `TablesUpdate<"project_line_items">`; delete button on row hover; `insertMutation` + `deleteMutation`
  - Add Part row has catalog combobox (searches `["catalog-items-parts"]`) — selecting an item auto-fills name, unit cost, and labor hours
  - New **Labor Hrs** column: shows `qty × labor_hours` per row; summary bar shows total budgeted labor hours across all parts

**Architecture notes:**
- `labor_hours` is denormalized at add-time — catalog edits don't retroactively change project estimates
- `project_line_items` has full UPDATE/DELETE (unlike `stock_movements` and `invoice_payments` which are immutable audit trails) — PM can correct scope errors
- `budgeted_hours` on the project row is not yet auto-summed from line items — stored field, manual for now; auto-calc deferred

- **Write permissions enforced across CRM + Operations detail pages:**
  - `crm/companies/$companyId.tsx`: Edit button + notes pencil gated behind `can("crm","write")`
  - `crm/contacts.tsx`: row Edit pencil + drawer Edit button gated; `canWrite` prop on `ContactDrawer`
  - `crm/lead-inbox.tsx`: Convert/Dismiss buttons + full action footer hidden; notes `readOnly` when `!canWrite`
  - `operations/projects/$projectId.tsx`: StatusDropdown `disabled`; Edit button gated
  - `operations/work-orders/$workOrderId.tsx`: StatusDropdown `disabled`; Edit button gated

- **Project Phases tab wired to live work orders** (`/operations/projects/$projectId`):
  - `ProjectPhasesTab` replaces demo `PhasesPanel`; `useQuery(["project-work-orders", projectId])` fetches WOs where `project_id = projectId`
  - Phase table shows status badge, assigned tech avatar, scheduled date, budgeted hours; row click navigates to WO detail
  - `AddPhaseModal`: Dialog inherits project's company/contact/site address; inserts to `work_orders` with `project_id` FK; inline error display if Supabase insert fails; `onInteractOutside` blocked while saving
  - `insertProjectPhase` invalidates both `["project-work-orders", projectId]` and `["work-orders"]` on success

- **Work Order detail: project back-nav** — back link shows parent project code + name (links to `/operations/projects/$projectId`) if WO has `project_id`; falls back to "All Work Orders" for standalone WOs

- **New Work Order modal: project picker** (from user's session 035 commit):
  - Project combobox auto-fills company, contact, site address when a project is selected
  - "— Standalone (no project) —" option preserved
  - Query key `["projects-wo-options"]` (avoids collision with `["projects"]`)

- **`src/data/projects.ts`: `"planning"` status added** — `ProjectStatus` type, `statusMeta` (sky-blue badge), `STATUS_OPTIONS` filter; resolves the pending "step 3" from the planning status migration

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

## Session 033 — Finance Invoices / Payments Live

**Date:** June 10, 2026

**Completed:**

- **Migration 20260610000022**: `invoices`, `invoice_line_items`, `invoice_payments` tables with full RLS; `set_invoices_updated_at` trigger; `invoice_line_items` and `invoice_payments` access via parent invoice tenant check or direct `tenant_id`
- **Migration 20260610000023**: 10 seed invoices + 55 line items + 6 payments for test tenant; `linked_project_id` matched to "Surgical Center A/V Overhaul" via ilike (only seed project name overlap); other project links left null since invoice demo companies don't match seeded CRM companies
- **Invoices page fully rewritten** (`/finance/invoices`): wired to Supabase — no more demo data
  - `useQuery(["invoices"])` fetches invoices with nested `invoice_line_items` + `invoice_payments`
  - `saveMutation` updates invoice header fields (status, dates, customer, linked job, notes)
  - `createMutation` inserts draft invoice; auto-generates invoice number from max(existing) + 1; auto-calculates due date from payment terms
  - `JobCombobox` uses separate `["projects-basic"]` + `["work-orders-basic"]` queries (distinct keys to avoid collision)
  - `useRef` initialized flag in `InvoiceDrawer` prevents form reset on refetch
  - Date inputs use `type="date"` (ISO format) for edit mode; `fmtDate()` for display
- **Payments page fully rewritten** (`/finance/payments`): wired to Supabase — no more demo data
  - Shares `["invoices"]` cache with invoices.tsx (same select shape — safe)
  - `outstanding` and `allPayments` derived via useMemo from shared cache
  - `collectMutation` in `CollectTab`: inserts to `invoice_payments`, then updates `invoices.amount_paid` / `balance_due` / `status`; status logic: balance ≤ 0 → "paid", partial payment → "partial"
  - Stat bars compute from live data; month filters use ISO date prefix matching
  - Stripe tab remains UI-only (payment link flow — actual Stripe webhook integration deferred)
- **Bug fixed (Session 033 start)**: vendors page crashing on Vercel — `["purchase-orders"]` query key shared with purchase-orders.tsx but different select shapes → stale full-shape data caused TypeError in vendorStats useMemo. Fixed by renaming vendors key to `["purchase-orders-basic"]`. Same pattern as Session 026 roles collision.

**Patterns established:**
- `["invoices"]` is the canonical full-shape key for all invoice reads — both invoices.tsx and payments.tsx use identical select, safe to share
- `collectMutation` two-step: INSERT payment → UPDATE invoice totals + status in one mutation function; no separate RPC needed
- `invoice_payments` has no UPDATE/DELETE policy — payments are immutable (same principle as stock_movements)
- `invoice_line_items` RLS via parent invoice FK check (no direct `tenant_id` column on line items)

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

---

## Session 034 — Write Permissions Enforcement + Query Key Safety + Connected Seed Data

**Date:** June 10, 2026

**Completed:**

- **Write permissions enforced across all live pages** — every page now respects `can(module, "write")` from `usePermissions()`:
  - `service/service-tickets.tsx`: Mark Resolved + Close Ticket hidden for read-only; notes textarea `readOnly`
  - `sales/opportunities.tsx`: stage-move badge is static for read-only; Convert button + Edit button hidden; notes `readOnly`
  - `settings/company.tsx`: Save bar hidden for read-only
  - `settings/roles.tsx`: name input `readOnly`; color swatch + module permission buttons render as inert `<div>` when read-only; delete button + AddRoleRow hidden
  - `settings/team-members.tsx`: Invite button hidden; row click disabled; Remove/Reactivate buttons hidden; EditPanel + InvitePanel gated

- **Vendors page crash fixed** — root cause: `purchase-orders.tsx` used `queryKey: ["vendors"]` with `select("id, name")` (partial); `vendors.tsx` uses `["vendors"]` with `select("*")` (full). Cache poisoning → TypeError in `vendorStats` useMemo. Fixed by renaming to `["vendors-basic"]` in purchase-orders.tsx.

- **Query key collision prevention** — three-layer defense added:
  - Naming rule in `CLAUDE.md`: bare key = full select, `-basic` suffix = partial select
  - `scripts/check-query-keys.cjs` — scans all route files for duplicate keys; prints files to verify select shapes
  - `"check:keys"` script added to `package.json` → `bun run check:keys`
  - Script caught another collision: `operations/team.tsx` `["roles"]` partial vs `settings/roles.tsx` `["roles"]` full → fixed by renaming to `["roles-basic"]`

- **Migration 20260610000024** — full reseed of operational data with a connected story:
  - Deleted: opportunities, projects, work_orders, vendors, purchase_orders, po_line_items, invoices, invoice_line_items, invoice_payments
  - Re-inserted everything using the 7 actual CRM companies (Northbeam, Pinecrest, Helio, Vertex, Halcyon, Cinder, Arden)
  - All 5 projects carry `opportunity_id` FK to originating opportunity
  - All POs carry `linked_project_id` to their project
  - All invoices carry `linked_project_id` where a project exists
  - Companies/contacts/leads/service tickets/service plans/catalog/stock untouched

**Work order architecture clarified:**
- Work Order = project task (child of a project, one of many phases) OR standalone job (no project, single-phase)
- Standalone path: Lead → Contact → Work Order → Invoice → Payment (no quote, no project)
- Full path: Lead → Contact → Opportunity → Quote* → Project → Work Orders → Invoice → Payment
- *Quote Builder still deferred

**Query key collisions seen so far (4 total):**
- `team-members.tsx` `["roles"]` partial vs `roles.tsx` `["roles"]` full
- `vendors.tsx` `["purchase-orders"]` full vs `purchase-orders.tsx` `["purchase-orders"]` partial
- `purchase-orders.tsx` `["vendors"]` partial vs `vendors.tsx` `["vendors"]` full
- `operations/team.tsx` `["roles"]` partial vs `settings/roles.tsx` `["roles"]` full

---

## Session 037 — Design Polish: Status Colors, Glow Effect, Real Role in Sidebar

**Date:** June 12, 2026

**Completed:**

- **Status color token system** (`src/lib/status-colors.ts`):
  - Created a single source of truth for all status badge colors — 11 named tokens (`SC.neutral`, `SC.blue`, `SC.sky`, `SC.violet`, `SC.amber`, `SC.yellow`, `SC.orange`, `SC.green`, `SC.red`, `SC.teal`, `SC.emerald`)
  - Eliminated two competing color systems (one using raw Tailwind strings, one using `bg-X/15 text-X-600 dark:text-X-400` patterns with inconsistent dark mode variants)
  - Updated all consumers: `src/data/projects.ts`, `src/data/service-tickets.ts`, `src/data/service-plans.ts`, `src/routes/finance/invoices.tsx`, `src/routes/crm/lead-inbox.tsx`, `src/routes/sales/opportunities.tsx`
  - `tsc --noEmit` clean after all changes

- **Opportunities page crash fixed (React error #185)**:
  - Root cause: `const { data: dbOpps = [] }` — destructuring default creates a new `[]` reference every render while loading. `useMemo([dbOpps])` recomputed every render → `useEffect([opps])` fired → `setMeta` → context re-render → new `[]` → infinite loop
  - Fix: removed `= []` default; use `(dbOpps ?? [])` inside `useMemo` instead — `dbOpps` is `undefined` during load, stable reference after
  - Added `error.message` display to `ErrorComponent` in `__root.tsx` to surface minified React error text during debugging
  - Same root cause as the `projects/$projectId.tsx` fix in Session 026

- **Glow effect extended** (`qw-glow-effect`):
  - `shadow-glow` was previously used only on the BP logo badge
  - Extended to: `Button` component default variant (`src/components/ui/button.tsx`), topbar New button (`app-shell.tsx`), Sign In / Create Account submit buttons (`auth/login.tsx`, `auth/signup.tsx`), 404 "Go home" and error "Try again" buttons (`__root.tsx`)
  - Intentionally excluded: view-toggle buttons that use `bg-primary` for active state — those are 28px icon toggles, not CTAs

- **Double `+ +` prefix removed** (`qw-double-plus`):
  - Topbar New button already renders a Plus icon; pages that set `newLabel: "+ New X"` produced "++ New X"
  - Fixed in: `finance/invoices.tsx`, `crm/companies/index.tsx`, `inventory/vendors.tsx`, `sales/quotes/index.tsx`

- **Live role name in sidebar** (`qw-real-role`):
  - Sidebar user panel was hardcoded to "Admin · Workspace" for every user
  - Extended `PermissionsContext`'s existing `user_profiles` query to also fetch `roles!role_id(name)` — no extra network request
  - `PermissionsContextValue` now exposes `roleName: string | null`; `{ permissions, roleName }` wrapped in `useMemo` on the `roles` reference for stability
  - `app-shell.tsx` destructures `roleName` from `usePermissions()` and renders `{roleName ?? "—"} · {tenant?.name ?? "Workspace"}` — uses the already-loaded `["tenant"]` cache for the company name

---

## Session 036 — FormSelect: Replace All Native Dropdowns

**Date:** June 12, 2026

**Completed:**

- **New component: `src/components/ui/form-select.tsx`** — Radix-based drop-in replacement for native `<select>` that accepts `<option>` children identically to a native select. Handles:
  - Controlled (`value`/`onChange`) and uncontrolled (`defaultValue`/`name`) modes
  - Empty-value sentinel (`__none__`) — Radix `SelectItem` doesn't allow `value=""`; options with `value=""` are mapped through a sentinel and back transparently
  - FormData compat — renders a `<input type="hidden" name={name} value={current} />` so `new FormData(form)` still works
  - RHF compat — `onBlur` typed as `(...args: any[]) => void` to accept RHF's `ChangeHandler` from `register()` spreads
  - `className` prop forwarded to `SelectTrigger` via `cn()` (tailwind-merge) so per-site size/color overrides work

- **Replaced all 80 native `<select>` elements across 22 route files** — zero native selects remain in `src/routes/`:
  - CRM: contacts, companies/index, companies/$companyId, lead-inbox
  - Sales: opportunities, quotes/new, quotes/$quoteId
  - Operations: projects/index, projects/$projectId, work-orders/index, work-orders/$workOrderId, scheduling, team
  - Service: service-tickets, service-plans
  - Inventory: catalog, stock, purchase-orders, vendors
  - Finance: invoices
  - Settings: company, team-members

- **Fixed pre-existing CRM typo** — previous session introduced `<FormSelectvalue=` (missing space) across 12 instances in contacts.tsx, companies/index.tsx, and companies/$companyId.tsx; all fixed.

**Patterns established:**
- `{...field("key")}` custom helpers (vendors, invoices) are safe to spread directly onto FormSelect — no `ref`
- `{...field}` RHF spreads must use explicit props: `value={field.value} onChange={field.onChange} onBlur={field.onBlur}` — avoids passing `ref` which FormSelect doesn't accept
- `register("field")` spreads: destructure `ref` out first — `const { ref: _r, ...reg } = register("field")`
- Options without a `value` prop (e.g. `<option key={t}>{t}</option>`) must add an explicit `value={t}` — FormSelect reads from `el.props.value`, not from children text
