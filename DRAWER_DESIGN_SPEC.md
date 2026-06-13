# Drawer Design Spec — BearingPro

Single source of truth for every side drawer (Sheet) in the app. All drawers
must follow this. The shared primitives live in:

- `src/components/ui/sheet.tsx` — `Sheet`, `SheetContent` (with `hideClose`)
- `src/components/ui/drawer-header.tsx` — `DrawerHeader` (the standard header)

A drawer has three zones, top to bottom: **Header → Body → Footer (optional)**.

---

## 1. Container

```tsx
<Sheet open={open} onOpenChange={…}>
  <SheetContent hideClose className="<width> flex flex-col p-0 gap-0">
    <DrawerHeader … />
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5"> … </div>
    {/* optional footer */}
  </SheetContent>
</Sheet>
```

- **`hideClose` is required** when using `DrawerHeader` — the header renders its
  own close button, so the Sheet's floating default X must be suppressed.
- `flex flex-col p-0 gap-0` — the drawer is a column; padding is owned by the
  header/body/footer, not the container.
- **Width** (pick the closest existing token, right side):
  - Record / detail drawer: `sm:max-w-115` (~460px)
  - Form-heavy / wide drawer: `w-120` / `w-130` (~480–520px)

---

## 2. Header — `<DrawerHeader>`

The header is the standardized component. Never hand-roll a `SheetHeader`.

### Anatomy

```
┌──────────────────────────────────────────────────────────┐
│ [leading]  eyebrow                          [actions][✎][✕]│
│            Title                                            │
│            subtitle                                        │
│            children (badges / tags / chips)                │
└──────────────────────────────────────────────────────────┘
```

### Props

| Prop | Type | Use |
|---|---|---|
| `leading` | `ReactNode` | Avatar or icon (e.g. `<Avatar>`, `<TeamAvatar>`, `<VendorAvatar>`). Optional. |
| `eyebrow` | `ReactNode` | Small line above the title — a record code (`SP-2026-001`) or code + small badge. Caller styles it (`font-mono text-xs text-muted-foreground`). Optional. |
| `title` | `ReactNode` | Required. Rendered as the accessible `SheetTitle`. |
| `subtitle` | `ReactNode` | One muted line under the title (role, company, parent). Optional. |
| `onEdit` | `() => void` | When set, renders the **Edit pencil** icon button in the action cluster. Gate with `mode === "view" && canWrite`. |
| `editLabel` | `string` | Tooltip/aria for the Edit button (default `"Edit"`). |
| `actions` | `ReactNode` | Extra header controls (status dropdown), placed **left of** the Edit/Close pair. |
| `children` | `ReactNode` | Badge/tag/chip row rendered below the title block. |

### Rules

- **Action cluster is a matched icon pair**: optional `actions`, then Edit (✎),
  then Close (✕) — all bare `h-7 w-7` icon buttons, centered together. Never a
  bordered "Edit" box next to a bare X (they look unbalanced).
- **Edit lives in the header**, not the body or footer (see §4 canonical
  decision). The pencil is the single Edit affordance for view drawers.
- Title/subtitle/eyebrow truncate — never let them run under the action cluster.
- Padding is fixed by the component (`px-5 py-4 pr-4`); don't override unless
  there's a real reason.

---

## 3. Body

```tsx
<div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
  <section>
    <SectionLabel>Contact Info</SectionLabel>     {/* or the inline label */}
    …
  </section>
</div>
```

### Section label

The eyebrow-style label that opens each body section:

```tsx
className="text-2xs uppercase tracking-wider text-muted-foreground mb-1"
```

(`SectionLabel` helper where it exists; otherwise this exact class.)

### Detail grid (label → value pairs)

```tsx
<div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm">   {/* or grid-cols-3 */}
  <div>
    <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Label</p>
    <span>{value}</span>      {/* or a <Badge>, <FormSelect> for inline edit */}
  </div>
</div>
```

- 2 columns for record drawers, 3 columns for metric-heavy drawers.
- Inline-editable values (status, tier) use `<FormSelect>` at `h-7` with the
  standard border + `focus-visible:ring-1 focus-visible:ring-primary`.

---

## 4. Footer (optional) — action bar

Only when the drawer needs commit/secondary actions (edit/new mode).

```tsx
<div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">
  <button className="h-8 rounded-md border border-border bg-surface px-3 text-sm hover:bg-accent">Cancel</button>
  <button className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">Save</button>
</div>
```

### Canonical decision — where does "Edit" go?

- **View mode → Edit is the pencil icon in the header.** Do **not** also put an
  Edit button in a footer. The header X handles closing, so a view-mode footer
  with "Close + Edit" is redundant and should be removed.
- **Edit / New mode → footer action bar** with secondary (Cancel/Close) + primary
  (Save/Create). This is the only place a footer belongs.

---

## 5. Element catalog (where each appears today)

| Element | Drawers |
|---|---|
| Leading avatar | contacts, team, vendors |
| Eyebrow code | service-plans (`SP-`), service-tickets (code + plan badge) |
| Subtitle | contacts, lead-inbox, team |
| Badge row (children) | contacts (tags), vendors (category+status), service-plans (tier+status) |
| Header status dropdown (`actions`) | work-order / opportunity view (status), service-plans (tier/status inline) |
| Footer action bar | edit/new forms (projects, work-orders, scheduling, vendors, stock, catalog, PO) |

---

## 6. Migration status

| Drawer | Header → DrawerHeader | hideClose | Notes |
|---|---|---|---|
| crm/contacts | ✅ | ✅ | Reference implementation; header Edit via `onEdit` |
| crm/lead-inbox | ✅ | ✅ | title + subtitle |
| sales/opportunities (view) | ✅ | ✅ | title + subtitle + stage/priority badges |
| sales/opportunities (edit) | ✅ | ✅ | title only |
| operations/projects (edit) | ✅ | ✅ | title only |
| operations/work-orders (edit) | ✅ | ✅ | title only |
| operations/scheduling | ✅ | ✅ | title only |
| operations/team | ✅ | ✅ | avatar + subtitle |
| service/service-plans | ✅ | ✅ | eyebrow code + tier/status badges |
| service/service-tickets | ✅ | ✅ | eyebrow code+badge |
| inventory/vendors | ✅ | ✅ | avatar + badges |
| inventory/stock | ✅ | ✅ | title (mode-dependent) |
| inventory/catalog | ✅ | ✅ | title (mode-dependent) |
| inventory/purchase-orders | ✅ | ✅ | title (mode-dependent) |
| finance/invoices | ☐ | ☐ | Uses a justify-between header with body actions; migrate to DrawerHeader |

### Remaining follow-ups

- **finance/invoices** — not yet on `DrawerHeader` (only un-migrated drawer).
- **Edit placement on inventory view drawers** (vendors, stock, catalog, PO) —
  these still keep their **footer** "Close + Edit" action bar in view mode.
  Per §4 the canonical view-mode Edit is the header pencil; moving these to
  `onEdit` and dropping the redundant view footer is the cleanup. No regression
  in the meantime (behaviour unchanged from before migration).
- **operations/work-orders (view)** and **opportunities (view)** status controls
  could move into the header `actions` slot for full consistency.

Update this table as each item is completed.
