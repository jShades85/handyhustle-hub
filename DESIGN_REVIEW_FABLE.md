# BearingPro — UI/UX Design Review — Claude Fable 5
**Date:** June 11, 2026
**Reviewer:** Claude Fable 5 (automated review)
**Benchmarks:** Linear, Vercel Dashboard, Stripe Dashboard, Notion, Superhuman, Loom, Height, Plane

---

## TL;DR

The system-level decisions (tokens, density, page grammar, OKLCH, hairlines) are right and better than most apps at this stage — the skeleton is Linear-quality. What's missing is the **feedback layer** (toasts, skeletons, save confirmations, motion) and **consolidation** (one status-color system, one type ramp, one select control). Those two themes — feel and consistency — are the entire gap between "well-built prototype" and the Linear/Stripe tier you're aiming at. Roughly 70% of it is achievable inside shared files (`styles.css`, `page-components.tsx`, `sheet.tsx`, `app-shell.tsx`) without touching individual routes.

---

## 1. Current Design Strengths

**The token foundation is genuinely good.** `src/styles.css` is a tight, modern design system: OKLCH color everywhere (perceptually uniform, easy to derive hover states), a layered surface scale (`--surface` → `--surface-2` → `--elevated`), hairline borders done the Linear way (`oklch(1 0 0 / 0.07)` — white-alpha borders instead of gray, which is exactly how Linear and Vercel get that crisp edge in dark mode), and semantic status/priority tokens. Inter with `cv11/ss01/ss03` feature settings is the same optical setup Linear ships.

**The shared page grammar is real and enforced.** `StatBar → PageTabs → FilterBar → content` (`src/components/ui/page-components.tsx`) is consistently applied across Invoices, POs, Service Plans, etc. Most products this size have five different list-page layouts; BearingPro has one. The `StatItem` design (icon chip + uppercase micro-label + tabular-nums value) reads like Stripe's dashboard header row.

**Density is dialed in deliberately.** 7px-high (h-7) controls, 12–13px body text, 28px sidebar rows, tabular-nums + `font-mono` for codes/dates/money — this is the Linear/Height density school and it suits a back-office ops tool.

**Good micro-detail instincts:** custom thin scrollbars with padding-box trick, themed `::selection`, dot-prefix status badges, deterministic gradient avatars, current-time red line on the scheduling calendar, `⌘K` command palette with grouped results, kbd styling, view-before-edit row pattern with hover-revealed edit icons.

**The scheduling calendar is the most designed screen in the app.** Category color-coding with left-border accent, overlap column layout, compact-block degradation under 46px, popover detail card with View Job / Edit Schedule actions — this is at the level of a real dispatch product.

---

## 2. Design Gaps & Weaknesses

Ranked by priority:

1. **No feedback layer.** Sonner is installed but `<Toaster />` is never mounted. Only 3 `onError` handlers exist across ~30 route files. Mutations fail and succeed silently. In a tool where people record payments and dispatch techs, this is the single biggest UX gap.

2. **Loading states are "dim the page."** `cn(..., isLoading && "opacity-50")` (invoices, service plans) and a bare "Loading…" string (contacts). `skeleton.tsx` exists and is unused. Modern SaaS skeleton the actual layout so the page doesn't reflow on arrival.

3. **Brand inconsistency leaks demo-era artifacts.** Dashboard `head` title is "Port City Sound & Security", Scheduling says "Crosscurrent", others say "BearingPro". The dashboard itself is still 100% demo data while every other module is live — it's now the least trustworthy screen in the app.

4. **Command palette searches stale demo data.** `command-palette.tsx` imports `COMPANIES`, `PROJECTS`, and demo contacts — ⌘K shows companies that don't exist in the tenant's DB and navigates to dead detail pages. A ⌘K that lies is worse than one that only navigates.

5. **No motion system.** Beyond Radix's default sheet/dialog slide, there is zero motion: no kanban drag-and-drop, no list item enter/exit, no number transitions, no hover lift on cards, no collapse animation beyond `transition-[width]`.

6. **Inconsistent empty states.** A nice `EmptyState` component exists but tables render bare `<td colSpan>` text rows, kanban columns say just "Empty", and some loading states are floating strings. Notion/Linear treat empty states as onboarding surface.

7. **Native `<select>` everywhere in filter bars.** `FilterSelect` is a raw `<select>` — renders OS-styled dropdowns that break the design system visually, especially dark mode on Windows. shadcn `Select`, `DropdownMenu`, and `Popover` are already installed and unused for this.

8. **Accessibility/keyboard gaps.** Sortable `<th>` are click-only divs (no `aria-sort`, no keyboard), table rows are clickable `<tr>` without `tabIndex`/Enter handling, kanban stage selector uses a hand-rolled popover with a full-screen invisible click-catcher, custom buttons use `focus:ring` rather than `focus-visible:ring`.

9. **Drawer/Sheet chrome is stock shadcn while content is custom.** 300/500ms slide (slow vs. Linear's ~200ms), `bg-black/80` overlay (very heavy; Linear uses ~40–50%), `p-6` padding that fights the custom drawers' own `px-5` sections.

---

## 3. Specific Recommended Changes

### A. Mount the toast layer and standardize mutation feedback
- **Where:** `src/routes/__root.tsx` (mount `<Toaster />`); small `onError` default in the `QueryClient` mutation cache
- **Why:** Silent failure on payments/dispatch is a trust killer — highest ROI change in the whole review
- **How:** Add a global `MutationCache.onError` that fires `toast.error(message)`. Success toasts only on meaningful events (payment collected, PO sent, lead converted) — not every inline blur-save. Style the toaster with app tokens (`bg-elevated`, hairline border, 12.5px text).

### B. Skeleton loading on every list page
- **Where:** Add `StatBarSkeleton`, `TableSkeleton(rows, cols)`, `KanbanSkeleton` to `page-components.tsx`; replace `opacity-50` and "Loading…" patterns across invoices, service plans, contacts, etc.
- **Why:** Eliminates layout shift and the "is it broken?" half-second; matches Vercel/Linear loading conventions
- **How:** Render the same structural shell (stat bar with ghost values, header row + 8 shimmer rows). Use the existing unused `skeleton.tsx` with a slow pulse.

### C. Rebuild ⌘K on live data + real keyboard reach
- **Where:** `src/components/command-palette.tsx`
- **Why:** ⌘K is the signature interaction of the Linear-class products being benchmarked; right now it actively misleads
- **How:** Replace demo imports with debounced ilike queries against companies/projects/contacts/invoices — fired only when palette is open (`enabled: open`, distinct `-palette` query keys per collision rules). Make Quick Actions open the New modal (navigate with `?new=1` param). Add a `Recent` group from localStorage MRU.

### D. Promote the dashboard to live data + fix brand titles
- **Where:** `src/routes/index.tsx` (dashboard); head titles in `index.tsx` ("Port City Sound & Security") and `scheduling.tsx` ("Crosscurrent")
- **Why:** First screen, currently the only fake one; stale brand names leak into prod tabs/bookmarks
- **How:** Derive stat cards from caches already maintained (`["opportunities"]`, `["projects"]`, `["invoices"]`). Hide Recent Activity card until real. Standardize `PageTitle · BearingPro` (or tenant name) across all routes.

### E. Replace native FilterSelect with a token-styled trigger
- **Where:** `page-components.tsx` `FilterSelect`
- **Why:** OS-native dropdown popups are the one place the Linear aesthetic visibly collapses, especially Windows dark mode
- **How:** Keep the same API but render a Radix `DropdownMenu`/`Select` with a 7px-high trigger matching `SearchInput`. Add a "filter applied" affordance — tinted border or count chip — so active filters are visible at a glance.

### F. Tune Sheet/Dialog chrome to the design system
- **Where:** `src/components/ui/sheet.tsx`, `dialog.tsx`
- **Why:** 500ms slide-in feels sluggish next to 7px controls; `bg-black/80` overlay is heavier than any benchmark product
- **How:** Drop durations to ~200ms open / 150ms close with ease-out. Overlay to `bg-black/40` (+ optional `backdrop-blur-[2px]`). Remove default `p-6` so drawers own their padding. Set drawer surface to `bg-surface` with a hairline left border.

### G. Kanban drag-and-drop
- **Where:** `KanbanView`/`KanbanCard` in `src/routes/sales/opportunities.tsx`
- **Why:** A pipeline board you can't drag reads as a prototype; the dropdown-to-move flow is 3 clicks vs. 1 gesture. Linear/Height/Plane treat board DnD as table stakes.
- **How:** Add `@dnd-kit/core` (small, a11y-friendly). Optimistic `setQueryData` on drop. Drop-target column highlight (`bg-primary/5` + dashed inset ring). Card lift (scale 1.02 + shadow) while dragging. Keep dropdown as keyboard/read-only path.

### H. Unify empty states through the existing component
- **Where:** All table `colSpan` fallbacks (opportunities ListView, contacts, invoices…), kanban "Empty" columns
- **Why:** The right component already exists — it just isn't wired. Empty states are where new tenants live for their first week.
- **How:** Table empties render `EmptyState` inside the colSpan cell with module icon and a "New X" action (gated by `canWrite`). Kanban empty columns get a faint dashed drop-zone outline instead of the word "Empty".

### I. Sidebar polish pass
- **Where:** `src/components/app-shell.tsx`
- **Why:** Collapsed mode has no tooltips (icon-only nav is unguessable), locked modules show no explanation, user row hardcodes "Admin · Workspace"
- **How:** Wrap collapsed items in existing `Tooltip` (side="right"). Locked items: tooltip "No access — ask an admin" + small lock glyph. Read real role name from permissions context. Add a 2px primary left-bar active indicator (stronger scent than background tint alone).

### J. Top bar information scent
- **Where:** `src/components/app-shell.tsx` header
- **Why:** A centered title is dead space; detail pages (project, work order) lose "where am I" context
- **How:** Left-align title after the collapse button. On nested routes, render `Module / Page` breadcrumb (unused `breadcrumb.tsx` already exists). Keep search + New on right. Under ~1100px, collapse search to icon-only trigger.

---

## 4. Interaction & Motion

- **Adopt a 3-tier duration scale as tokens:** ~120ms (hovers — already used in `.row-hover`), ~200ms (overlays, popovers, drawers), ~300ms (page-level). Currently durations are scattered (120/150/300/500ms).
- **Number animation on stat cards:** eased count-up transition when values change after a mutation (Stripe does this — makes "Collect Payment → Outstanding drops" feel causal).
- **Row enter animation:** new records from a modal should fade/slide in and briefly flash `bg-primary/5` so users can find what they just created. One CSS keyframe + a "recently created id" state.
- **Inline-save confirmation:** blur-to-save fields (notes everywhere, parts list cells) give zero acknowledgment. A 1.5s "Saved" check fading in next to the field closes the loop. This pattern recurs across opportunities, service plans, projects — build it once as `useSavedFlash`.
- **Command palette:** cmdk dialog should scale-fade in at ~150ms with overlay blur.
- **`prefers-reduced-motion`:** add a global `@media` guard zeroing animations; trivial in Tailwind v4 with a `motion-reduce` pass on animated primitives.
- **Kanban cards:** hover is border-only (`hover:border-primary/30`); add faint shadow/translate for grab-ability once DnD lands.

---

## 5. Typography & Spacing

- **Too many ad-hoc sizes.** At least 15 arbitrary values exist including half-pixel steps (10.5/11.5/12.5px) that render inconsistently at non-1x DPI. Collapse to a named ramp in `@theme`:

  ```css
  --text-2xs: 10px;
  --text-xs:  11px;
  --text-sm:  12px;
  --text-base: 13px;
  --text-lg:  16px;
  --text-display: 22px;
  ```

  Linear ships ~5 sizes total.

- **The 22px stat value is the only "large" type in the app.** Detail pages (`$projectId`, invoice drawer) would benefit from one 16–18px title tier so hierarchy isn't carried entirely by font weight.

- **Spacing rhythm is good** (consistent `p-4`/`p-5` gutters, `py-2.5` rows) but `index.tsx` uses `p-5` while list pages use `p-4` — pick one and enforce it.

- **Line-length unbounded:** notes textareas and detail panes stretch full-width in wide drawers. Cap reading surfaces at ~65ch.

---

## 6. Color & Theming

- **Dark mode is clearly first-class, and it shows.** Light mode is serviceable but flat: `--surface` (0.97) vs `--background` (0.99) is nearly invisible — cards and filter inputs lose definition. Either deepen light surfaces slightly (0.955–0.96) or use shadows in light mode (Linear light mode is shadow-driven where dark mode is border-driven).

- **Two parallel status color systems.** Tokens exist (`--status-*`, `--priority-*`) and `ui-bits.tsx` uses them, but `opportunities.tsx`, `scheduling.tsx`, and others hardcode Tailwind palette classes (`bg-blue-500/15 text-blue-600 dark:text-blue-400`…) with per-file `dark:` overrides. **This is the largest source of future drift.** Consolidate: define ~8 semantic chip recipes (info / progress / warning / success / danger / neutral…) as utilities or a `<StatusBadge tone="..." />` variant, and delete the per-page color maps.

- **Hardcoded reds** in sign-out button, inbox badge, and scheduling time-line should use `--destructive` (or a dedicated `--time-indicator` token for the scheduling line, since it's informational, not destructive).

- **`shadow-glow` is defined and used once** (logo). Either deploy it as the focus/active signature (primary buttons, focused drawers) or remove it.

- **`.dark` block only redefines `--background`** — harmless since `:root` is dark, but confusing. Either make `.dark` complete or add a clarifying comment.

- **Chart tokens defined, Recharts installed, zero charts rendered.** The dashboard's solid-primary bars at 100% opacity are heavy; use `bg-primary/40` with the last bar full.

---

## 7. Mobile / Responsive

**Current state: desktop-only, by design.** 41 total breakpoint usages across 21 route files. Critical gaps:

- **Sidebar has no mobile behavior** — at <768px it still occupies 232px of a 390px screen. The shadcn `sidebar.tsx` with built-in mobile sheet is installed but unused; `app-shell.tsx` hand-rolls its own.
- Tables rely on `overflow-x-auto` + `min-w-[900px]` — acceptable for scroll behavior, but row tap targets (h-6 icon buttons) are below the 44px touch minimum.
- Scheduling (`min-w-[780px]`) and kanban are inherently desktop. Both need a graceful "rotate or use desktop" state rather than broken cropping.

**Recommendation:** Given field techs are a core persona (work orders, scheduling), don't retrofit every page. Pick the field-tech surface — My Day / assigned work orders / ticket detail — and make *that* genuinely mobile. For the rest: collapse sidebar to an overlay sheet under `lg`, make the top bar wrap, and let tables scroll. One session for "doesn't embarrass itself on a phone."

---

## 8. Quick Wins (under 1 hour each)

| # | Where | Change |
|---|-------|--------|
| QW1 | `src/routes/__root.tsx` | Mount `<Toaster />` + global `onError` toast — biggest UX delta per minute |
| QW2 | `routes/index.tsx`, `scheduling.tsx` | Fix stale brand names: "Port City Sound & Security" / "Crosscurrent" → consistent `X · BearingPro` |
| QW3 | `components/ui/sheet.tsx`, `dialog.tsx` | Overlay `bg-black/40`, open 200ms / close 150ms |
| QW4 | `app-shell.tsx` | Wrap collapsed sidebar icons in `Tooltip` (component already installed) |
| QW5 | `finance/invoices.tsx:1150` | Remove `+` prefix from "New Invoice" label — the shell button already renders a Plus icon |
| QW6 | `page-components.tsx` + hand-rolled buttons | `focus:ring` → `focus-visible:ring` — kills mouse-click ring flash |
| QW7 | All kanban "Empty" columns | Replace word "Empty" with faint dashed drop-zone outline using muted `EmptyState` treatment |
| QW8 | `app-shell.tsx` user row | Read real role name from permissions context instead of hardcoded "Admin · Workspace" |
| QW9 | `app-shell.tsx` sidebar | Add 2px primary left-bar active indicator — instant Linear visual language |
| QW10 | `styles.css` | Add `@media (prefers-reduced-motion: reduce)` global guard |
| QW11 | `styles.css` | Nudge `--surface` / `--surface-2` darker by ~0.02 L in light mode — cards separate from page background |
| QW12 | Notes textareas (opps, service plans, projects) | `useSavedFlash` — tiny "Saved ✓" check after blur-save, built once and applied everywhere |
