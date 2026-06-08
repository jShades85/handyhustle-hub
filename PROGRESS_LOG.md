# PROGRESS_LOG.md — BearingPro

> Read this + PROJECT_CONTEXT.md at the start of every session before touching code.

---

## Current Status

**Phase:** Backend — Roles, team management, and invite flow live
**Last Updated:** Session 020
**Live URL:** https://bearingpro.tech (Vercel + Cloudflare DNS)
**Supabase Project:** `erdtfwelbdlvammfdtgz`

---

## What's Next

1. **Wire Operations → Team** to real `user_profiles` data (Settings → Team Members is live; Operations → Team still uses demo data)
2. **Schema sprint** — migrations for all remaining modules (companies, contacts, projects, etc.)
3. **Replace demo data module by module** — starting with CRM after schema is in place
4. **Invite URL cleanup** — `/join/$slug` route using tenant slug (deferred; current base64 token works)
5. **Soft delete UI** — "Deactivated Members" view + reactivate button (deferred pre-launch)

---

## Open Questions / Blockers

- Demo data still needs consolidation into `src/data/index.ts` before large-scale backend wiring
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
| CRM (Contacts/Companies) | 🟡 Demo data | Full UI built, needs schema + data wiring |
| Sales (Lead Inbox, Opps, Quotes) | 🟡 Demo data | Full UI built |
| Operations (Projects, Work Orders, Team, Scheduling) | 🟡 Demo data | Full UI built |
| Service (Tickets, Plans) | 🟡 Demo data | Full UI built |
| Inventory (Catalog, Stock, POs, Vendors) | 🟡 Demo data | Full UI built |
| Finance (Invoices, Payments) | 🟡 Demo data | Full UI built |
| Reports | 🟡 Placeholder | 27-report catalog defined, all coming soon |
| Settings (Company, Tiers, Integrations) | ✅ Company live | Company Profile reads/writes `tenants` table; Tiers + Integrations still demo |
| Settings → Roles | ✅ Live | Full CRUD, module-level read/write permissions, color picker, expandable permission grid |
| Settings → Team Members | ✅ Live | Member list, edit panel (role/vehicle), invite flow (base64 token link), soft delete |
| Quote Builder | ⏸ Deferred | Needs backend |
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

**Trigger logic:** New signup → creates `tenants` row + `user_profiles` row (Owner role). Invited user (has `tenant_id` in metadata) → joins existing tenant with assigned role. Upserts on conflict so re-inviting a removed user reactivates their profile.

**Key pattern learned:** Every security definer function callable from the frontend needs `GRANT EXECUTE ON FUNCTION ... TO authenticated` or PostgREST silently drops the call with no error.

---

## Key Decisions (Permanent)

- **Schema follows UI** — build the page first, derive the schema from what it needs
- **Invite-only for existing companies** — signup creates new tenant; teammates join via invite link (tenant_id in metadata)
- **Stripe** for payments — card + ACH, payment links for commercial NET 30 clients
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
