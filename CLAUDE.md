# BearingPro — Claude Code Reference

Multi-tenant SaaS for trade service businesses. Each tenant (company) is fully isolated via Supabase RLS.

---

## Read First

Before writing any code in a new session, read these files:

- @PROGRESS_LOG.md — current status, what's done, what's next, open questions
- @PROJECT_CONTEXT.md — full architecture, decisions, and conventions

---

## Commands

```bash
bun dev          # start dev server
bun run build    # production build
bun add <pkg>    # add a package (never npm install)
tsc --noEmit     # type check
```

> On Windows: use `npm install` for initial dependency install only (Bun esbuild bug). Use Bun for everything else.

---

## Stack

| Layer       | Tech                  | Notes                                                        |
| ----------- | --------------------- | ------------------------------------------------------------ |
| Framework   | TanStack Start        | SSR — use loaders + server functions, not useEffect for data |
| Router      | TanStack Router       | File-based routing in `src/routes/`                          |
| Data        | TanStack Query v5     |                                                              |
| UI          | shadcn/ui + Radix     | Use existing components before building custom               |
| Styling     | Tailwind CSS v4       | CSS-based config only — no `tailwind.config.js`              |
| Forms       | React Hook Form + Zod | `<FormControl>` must always be inside `<FormItem>`           |
| Backend     | Supabase              | Auth, Postgres, RLS, Storage, Edge Functions                 |
| Package mgr | Bun                   | `bun add` not `npm install`                                  |

⚠️ TanStack Start is NOT plain Vite + React Router. Confirm patterns before building any data-connected feature.

---

## Project Structure

```
src/
  routes/          # file-based routes — match existing patterns before creating
  components/
    ui/            # shadcn + custom components
    layout/        # AppShell, Sidebar, Topbar
  contexts/        # PageMetaContext (title, subtitle, New button per route)
  hooks/           # useTheme and others
  data/            # demo data (all static placeholder data lives here)
  styles.css       # Tailwind v4 tokens — Linear-inspired design system
```

---

## Rules

### Always

- Check if a file exists before creating it — never duplicate
- Match the existing route file naming pattern before creating new routes
- Use `<FormItem>` wrapper around every `<FormControl>` — hard throws without it
- TypeScript strict mode — no `any` without an explanatory comment
- `PascalCase` components, `camelCase` functions, `snake_case` DB columns
- Use shadcn/ui components before building custom ones
- Tailwind v4 only — CSS variables, no v3 config patterns

### TanStack Query Keys (Critical)

- **Same key = identical select shape.** If two pages query the same table with different columns, they MUST use different keys.
- **Partial selects use a `-basic` suffix** — e.g. `["vendors-basic"]` for `select("id, name")` vs `["vendors"]` for `select("*")`.
- Before adding a new `useQuery`, run `bun run check:keys` to catch collisions. This has caused three production crashes.
- Safe to share a key across files only when the `select(...)` string is character-for-character identical (e.g. `["invoices"]` shared between invoices and payments pages uses the same full select).

### Never

- `npm install` — use `bun add`
- Manual Supabase dashboard edits — migrations only
- Skip RLS on any tenant-scoped table
- Reorganize `src/` folder structure without discussion
- Make changes to auth or RLS without explicit confirmation

### Multi-Tenancy (Critical)

Every data table must have:

- `tenant_id` UUID foreign key
- Supabase RLS policy scoped to `tenant_id`

### Diagnosing Errors

- Diagnose root cause before fixing — never patch symptoms
- Do not issue a fix until root cause is confirmed
- Do not stack fixes on top of uncertain state
- Report findings before making changes when asked to diagnose

---

## Routes

Flat routes for top-level nav (`/scheduling`, `/dashboard`).
Nested routes for modules (`/operations/projects`, `/sales/quotes`).

⚠️ Check `src/routes/` before creating — many placeholders already exist.

---

## PageMetaContext

Every route registers its own page title, subtitle, and New button action on mount:

```tsx
const { setMeta } = usePageMeta();
useEffect(() => {
  setMeta({
    title: "Page Title",
    subtitle: "Subtitle",
    newLabel: "New Item",
    onNew: () => setDrawerOpen(true),
  });
}, []);
```

---

## Demo Data

All static placeholder data lives in `src/data/`. No real backend yet.
Do not hardcode demo data inside route files — import from `src/data/`.

---

## Git

```bash
git add -A && git commit -m "feat: description" && git push origin main
```

Push at the end of every session. Never leave uncommitted work between machines.

---

## Environment Variables

| Variable                 | Purpose                      |
| ------------------------ | ---------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL         |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key            |
| `RESEND_API_KEY`         | Email (Edge Function secret) |

---

## What's Not Built Yet

Backend, auth, and real data connections are not implemented.
All pages use static demo data from `src/data/`.
Do not attempt Supabase data connections until the backend session begins.
