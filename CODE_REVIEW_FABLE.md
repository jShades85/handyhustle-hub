# BearingPro Code Review — Claude Fable 5
**Date:** June 11, 2026
**Reviewer:** Claude Fable 5 (automated review)
**Scope:** Full codebase with focus on Sessions 035–036 changes (Quote Builder, Invoice line items, Scheduling, Projects)

---

## Recommended Fix Order

1. C1 — SSR crash (happening right now)
2. C3 — WO Parts tab FK violation
3. C2 — Query key collision
4. C4 / C5 — Data-loss writes (quotes + scheduling)
5. C7 — Write permissions missing on new pages
6. C6 + M8 + M10 — One migration: unique constraints, drop payment delete policy, add indexes
7. M2 — Cost/price mislabel before more projects convert

---

## CRITICAL

### C1. `createClient()` at module scope crashes SSR — confirmed live in dev logs

**Files:**
- `src/routes/sales/quotes/_shared.tsx:11`
- `src/routes/sales/quotes/index.tsx:38`
- `src/routes/sales/quotes/$quoteId.tsx:23`
- `src/routes/finance/invoices.tsx:29`
- `src/routes/finance/payments.tsx:29`
- `src/routes/inventory/vendors.tsx:22`
- `src/routes/inventory/stock.tsx:12`
- `src/routes/inventory/purchase-orders.tsx:40`
- `src/routes/service/service-plans.tsx:21`

**Problem:** These 9 route files call `const supabase = createClient()` at module scope. `createBrowserClient` throws when env vars aren't present at SSR module-evaluation time. `dev-err.txt` shows this live: `"@supabase/ssr: Your project's URL and API key are required"` → `h3 swallowed SSR error: {"status":500}`. Every working page creates the client inside the query/mutation function.

**Fix:** Move `createClient()` inside each `queryFn`/`mutationFn` (the established pattern in `opportunities.tsx`, `contacts.tsx`, etc.), or lazily memoize it inside the component.

---

### C2. Query key collision: `["work-orders-basic"]` used with two different select shapes

**Files:**
- `src/routes/finance/invoices.tsx:1023-1034`
- `src/routes/inventory/purchase-orders.tsx:1207-1224`

**Problem:** `invoices.tsx` caches raw rows `{id, code, name}` filtered by `.neq("status","cancelled")`; `purchase-orders.tsx` caches **transformed** rows `{id, code, name, customer, type: "work-order"}` with a different filter. Navigate Invoices → Purchase Orders and the PO page gets served the invoices shape — `customer` and `type` are `undefined`, breaking linked-job display and any `type === "work-order"` branching.

**Fix:** Rename the purchase-orders key to `["work-orders-po"]`. Consider extending `scripts/check-query-keys.cjs` to hash the `select(...)` string per key.

---

### C3. WO detail passes `wo.id` into `PartsPanel` as `project_id` — Parts tab broken on every work order

**Files:**
- `src/routes/operations/work-orders/$workOrderId.tsx:409-412`
- `src/components/projects/PartsPanel.tsx:85-105, 166-187`

**Problem:** `<PartsPanel projectId={wo.id} />` queries `project_line_items.eq("project_id", wo.id)` — always empty. Every "Add Part" insert violates the FK `project_line_items.project_id references projects(id)`. The insert fails silently — `commitAdd` awaits `mutateAsync` with no catch, so the user gets an unhandled rejection and a stuck add-row with zero feedback.

**Fix:** Either add a nullable `work_order_id` column to `project_line_items` (with a CHECK that exactly one of `project_id`/`work_order_id` is set) and make `PartsPanel` accept a parent type, or hide the Parts tab on standalone WOs and pass `wo.project_id` when one exists. Wrap `commitAdd` in try/catch with an error message.

---

### C4. `saveQuoteToDb` deletes line items before inserting with unchecked errors — quote data loss

**File:** `src/routes/sales/quotes/_shared.tsx:279-307`

**Problem:**
- Line 280: `delete().eq("quote_id", ...)` — error never checked. If delete fails, the insert duplicates every line item.
- If delete succeeds and insert fails, the quote's line items are **permanently gone** — no transaction.
- Line 307: opportunity value sync error also unchecked — quote and opp value silently diverge.

**Fix:** Check the delete error and abort. Ideally move the entire save into a Postgres RPC so delete + insert + opp-sync are one transaction. At minimum: insert new rows first, then delete old ones.

---

### C5. Scheduling save mutation ignores every error — silently drops dispatches and tech assignments

**File:** `src/routes/operations/scheduling.tsx:1022-1041, 722-726`

**Problem:**
- `update(payload)`, `scheduled_job_techs.delete()`, and tech re-`insert` are all awaited without error checks. If delete succeeds and insert fails, all tech assignments are lost.
- The drawer's `onSubmit` closes and resets the form immediately before the mutation resolves. `saveMutation` has no `onError` — a failed save looks identical to a successful one.

**Fix:** Check each error and throw; keep the drawer open until `mutateAsync` resolves; show an inline error on failure.

---

### C6. Document number generation is client-side with no unique constraint — collision risk under concurrent use

**Files:**
- `src/routes/sales/quotes/_shared.tsx:267-269`
- `src/routes/sales/opportunities.tsx:159-160, 206-207`
- `src/routes/operations/projects/index.tsx:80-81`
- `src/routes/operations/projects/$projectId.tsx:163-164`
- `src/routes/finance/invoices.tsx:1060-1064`

**Problem:** `count + 1` (or `max + 1`) computed client-side means two users creating simultaneously get the same number. No `UNIQUE (tenant_id, number)` constraint on `quotes`, `projects`, `work_orders`, or `invoices` — duplicates insert silently.

**Fix:** Add `UNIQUE (tenant_id, number)` constraints. Move generation into a `security definer` RPC using `SELECT max(...) FOR UPDATE` or a per-tenant sequence table.

---

### C7. Write permissions not gated on any recently built page

**Files:**
- `src/routes/sales/quotes/new.tsx`
- `src/routes/sales/quotes/$quoteId.tsx`
- `src/routes/finance/invoices.tsx`
- `src/routes/finance/payments.tsx`
- `src/routes/operations/scheduling.tsx`
- `src/routes/operations/projects/index.tsx`
- `src/routes/operations/work-orders/index.tsx`
- `src/components/projects/PartsPanel.tsx`

**Problem:** None of these import `usePermissions`. Since RLS is tenant-scoped only (not role-scoped), a read-only user can create/edit quotes, collect payments, dispatch jobs, and edit parts lists. Session 034's permissions pass no longer holds for anything built since.

**Fix:** Gate save bars, New buttons, inline edits, and status mutations behind `can("sales"|"finance"|"operations", "write")`, matching the `opportunities.tsx` pattern.

---

## MEDIUM

### M1. `EditableCell` defined inside `LineItemRow` — input remounts on every keystroke

**File:** `src/routes/sales/quotes/_shared.tsx:428-453`

**Problem:** `EditableCell` is a new component type on every render, so React unmounts/remounts the `<input>` each keystroke (parent state changes per keystroke via `onCellChange`). `autoFocus` re-fires and the caret jumps to the end — editing a number in the middle is broken. `Escape` calls `onCellCommit()` (line 438), committing instead of cancelling.

**Fix:** Hoist `EditableCell` to module scope and pass props. Make Escape call a cancel handler that discards the draft (`PartsPanel.tsx:373` already does this correctly).

---

### M2. `convertToProject` copies `unit_price` into `unit_cost` — sell price recorded as cost

**Files:**
- `src/routes/sales/opportunities.tsx:194`
- `supabase/migrations/20260611000002_project_line_items.sql` (backfill does the same)

**Problem:** `quote_line_items` has had a real `unit_cost` column since migration `20260611000004`, but conversion ignores it and snapshots the *price*. Every project's "Total Parts Cost" and future margin calculations are inflated to revenue.

**Fix:** Copy `unit_cost: li.unit_cost` in `convertToProject`. Decide whether invoice import should bill price (add a `unit_price` column to `project_line_items` or join back to the quote).

---

### M3. `convertToProject` allows duplicate conversions + silently ignores line-item copy failures

**File:** `src/routes/sales/opportunities.tsx:177-200, 952-1021`

**Problem:** The nested quotes fetch and `project_line_items.insert` have no error checks — a project can be created with a silently empty parts list. The Convert button remains visible on closed-won opps, so a double-click creates duplicate projects against the same `opportunity_id`.

**Fix:** Check both errors. Before converting, query `projects.eq("opportunity_id", opp.id)` and show "View Project" instead of Convert when one already exists.

---

### M4. Opportunity drawer shows stale data after every mutation

**File:** `src/routes/sales/opportunities.tsx:325, 416-442`

**Problem:** `selected` is a snapshot at click time. After Edit-save, stage move, notes save, or Mark-Sent/Accept on the linked quote, the cache refetches but the drawer keeps rendering the old object — edits appear not to have taken effect until the drawer is reopened.

**Fix:** Store `selectedId` and derive `selected` from the `["opportunities"]` cache via `useMemo`, like `invoices.tsx:1143` does.

---

### M5. "Mark as Sent" auto-advances opp stage in one place but not the other

**Files:**
- `src/routes/sales/quotes/$quoteId.tsx:83-101`
- `src/routes/sales/opportunities.tsx:344-347, 232-236`

**Problem:** The quote detail page auto-advances the opportunity to `negotiation`; the same button in the opportunity drawer does not. In `$quoteId.tsx:90-95` the opp stage update error is ignored, and neither mutation has an `onError`.

**Fix:** Extract one shared `markQuoteSent(quoteId, oppId)` helper with both updates and error checks; add `onError` feedback.

---

### M6. Quote revision bumps on every save — typo fix creates v2, v3, v4

**Files:**
- `src/routes/sales/quotes/_shared.tsx:262-264`
- `src/routes/sales/quotes/$quoteId.tsx:214-236`

**Problem:** Every "Save Changes" bumps `revision: currentRevision + 1`, contradicting the spec (revision should only track versions sent during negotiation). Rapid double-save also uses the stale `loaded.quote.revision` until refetch lands.

**Fix:** Only bump revision when the quote status is `sent`/`viewed` (a true re-issue), or behind an explicit "New Revision" action. Use a DB-side `revision = revision + 1` expression rather than the client value.

---

### M7. `recalcInvoiceTotals` is non-atomic and never fixes status; line items editable on paid invoices

**File:** `src/routes/finance/invoices.tsx:209-263, 535-660`

**Problem:**
- Read-then-write of totals races with concurrent payment collection — two simultaneous writes lose data.
- Adding a line item to a `paid` invoice recalculates `balance_due > 0` but leaves status `paid`.
- Fetch error at line 210-215 returns silently, leaving header totals out of sync.
- Add/delete line item buttons not gated by invoice status — can mutate a paid/void invoice.

**Fix:** Move totals recalc into a Postgres trigger on `invoice_line_items` (and `invoice_payments`), derive status there too. Disable line-item editing when status is `paid`/`void`.

---

### M8. `invoice_payments` has a DELETE RLS policy — contradicts immutable audit trail design

**File:** `supabase/migrations/20260610000022_invoices.sql:78`

**Problem:** A `tenant_delete` policy exists on `invoice_payments`. The stated design (matching `stock_movements`) is insert-only. Any tenant user can delete a payment via the API, orphaning `amount_paid` on the invoice.

**Fix:** Migration to `DROP POLICY "tenant_delete" ON invoice_payments`.

---

### M9. Scheduling date helpers use UTC — "today" highlight and week nav wrong after ~6–7 PM

**File:** `src/routes/operations/scheduling.tsx:114-116, 129-131`

**Problem:** `toDateStr` uses `date.toISOString().slice(0,10)`. For a US-Central user after ~6–7 PM, `todayStr()` returns tomorrow — the red now-line renders on the wrong column, the Today button jumps a day, and week filtering shifts.

**Fix:** Format locally:
```ts
`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
```

---

### M10. No indexes on any business table — every RLS check is a sequential scan

**Files:** `supabase/migrations/*`

**Problem:** 23+ tables (`companies`, `contacts`, `leads`, `opportunities`, `quotes`, `quote_line_items`, `projects`, `work_orders`, `project_line_items`, `invoices`, `invoice_line_items`, `invoice_payments`, `vendors`, `purchase_orders`, `po_line_items`, `stock_items`, `stock_movements`, `service_tickets`, `service_plans`, `categories`, `catalog_items`, `scheduled_jobs`, `scheduled_job_techs`) have no index on `tenant_id` or their FK columns. RLS evaluates `tenant_id = current_tenant_id()` on every row.

**Fix:** One migration adding `CREATE INDEX ... ON <table> (tenant_id)` everywhere, plus FK indexes on join columns: `quote_line_items(quote_id)`, `invoice_line_items(invoice_id)`, `project_line_items(project_id)`, `work_orders(project_id)`, `scheduled_job_techs(scheduled_job_id)`, etc.

---

### M11. `statusInitialized` ref never resets on param change — stale status/notes across records

**Files:**
- `src/routes/operations/projects/$projectId.tsx:547, 572-579`
- `src/routes/operations/work-orders/$workOrderId.tsx:195, 215-222`
- `src/routes/crm/companies/$companyId.tsx:119-126`

**Problem:** The `statusInitialized` / `notesInitialized` refs are never reset when the route param changes (TanStack Router reuses the component instance). Navigating record → record shows the previous record's status badge/notes.

**Fix:**
```ts
useEffect(() => { statusInitialized.current = false; }, [projectId]);
```
Or key the view component by id.

---

### M12. Linked quote on opportunity uses `quotes[0]` with no ordering

**File:** `src/routes/sales/opportunities.tsx:137, 146-148, 226`

**Problem:** The embedded `quotes(...)` select has no `order`. With multiple quotes per opportunity (the schema allows it), the drawer's Linked Quote, opp value, and Accept Quote all operate on an arbitrary quote.

**Fix:** Add `.order("created_at", { ascending: false })` to the embedded select, or sort client-side in `toUiOpp`.

---

### M13. No `onError` anywhere — silent failures across all mutations

**Representative files:** `opportunities.tsx:333-352`, `lead-inbox.tsx:222-237`, `invoices.tsx:1038-1117`, `PartsPanel.tsx:166-205`, `scheduling.tsx:1003-1044`

**Problem:** Stage moves, payment collection, parts edits, etc. show no feedback when the network or RLS rejects them — the UI stays silently stale.

**Fix:** Set a default `onError` toast in `QueryClient` config in `src/router.tsx` (currently `new QueryClient()` with no defaults). Add `staleTime` defaults while there.

---

### M14. Notes blur-saves are fire-and-forget and race the cache

**Files:**
- `src/routes/sales/opportunities.tsx:423-426`
- `src/routes/crm/lead-inbox.tsx:387`

**Problem:** `updateNotes(...)` isn't awaited. `opportunities.tsx` invalidates immediately after, so a refetch can return pre-update data and clobber the cache. `lead-inbox.tsx` never invalidates at all, so reopening a lead shows old notes until an unrelated refetch.

**Fix:** Make these mutations with `await` + invalidate in `onSuccess` (or `setQueryData`).

---

## LOW / QUICK WINS

| # | File | Issue | Fix |
|---|------|-------|-----|
| L1 | `src/routes/sales/quotes/_shared.tsx` | Triggers "does not export a Route" warning every dev start | Rename to `-shared.tsx` or move to `src/components/quotes/` |
| L2 | `quotes/index.tsx:14`, `scheduling.tsx:25` | Stale branding: "Port City Sound & Security" / "Crosscurrent" | Replace with "BearingPro" |
| L3 | `quotes/new.tsx:33-34, 36, 67-70` | Customer/Contact selects and `issueDate` collected but never persisted | Either add `issue_date` column or remove the fields |
| L4 | `quotes/new.tsx:71-86` | Opportunity dropdown duplicates `fetchOpportunityOptions` without the closed-lost filter | Use the shared function from `_shared.tsx` |
| L5 | `quotes/_shared.tsx:215-238` | Empty sections lost on quote round-trip — sections reconstructed from line items only | Document as intentional or persist sections separately |
| L6 | `projects/$projectId.tsx:83-87` | Hardcoded fake activity ("Ravi Tate logged 8 hours…") renders on every real project | Label tabs "coming soon" or hide until wired |
| L7 | `crm/companies/$companyId.tsx:301-311` | "Available after Sales/Operations module" — both modules are now live | Wire opportunities/projects by `company_id` |
| L8 | `opportunities.tsx:660` | Dead ternary inside a `rows.length === 0` guard — second branch unreachable | Remove dead branch |
| L9 | `contacts.tsx:700`, `invoices.tsx:1059/1078` | `tenant!.id` non-null assertion crashes with opaque TypeError if cache miss | Guard or throw a friendly error; extract one `getTenantId()` helper |
| L10 | `_shared.tsx:197-213`, `projects/$projectId.tsx:91-99` | `fetchQuoteForEdit` / `fetchProjectById` swallow errors and return null | Throw on non-`PGRST116` errors so React Query can retry |
| L11 | `scheduling.tsx:625-638` | No validation that end time > start time in zod schema | Add `.refine()` check |
| L12 | `scheduling.tsx` | `scheduled_jobs.status` never settable from UI — dispatches can never be completed/cancelled | Add status select to edit drawer |
| L13 | `quotes/$quoteId.tsx` | Expiry date passes but status never auto-flips to `expired` | Derive "expired" client-side when `expiry_date < today` |
| L14 | Multiple files | 5 different cache keys for the same `user_profiles: id, full_name` query | Standardize on one key + one shared fetcher |
| L15 | `lead-inbox.tsx:147` | `convertLead` hardcodes `customer_type: "commercial"` — breaks Derek Paulson residential test | Add customer type toggle to Convert modal |
| L16 | `migrations/20260610000025_quotes.sql` | Single `FOR ALL` policy, no `item_type` CHECK, `unit_cost` without precision | Add constraints next time the table is touched |

---

## What's Working Well

- **Planning status badge fix** from PROGRESS_LOG "What's Next" item 1 is already done (`src/data/projects.ts:27, 38`)
- **`["invoices"]` shared key** — select strings in `invoices.tsx` and `payments.tsx` are character-identical including `.order` — safe to share
- **`roles-basic`, `company-options`, `contact-options`, `team-members`** shared keys all verified shape-identical
- **RLS coverage is complete** — every table has `tenant_id` + policies; no tenant isolation gaps found
