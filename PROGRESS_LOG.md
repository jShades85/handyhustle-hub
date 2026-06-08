# PROGRESS_LOG.md

## HandyHustle Hub — Trade Service SaaS — Session Log

> Updated at the end of every chat session. New sessions read this before writing any code.

---

## Read First

Before writing any code in a new session, read these files:

- @PROGRESS_LOG.md — current status, what's done, what's next, open questions
- @PROJECT_CONTEXT.md — full architecture, decisions, and conventions

---

## Current Status

**Phase:** Frontend UI Build
**Last Updated:** Session 014
**Last Session:** Session 014

---

## Session Log

---

### Session 014 — Finance Module: Payments

**Date:** June 8, 2026
**Focus:** Full build of the Payments page (Finance module)

**Completed:**

- **`src/routes/payments.tsx`:** Full build from the placeholder — three-tab layout:
  - **Outstanding tab:** AR aging view, overdue invoices sorted first (then by due date asc). Stat bar: Total Outstanding / Overdue (red-accented, amount + count) / Partial Remaining / Open Invoices. Table: Invoice # / Customer / Project / Total / Paid / Balance Due (red + days overdue on overdue rows) / Due Date / Status / Collect button. "Collect →" per row jumps to Collect tab with invoice pre-selected.
  - **All Payments tab:** Ledger of all payment records derived from invoice history. Stat bar: Total Collected / This Month / Last Month / Payment Count. Filter bar: search (invoice #, customer, reference) + method dropdown. Table: Date / Invoice # / Customer / Method (color-coded badge) / Reference / Amount (green `+$`). Sorted newest-first.
  - **Collect Payment tab:** Stripe-first payment collection form. Invoice combobox (outstanding invoices only, with status badge and balance in dropdown). Invoice summary card once selected (customer, total/paid/balance). Amount field pre-filled to balance due with partial-payment warning when editing. Four method cards: Stripe (Recommended badge), Check, Wire, Cash. Stripe panel shows Stripe brand color, fee disclosure (2.9% + 30¢ card / 0.8% ACH), email field, Copy Link + Send via Email buttons with distinct success screens. Check/Wire show date + reference number fields. All non-Stripe paths show a "Payment Recorded" confirmation screen.
- **Payment processor decision: Stripe** — handles card + ACH in one integration, payment links for remote commercial clients, Stripe Terminal for future on-site collection. Best fit for AV/security integrators billing commercial NET 30 accounts.
- **Dev environment fix:** `node_modules` was missing in Codespaces — ran `npm install --legacy-peer-deps`. TypeScript passes clean with zero errors.

**Design Decisions Made:**

- Stripe is the recommended payment processor — framed as "Recommended" in the method selector
- "Collect →" in the Outstanding table is the primary AR action — drives users to the Collect tab with context
- Stripe + Check + Wire + Cash are the four collection methods — matches how AV/security integrators actually get paid (links for commercial clients, checks from institutions, wire for large projects)
- Collect Payment form is a single centered column — mirrors Stripe's own payment link creation flow, more focused than a two-column layout
- Partial payment shows a warning with remaining balance — prevents accidental under-collection

**Next Session Goal:**

- Settings module — Service Plan Tier Features config page (tenant-configurable per-tier inclusions: response time, visits, covered systems, extras)
- Or Reports module — placeholder with key report categories

**Open Questions:**

- Supabase project status — still needed before backend session
- Demo data consolidation into single demo-data.ts before backend work
- Route structure inconsistency — flat vs nested routes — reconcile in consistency pass

**Schema Notes:**

- payments: id, tenant_id, invoice_id, date, amount, method, reference, notes, recorded_by
- (invoice_payments already partially modeled in invoices schema from Session 013)

**Schema Changes This Session:** None (UI only)
**New Env Variables This Session:** None

---

### Session 013 — Finance Module: Invoices

**Date:** June 7, 2026
**Focus:** Full rebuild of the Invoices page (Finance module)

**Completed:**

- **`src/data/invoices.ts`:** New data file with types (`InvoiceStatus`, `InvoiceLineItem`, `InvoicePayment`, `Invoice`) and 10 demo invoices covering all statuses (draft, sent, partial, overdue, paid) with realistic PCSS line items, tax rates, and payment history.
- **`src/routes/invoices.tsx`:** Full rebuild from the Lovable baseline:
  - Stat bar: Outstanding balance / Overdue (amount + count, red-accented when non-zero) / Collected MTD / Total Invoices
  - Status tabs: All / Draft / Sent / Partial / Overdue / Paid with live counts
  - Filter bar: search by invoice #, company, or project + customer dropdown
  - Table: Invoice # / Customer / Project / Total / Balance Due / Due Date / Status — full rows clickable
  - View Sheet: dates/terms grid, linked project, line items table, totals (subtotal, tax, total, amount paid, balance due), payment progress bar for partials, payment history with method + reference, notes
  - Edit Sheet: status, terms, dates, customer, contact, project, notes; line items shown read-only (quote builder integration deferred)
  - New Invoice modal: customer, contact, linked project (Popover + Command combobox), issue date, payment terms, notes
- **Linked project combobox in New Invoice modal:** `Popover + Command` autocomplete — same pattern as PO job combobox. Searches by code, name, or customer. Projects / Work Orders groups. Clear selection item when something is chosen.

**Design Decisions Made:**

- Invoices use Sheet drawer (view/edit) — same pattern as Vendors and POs
- Balance Due column goes red on overdue rows — most actionable signal in the table
- Line item editing in the edit drawer is deferred until quote builder integration — shown read-only with a note
- New Invoice modal uses combobox for linked project — consistent with PO linked job field

**Next Session Goal:**

- Finance module — Payments page (stat bar, payment list, filter by method/status, link back to invoices)

**Open Questions:**

- Supabase project status — still needed before backend session
- Demo data consolidation into single demo-data.ts before backend work
- Route structure inconsistency — flat vs nested routes — reconcile in consistency pass

**Schema Notes:**

- invoices: id, tenant_id, number, status, company_id, contact_id, project_id, issued_date, due_date, payment_terms, subtotal, tax_rate, tax_amount, total, amount_paid, balance_due, notes
- invoice_line_items: id, invoice_id, description, qty, unit_price, total
- invoice_payments: id, invoice_id, date, amount, method, reference

**Schema Changes This Session:** None (UI only)
**New Env Variables This Session:** None

---

### Session 012 — Purchase Orders & Vendors

**Date:** June 7, 2026
**Focus:** Complete Inventory module — Purchase Orders page and Vendors page

**Completed:**

- **Purchase Orders page (`/purchase-orders`):** Stat bar (Total POs / Open / Overdue / Total Value), status tabs (All / Draft / Sent / Partial / Received / Cancelled), filter bar with search + vendor + job filters, list table with tracking number links (carrier auto-detected from number format), view drawer with status timeline + receipt progress bar + line items, edit/new drawer with full form and line item editor
- **Tracking number links:** Carrier auto-detected — `1Z…` prefix → UPS, 12–22 digits → FedEx, otherwise Google search. `stopPropagation` on link click prevents row drawer from opening.
- **Linked job field:** Connects a PO to a project or work order. All line items on the PO are considered attached to that job. Filter bar includes a Job filter with "General Stock" option for unlinked POs.
- **Autocomplete comboboxes:** Replaced both the linked job `<select>` and the catalog `<select>` with `Popover + Command` comboboxes. Job combobox searches by code, name, and customer with Projects / Work Orders groups. Catalog combobox searches by name and SKU, includes "Add custom item…" at the bottom.
- **`src/data/purchase-orders.ts`:** Types (`POStatus`, `POLineItem`, `Vendor`, `PurchaseOrder`) and 11 demo POs covering all statuses with realistic line items and linked jobs.
- **Vendors page (`/vendors`):** Stat bar (Total Vendors / Preferred / Active POs / YTD Spend), card + list view toggle, category and status filters, Sheet drawer with view mode (stats, contact info, rep info, notes) and edit mode, New Vendor modal.
- **`src/data/vendors.ts`:** 7 vendor records (ADI, Anixter/Wesco, Axis, Verkada, Biamp, Leviton, Middle Atlantic) with full contact, account rep, payment terms, and YTD stats.

**Design Decisions Made:**

- Tracking carrier auto-detected from number format — no need to store carrier separately
- Linked job stores only `linkedJobId` — `findJob()` helper looks up from `PROJECTS` at render time, no denormalization
- Cancelled jobs excluded from the linked job selector
- Vendors uses a Sheet drawer (not a full detail page) — vendor detail is simpler than a company record
- Stat bar pattern (icon chip + label + value, right-bordered blocks) established on both POs and Vendors — user wants this applied to other list pages going forward
- `__clear__` sentinel in job combobox always shown by the custom filter function regardless of search input

**Next Session Goal:**

- Finance module — Invoices polish (Lovable baseline needs PCSS rebrand + detail page), Payments page
- Or Settings — Service Plan Tier Features config page

**Open Questions:**

- Supabase project status — still needed before backend session
- Demo data consolidation into single demo-data.ts before backend work
- Route structure inconsistency — flat vs nested routes — reconcile in consistency pass

**Future / Deferred:**

- When a PO is linked to a job, line items should auto-populate from the job's unallocated parts list — deferred until projects have a `parts[]` field in demo data

**Schema Notes:**

- purchase_orders: id, tenant_id, vendor_id, po_number, status, order_date, expected_date, received_date, vendor_order_number, tracking_number, linked_job_id, notes
- po_line_items: id, po_id, catalog_item_id, description, sku, qty_ordered, qty_received, unit_cost
- vendors: id, tenant_id, name, category, status, account_number, payment_terms, website, phone, email, city, state, rep_name, rep_phone, rep_email, notes

**Schema Changes This Session:** None (UI only)
**New Env Variables This Session:** None

---

### Session 011 — Catalog & Stock Polish

**Date:** June 7, 2026
**Focus:** Second pass on Catalog and Stock pages — view mode, nav cleanup, bug fixes

**Completed:**

- **Catalog — view mode:** Row click now opens a read-only view panel (manufacturer badge, category chip, active status, description, 3-stat pricing bar with Cost / MSRP / Margin %). Edit button in view panel footer switches to edit form in-place. Hover Edit button on row stays as a direct shortcut to edit mode.
- **Catalog — duplicate button fix:** Removed inline `+ New Item` button from drill-in toolbar (global topbar button handles it)
- **Stock — removed Parts & Materials:** Removed nav entry, replaced `/inventory` index route with a redirect to `/inventory/stock`
- **Stock — view mode:** Row click opens view panel with on-hand qty as the dominant element (large colored number, status badge), stock level bar with min/max markers, location, SKU, unit cost, value on hand, and movement log. Edit button switches to edit form.
- **Stock — Needs Attention filter fix:** `needs_attention` was being set by the alert banner but wasn't in the status dropdown — select showed blank. Added as first option in the dropdown.
- **Stock — Value on Hand column:** Added `qty × unit cost` column to the table as secondary context alongside On Hand qty.
- **Stock — movement log:** Moved from edit form to view panel where it belongs as read-only audit history.
- **Stock — duplicate button fix:** Removed inline `+ New Item` button from drill-in toolbar.
- **Stock — adjust popover bug:** Clicks inside the AdjustCell popover content were bubbling up to the row and opening the view drawer. Fixed with `stopPropagation` on `PopoverContent`.

**Design Decisions Made:**

- View-before-edit is now the standard pattern across list pages — row click = view, hover Edit = shortcut to edit
- On-hand qty is the primary reason someone opens the Stock page — it's the dominant element in the view panel, not value
- Value on Hand is useful secondary context in the table and view panel, not the primary driver
- Parts & Materials was a leftover nav entry from Session 004 IA — Stock supersedes it entirely

**Next Session Goal:**

- Purchase Orders page (Inventory module)

**Open Questions:**

- Supabase project status — still needed before backend session
- Demo data consolidation into single demo-data.ts before backend work
- Route structure inconsistency — flat vs nested routes — reconcile in consistency pass

**Schema Notes:**

- purchase_orders: id, tenant_id, vendor_id, po_number, status, order_date, expected_date, received_date, notes, line_items[]
- po_line_items: id, po_id, catalog_item_id, stock_item_id, description, qty_ordered, qty_received, unit_cost

**Schema Changes This Session:** None (UI only)
**New Env Variables This Session:** None

---

### Session 010 — Service Module

**Date:** June 7, 2026
**Focus:** Build Service Tickets and Service Plans pages

**Completed:**

- Built Service Tickets page (status tabs, priority/category/tech filters, table list, detail drawer with notes + activity, new ticket modal)
- Created `src/data/service-tickets.ts` with 8 realistic demo tickets
- Built Service Plans page (stat bar with MRR/ARR/expiring count, status tabs, card grid view, detail drawer with tier + status selects, new plan modal)
- Created `src/data/service-plans.ts` with 8 demo plans across all four tiers
- Fixed drawer header overlap (plan ID colliding with Sheet close button — restructured header with `pr-12`)
- Switched Service Plans from table to card grid (tier/status more visually prominent, better for contract-style records)

**Design Decisions Made:**

- Service Tickets: list/table view — correct pattern for a reactive queue (mirrors Zendesk/Freshdesk)
- Service Plans: card grid view — plans are account-like contracts, cards make tier and status more prominent
- Plan tiers: Essential / Standard / Professional / Elite
- Tier and status are editable inline from the drawer via selects
- Service Plans stat bar: Active Plans, MRR, ARR, Expiring Soon (amber when non-zero)

**Next Session Goal:**

- Settings — Service Plan Tier Features config page (tenant-configurable per-tier inclusions: response time, visits, covered systems, extras — for internal reference and eventual client-facing use)
- Then Vendors and Purchase Orders (Inventory)

**Open Questions:**

- Supabase project status — still needed before backend session
- Demo data consolidation into single demo-data.ts before backend work
- Route structure inconsistency — flat vs nested routes — reconcile in consistency pass

**Schema Notes:**

- service_tickets: id, tenant_id, customer_id, contact_id, category, issue, priority, status, assigned_to, on_service_plan, date_created, date_due, notes
- service_plans: id, tenant_id, customer_id, tier, covered_systems[], mrr, billing_cycle, sla_response, visits_per_year, visits_used, start_date, renewal_date, status, account_manager_id, notes

**Schema Changes This Session:** None (UI only)
**New Env Variables This Session:** None

---

### Session 009 — Scheduling Part 2 & Planner Page

**Date:** June 7, 2026
**Focus:** Complete Scheduling page interactivity, build Planner page

**Completed:**

- Scheduling Part 2 — overlap handling, popovers, filter interactivity
- Planner page — Gantt + Resource View + Capacity tabs

**Next Session Goal:**

- Vendors page (Inventory)
- Purchase Orders page (Inventory)

**Design Decisions Made:** None noted

**Open Questions:**

- Supabase project status — still needed before backend session
- Demo data consolidation into single demo-data.ts before backend work
- Route structure inconsistency — flat vs nested routes — reconcile in consistency pass

**Schema Changes This Session:** None
**New Env Variables This Session:** None

---

### Session 008 — Inventory Module, Operations Pages, Dev Environment

**Date:** June 7, 2026
**Focus:** Inventory builds, Operations pages, local dev environment setup

**Completed:**

- Built Catalog page (manufacturer grid default view, drill-in list,
  all items toggle, new/edit drawer with cost/MSRP/labor/image upload placeholder)
- Built Quote Templates standalone page (3 demo templates, inline edit,
  default template logic)
- Built Quote Builder (section-based line items, catalog search modal,
  product + labor sub-lines, inline editing, margin %)
- Built New Quote route (/sales/quotes/new) wired to + New Quote button
- Built Stock page (manufacturer grid, drill-in list, stock alerts banner,
  adjust qty popover, movement log, catalog item linking)
- Fixed Stock drawer — catalog-linked fields are read-only with lock icons
- Fixed Team page drawer crash (FormControl missing FormItem wrapper)
- Built Work Orders detail page (simplified Project shell, flat task
  checklist, parts, team, activity panels)
- Built Team page (card grid, full member drawer, skills/certs tag inputs,
  admin-only pay rate section, assigned jobs)
- Built Scheduling page Part 1 (calendar grid shell, week/day views,
  demo data, job block positioning, schedule drawer)
- Set up local VS Code desktop environment (Git Bash, extensions,
  Settings Sync, resolved Bun/Windows install issues)
- Git pushed all sessions 006-008 work to main

**Not completed this session (usage limit):**

- Scheduling Part 2 (overlap handling, popovers, filter interactivity)
- Planner page (Gantt + Resource + Capacity)

**Next Session Goal:**

- Scheduling Part 2 first (surgical update to existing file)
- Planner page (full session — Gantt + Resource View + Capacity)
- Then Vendors, Purchase Orders (Inventory)

**Design Decisions Made:**

- Stock page named "Stock" not "Parts & Materials" — universal across trades
- Catalog is source of truth — linked stock items inherit and lock fields
  above stock levels section
- Labor shows as separate line item below product on quotes
- Quote Templates live in Settings (standalone page for now, wire to
  Settings shell later)
- Manufacturer-first view for both Catalog and Stock (mirrors D-Tools/
  industry standard)
- npm install used for local Windows dependency install (Bun esbuild
  lifecycle script bug on Windows) — Bun used for everything else
- Git Bash set as default terminal in VS Code (replaces PowerShell)

**Open Questions:**

- Supabase project status — still needed before backend session
- Demo data consolidation into single demo-data.ts before backend work
- Route structure inconsistency — some routes flat (/scheduling),
  some nested (/operations/projects) — reconcile in consistency pass

**Schema Notes:**

- catalog_items: id, tenant_id, manufacturer_id, name, sku, category,
  description, cost, msrp, unit_of_measure, has_labor, labor_hours,
  labor_rate_override, image_url, is_active
- manufacturers: id, tenant_id, name, logo_url
- stock_items: id, tenant_id, catalog_item_id, name, sku, category,
  unit_cost, unit_of_measure, manufacturer_name, location_bin,
  qty_on_hand, min_stock_level, max_stock_level, image_url, is_active
- stock_movements: id, tenant_id, stock_item_id, type, qty_delta,
  note, job_reference, created_by, created_at
- team_members: id, tenant_id, user_id, name, role, email, phone,
  skills[], certifications[], pay_rate, pay_type, availability,
  start_date, is_active
- scheduled_jobs: id, tenant_id, job_type, job_id, category,
  customer_name, address, date, start_time, end_time, status, notes
- scheduled_job_techs: id, scheduled_job_id, team_member_id

**Schema Changes This Session:** None (UI only)
**New Env Variables This Session:** None

---

### Session 007 — Projects Module & Navigation Updates

**Date:** June 6, 2026
**Focus:** Projects module UI build, Work Orders, Planner section, nav decisions

**Completed:**

- Built Projects list page (list view only, filters by status, search, New Project button)
- Built Project detail page (full page, header with status/dates/value, tabbed layout)
- Built Phases & Tasks panel (phase templates dropdown, collapsible phases, flat checklist for Work Orders)
- Built Parts List panel (inline editing, summary bar, source/status badges)
- Built Team panel (member list, roles, add member stub)
- Built Activity Feed panel (typed activity items, add note input)
- Wired all panels into Project detail tabs
- Built Work Orders list page (reuses Projects shell, list view only, no Type column)
- Built Work Orders detail route (reuses Project detail component, projectType='work_order')
- Added Planner section to Operations nav — single link, tabs inside page (Gantt / Resource View / Capacity), all coming soon states
- Decided against sidebar sub-items — flattened Planner to tabs, keeps nav consistent

**Design Decisions Made:**

- Projects list view only — no kanban, field managers scan and click
- Opportunity → Project conversion triggered by Quote acceptance — "Convert to Project" button placeholder on Quote detail, source_quote_id field on Project header
- Phase templates are tenant-configured — no hardcoded defaults, template selector in UI with static placeholders for now
- Work Orders use same shell as Projects with projectType flag — hides phases, shows flat task checklist
- Planner uses tab pattern (Gantt / Resource View / Capacity) not sidebar sub-items — consistent with rest of nav
- Planner is fully placeholder — Gantt needs real phase date data, Resource View needs team assignments, Capacity needs time tracking

**Next Session Goal:**

- Inventory module — Catalog first (quote builder depends on it)
- Catalog: list of products/services a tenant sells, with pricing, units, categories
- Then Quote Builder — interactive line item builder pulling from Catalog

**Open Questions:**

- Supabase project status — created yet? Keys available?
- Auth approach for v1 — email/password, magic link, or both?
- Tenant onboarding minimum fields — company name, trade type, timezone?
- Backend session is getting close — almost every module will need real data after Catalog + Quote Builder

**Schema Notes (for backend session):**

- projects table: id, tenant_id, name, status, type, customer_id, site_address, source_quote_id, opportunity_id, contract_value, budgeted_cost, actual_cost, start_date, target_end_date, actual_end_date
- phases table: id, tenant_id, project_id, name, order, status, budgeted_hours, logged_hours
- tasks table: id, tenant_id, phase_id, project_id, title, status, assignee_id, due_date, estimated_hours, actual_hours
- parts table: id, tenant_id, project_id, phase_id, name, qty, unit_cost, source (stock/special_order), status
- project_team table: id, tenant_id, project_id, user_id, role
- phase_templates table: id, tenant_id, name, phases (jsonb array) — tenant-configurable
- activity_feed table: id, tenant_id, project_id, type, actor_id, description, created_at

**Schema Changes This Session:** None (UI only)
**New Env Variables This Session:** None

---

### Session 006 — CRM & Sales Module Build-Out

**Date:** June 5, 2026
**Focus:** CRM and Sales module UI build, design decisions, page improvements

**Completed:**

- Built Lead Inbox page (list view, filters, detail drawer, new lead modal)
- Built Contacts page (list view, filters, detail drawer, commercial/residential split, new contact modal)
- Built Companies page (card/list toggle, full company detail page with activity feed, contacts, opportunities, projects, invoices)
- Improved Opportunities page (removed Lead column, added filter bar, view toggle, detail drawer with activity feed)
- Improved Quotes & Estimates (filter bar, full detail page, grouped/flat line item toggle, grouped collapsed by default)
- Discussed and resolved key design decisions around Lead → Contact → Opportunity conversion flow

**Design Decisions Made:**

- Leads are pre-CRM — they become Contacts only when converted to an Opportunity
- Contacts have a Commercial/Residential customer type — residential contacts have no company
- Commercial/Residential identified by icon in list view — text badges removed as redundant
- Companies page is commercial accounts only — residential managed through Contacts
- Quote detail is a full page, not a drawer — quotes can be too long for a side panel
- Grouped view is default on quote detail — collapsed sections show summary at a glance
- Quote builder will be built after Inventory/Catalog is complete — catalog is the line item source
- Quotes created from Opportunities will pre-fill company, contact, opportunity automatically (v2)
- Tenant admins will be able to define custom Contact Types in Settings (noted for schema design)

**Next Session Goal:**

- Operations module — Projects and Work Orders
- Then Inventory — Catalog first (quote builder depends on it)
- Then return to build interactive quote builder

**Open Questions:**

- Quote builder UX — how should line items be searched and added from Catalog?
- Should Work Orders have a different layout than Projects or share the same pattern?

**Schema Changes This Session:** None
**New Env Variables This Session:** None

---

### Session 005 — Navigation IA Finalization & Home Machine Setup

**Date:** June 5, 2026
**Focus:** Navigation IA review, module planning, sidebar update

**Completed:**

- Set up home machine dev environment (Bun installed, switched to npm due to Bun/Windows compatibility issues)
- Identified Codespaces as primary dev environment going forward
- Pushed uncommitted Session 004 fixes (opportunities scrollbar, styles.css) from Codespaces to main
- Conducted full review of Sales and CRM modules against trade service industry best practices
- Finalized and locked navigation information architecture:
  - Reordered: CRM now comes before Sales (relationship before deal)
  - Reordered pages within Sales to follow deal lifecycle
  - Moved Catalog from Sales to Inventory
  - Added Lead Inbox to Sales
  - Added Work Orders to Operations
  - Added Service as a new module (Service Tickets, Service Plans)
  - Added Purchase Orders to Inventory
  - Kept Sales and CRM as separate modules
- Updated sidebar navigation to match final IA
- Created placeholder route files for all new pages
- Confirmed nav rendering correctly in browser

**Design Decisions Made:**

- CRM before Sales — relationship exists before the deal
- Sales and CRM stay separate — different workflows, different cadences
- Catalog lives in Inventory — it's configuration/reference, not a sales workflow step
- Service is its own module — recurring service revenue is distinct from project work
- Work Orders added to Operations — covers single-visit service calls vs full projects
- Purchase Orders added to Inventory — closes the loop between vendors and stock

**Next Session Goal:**

- Build out Projects module UI (list view + detail view)
- Define data fields from UI to drive schema design
- Schema follows UI decisions, not the reverse

**Open Questions:**

- Confirm Supabase project is active and keys are available for when backend work begins
- Define user roles formally
- Decide on role-based dashboard variants

**Schema Changes This Session:** None
**New Env Variables This Session:** None

---

### Session 004 — Frontend Build & UI Shell

**Date:** June 5, 2026
**Focus:** Dev environment setup, frontend UI build, navigation IA, dashboard

**Completed:**

- Set up GitHub Codespaces as remote dev environment
  - Installed Bun, confirmed bun dev running
  - Installed Claude Code extension in Codespaces
  - Confirmed works identically to local VS Code setup
- Audited full Lovable baseline:
  - styles.css — Linear-inspired dark oklch token system, already production quality
  - app-shell.tsx — full sidebar, nav, command palette, collapsible, topbar
  - ui-bits.tsx — PageHeader, Tab, StageChip, PriorityDot, Avatar, StatCard, Sparkline already built
  - routes — all major module pages already stubbed with real demo data
  - Key finding: Lovable's index.tsx was always a blank placeholder — no dashboard existed
  - Key finding: Opportunities, Projects, Quotes pages are production-quality with demo data
- Added light mode token set to styles.css (.light class with full oklch token set)
- Built src/hooks/useTheme.ts — reads/writes localStorage key 'hhh-theme', resolves system preference, applies light/dark class to html element
- Built src/components/ui/ThemeToggle.tsx — cycles light → dark → system, lucide-react icons
- Fixed hardcoded className="dark" in \_\_root.tsx — added ThemeInitializer inline script to prevent flash of wrong theme on load
- Confirmed theme toggle working correctly in browser
- Added JobCard component to ui-bits.tsx — props: id, title, customer, status, date, assignee, value, onClick
- Defined and locked final navigation IA:
  - Top level: Dashboard, Inbox
  - Sales: Opportunities, Quotes & Estimates, Catalog
  - CRM: Contacts, Companies
  - Operations: Projects, Scheduling, Team
  - Inventory: Parts & Materials, Vendors
  - Finance: Invoices, Payments (placeholder)
  - Reports: Reports (placeholder)
  - Settings: footer only
- Updated sidebar navigation to match final IA
- Reconciled all route files:
  - Renamed deals.tsx → opportunities.tsx (path /deals → /opportunities)
  - Renamed dispatch.tsx → scheduling.tsx (path /dispatch → /scheduling)
  - Created new placeholders: team.tsx, vendors.tsx, payments.tsx, reports.tsx
- Updated app branding throughout:
  - Company: Port City Sound & Security / AV & Security Systems / PCSS initials
  - User: Justin Shader / Admin
- Built owner/CEO dashboard from demo data:
  - 5 stat cards: Pipeline Value, Active Projects, Quotes Out, Outstanding, Revenue MTD with sparkline
  - Recent Activity feed (5 items mixing jobs, invoices, quotes, inventory)
  - Closing Soon card (top 3 open deals sorted by close date)
  - At-Risk Projects card (projects over budget or past due)
  - All values derived from demo-data.ts — coherent with module pages
- Topbar improvements:
  - Added PanelLeft toggle button (left side) — single consistent sidebar toggle
  - Removed collapse button from sidebar header and footer
  - Removed Ask (AI) button
  - Added ThemeToggle to topbar right side
  - Removed ThemeToggle from sidebar footer
  - Simplified search buttons — removed keyboard shortcut hints, plain "Search..." text
  - Removed redundant breadcrumb from topbar
- Increased sidebar header vertical padding for long company names
- Implemented PageMetaContext system:
  - src/contexts/PageMetaContext.tsx — provides title, subtitle, newLabel, onNew per page
  - Each route calls setMeta() on mount to register its topbar content
  - Topbar renders centered title + inline subtitle, conditional + New button
  - - New button hidden on pages with no action defined
  - All 14 route files updated with appropriate meta

**Design Decisions Made:**

- No widget customization on dashboard (v2 feature) — role-based dashboards first
- No recharts charts on dashboard — sparkline stat card + status list bars instead
- Closing Soon + At-Risk Projects replace revenue trend chart in right column
- PageHeader component in ui-bits.tsx reserved for in-page section headers, not page-level titles
- - New button hides entirely on pages with no defined action

**Next Session Goal — Projects Module:**

- Build out Projects module fully as UI first (list view, detail view, phases, tasks)
- Document exact data fields and relationships the page needs
- Use that as spec for Supabase schema design for Projects module
- Schema design follows UI decisions, not the other way around

**Open Questions for Next Session:**

- Confirm Supabase project is active and keys are available
- Define user roles formally (needed before auth session)
- Revisit dashboard spacing once more pages are fleshed out
- Decide on role-based dashboard variants (owner, PM, field tech) — after roles are defined

**Schema Changes This Session:** None
**New Env Variables This Session:** None

---

### Session 003 — Frontend Planning & Dev Environment Scoping

**Date:** [Date]
**Focus:** Plan frontend design session, establish UI direction, scope dev environment setup

**Completed:**

- Confirmed UI/design direction:
  - Theme: Light + Dark with user toggle
  - Style reference: Linear (clean, minimal, confident)
  - Brand colors: TBD — to be generated fresh
- Scoped full frontend build plan — saved in FRONTEND_SESSION.md
- Identified that Claude Code + dev environment setup is needed before frontend work begins
- User is not yet familiar with Bun or TanStack — explain concepts as they come up

**Next Session Goal — Dev Environment Setup:**

- [x] Confirm OS (Windows)
- [x] Install Bun
- [x] Install Claude Code
- [x] Clone repo locally / set up Codespaces
- [x] Run bun install
- [x] Run bun dev
- [x] Confirm Claude Code working
- [ ] Set up .env.local with Supabase keys (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

**Design Decisions Made:**

- Linear-inspired aesthetic — clean, minimal, confident
- Light + dark themes with toggle
- Build on shadcn/ui — extend, don't replace

**Schema Changes This Session:** None
**New Env Variables This Session:** None

---

### Session 002 — Stack Confirmation & Repo Review

**Date:** [Date]
**Focus:** Confirm tech stack from GitHub repo, update project files

**Completed:**

- Fetched and reviewed package.json from https://github.com/jShades85/handyhustle-hub
- Confirmed full tech stack (see PROJECT_CONTEXT.md)
- Key discovery: project uses TanStack Start (SSR framework), not plain Vite + React Router
- Key discovery: Tailwind CSS v4 (CSS-based config, not v3 tailwind.config.js)
- Key discovery: Bun as package manager
- Key discovery: React 19
- Updated PROJECT_CONTEXT.md and PROGRESS_LOG.md with confirmed info
- Added GitHub repo URL to PROJECT_CONTEXT.md

**Schema Changes This Session:** None
**New Env Variables This Session:** None

---

### Session 001 — Project Setup

**Date:** [Date]
**Focus:** Claude project configuration and documentation setup

**Completed:**

- Defined project scope: multi-tenant trade service SaaS
- Confirmed services: Supabase, Vercel, Resend, Linear, GitHub
- Created CUSTOM_INSTRUCTIONS.md, PROJECT_CONTEXT.md, PROGRESS_LOG.md

**Schema Changes This Session:** None
**New Env Variables This Session:** None

---

## Decisions Log

| Decision                                         | Rationale                                                                   | Date        |
| ------------------------------------------------ | --------------------------------------------------------------------------- | ----------- |
| CRM before Sales in nav                          | Relationship exists before the deal                                         | Session 005 |
| Sales and CRM stay separate                      | Different workflows and cadences                                            | Session 005 |
| Catalog moved to Inventory                       | Reference/config resource, not a sales workflow step                        | Session 005 |
| Service as own module                            | Recurring service revenue distinct from project work                        | Session 005 |
| Work Orders added to Operations                  | Single-visit service calls vs full projects                                 | Session 005 |
| Purchase Orders added to Inventory               | Closes loop between vendors and stock                                       | Session 005 |
| PageMetaContext for topbar                       | Each route registers its own title, subtitle, New action — clean separation | Session 004 |
| + New button hides when no action                | Disabled buttons with no context are worse UX than no button                | Session 004 |
| No recharts on dashboard                         | Linear-style stat cards and bars cleaner than heavy chart library           | Session 004 |
| Role-based dashboards (not widget customization) | Ship useful now, widget system is v2                                        | Session 004 |
| Schema follows UI, not reverse                   | Avoids building backend that forces UI to fit                               | Session 004 |
| Projects module first                            | Core of trade service business — everything hangs off it                    | Session 004 |
| Codespaces as dev environment                    | Zero environment drift, access from anywhere, port forwarding built in      | Session 004 |
| Single topbar sidebar toggle                     | Consistent UX — toggle always in same place regardless of sidebar state     | Session 004 |
| Remove keyboard shortcut hints from search       | Trades employees not thinking in keyboard shortcuts                         | Session 004 |
| Multi-tenant via tenant_id + RLS                 | Industry standard for SaaS isolation on Supabase                            | Session 001 |
| Migrations via versioned SQL files               | Reproducible, version-controlled schema changes                             | Session 001 |
| Resend for email                                 | Simple API, good integration support                                        | Session 001 |
| Linear for issue tracking                        | User preference                                                             | Session 001 |
| Vercel for deployment                            | User preference, excellent Vite/React support                               | Session 001 |
| Bun as package manager                           | Already set in repo by Lovable                                              | Session 002 |
| TanStack Start as framework                      | Already set in repo by Lovable — SSR-capable                                | Session 002 |
| Tailwind CSS v4                                  | Already set in repo by Lovable                                              | Session 002 |
| Light + dark theme with toggle                   | User preference                                                             | Session 003 |
| Linear-inspired UI aesthetic                     | User preference — clean, minimal, confident                                 | Session 003 |
| Build on shadcn/ui — extend don't replace        | Already installed, avoid duplication                                        | Session 003 |

---

## Blockers

- Supabase keys not yet added to .env.local — needed before any data connection work
- Database schema not yet designed — follows Projects module UI build next session
- TanStack Start + Supabase auth pattern not yet confirmed — needed before data-connected features
- User roles not formally defined — needed before auth session and role-based dashboards

---

## Module Status

| Module                                | Status                      | Notes                                               |
| ------------------------------------- | --------------------------- | --------------------------------------------------- |
| UI Shell / Layout                     | Complete                    | AppShell, sidebar, topbar, PageMetaContext all done |
| Theme System                          | Complete                    | Light/dark/system toggle, no flash on load          |
| Dashboard                             | Complete (placeholder)      | Owner dashboard with demo data — spacing to revisit |
| Auth / Tenant Onboarding              | Not started                 | Confirm TanStack Start auth pattern first           |
| CRM (Contacts/Companies)              | Lovable baseline            | Needs build-out — detail pages required             |
| Lead Inbox                            | Placeholder                 | New — coming soon page                              |
| Opportunities                         | Lovable baseline            | Kanban + list view — needs rebrand to PCSS data     |
| Quotes & Estimates                    | Lovable baseline            | Two-column master/detail — needs rebrand            |
| Projects                              | Next session                | Build full UI first, then schema                    |
| Work Orders                           | Placeholder                 | New — coming soon page                              |
| Scheduling                            | Placeholder                 | Coming soon page                                    |
| Team                                  | Placeholder                 | Coming soon page                                    |
| Service Tickets                       | Placeholder                 | New — coming soon page                              |
| Service Plans                         | Placeholder                 | New — coming soon page                              |
| Inventory — Catalog                   | Complete                    | Manufacturer grid, drill-in list, view/edit drawer  |
| Inventory — Stock                     | Complete                    | Manufacturer grid, drill-in, adjust qty, movement log |
| Inventory — Purchase Orders           | Complete                    | Full page — stat bar, table, view/edit drawer, comboboxes |
| Inventory — Vendors                   | Complete                    | Stat bar, card/list view, Sheet drawer, new modal   |
| Finance — Invoices                    | Complete                    | Stat bar, tabs, filters, table, Sheet drawer, modal |
| Finance — Payments                    | Complete                    | Outstanding AR / ledger / Stripe-first collect form |
| Reports                               | Placeholder                 | Coming soon page                                    |

---

## How to Update This File

At the end of each session, add a new ### Session NNN block at the top of the Session Log with:

- What was completed
- Next steps (specific, actionable)
- Any open questions
- Schema changes made
- New env variables added
