import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMeta } from "@/contexts/PageMetaContext";
import { createClient } from "@/lib/supabase/client";
import { Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Database } from "@/lib/supabase/types";

export const Route = createFileRoute("/settings/roles")({
  component: RolesPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type PermissionTier = Database["public"]["Enums"]["permission_tier"];
type Role = Database["public"]["Tables"]["roles"]["Row"];

// ─── Config ───────────────────────────────────────────────────────────────────

const TIER_ORDER: PermissionTier[] = [
  "owner", "admin", "office", "field", "warehouse", "readonly",
];

const TIER_META: Record<PermissionTier, { label: string; description: string; cls: string }> = {
  owner:     { label: "Owner",     description: "Everything + billing",            cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  admin:     { label: "Admin",     description: "Everything except billing",        cls: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
  office:    { label: "Office",    description: "CRM, Sales, Finance, Reports",     cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  field:     { label: "Field",     description: "Jobs & truck inventory",           cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  warehouse: { label: "Warehouse", description: "Inventory only",                   cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  readonly:  { label: "Read-only", description: "View only",                        cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

const PRESET_COLORS = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9", "#06b6d4",
  "#10b981", "#84cc16", "#f59e0b", "#f97316", "#ef4444",
  "#ec4899", "#94a3b8",
];

const inputCls = "h-8 w-full rounded-md border border-border bg-background px-2.5 text-[12.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
const labelCls = "block text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium mb-1";

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function fetchRoles() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data as Role[];
}

async function updateRole(id: string, patch: { name?: string; color?: string }) {
  const supabase = createClient();
  const { error } = await supabase.from("roles").update(patch).eq("id", id);
  if (error) throw error;
}

async function deleteRole(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("roles").delete().eq("id", id);
  if (error) throw error;
}

async function createRole(values: {
  tenant_id: string;
  name: string;
  tier: PermissionTier;
  color: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roles")
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  return data as Role;
}

// ─── ColorSwatch ──────────────────────────────────────────────────────────────

function ColorSwatch({
  color, onChange,
}: {
  color: string;
  onChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-6 w-6 shrink-0 rounded-full border-2 border-white shadow-sm ring-1 ring-border transition-transform hover:scale-110"
          style={{ backgroundColor: color }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2.5" align="start">
        <div className="grid grid-cols-6 gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onChange(c); setOpen(false); }}
              className="relative h-6 w-6 rounded-full border-2 border-white shadow-sm ring-1 ring-border transition-transform hover:scale-110"
              style={{ backgroundColor: c }}
            >
              {c === color && (
                <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── TierBadge ────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: PermissionTier }) {
  const { label, cls } = TIER_META[tier];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium", cls)}>
      {label}
    </span>
  );
}

// ─── RoleRow ──────────────────────────────────────────────────────────────────

function RoleRow({
  role,
  isOnlyOwner,
  onUpdate,
  onDelete,
}: {
  role: Role;
  isOnlyOwner: boolean;
  onUpdate: (id: string, patch: { name?: string; color?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(role.name);
  const [confirming, setConfirming] = useState(false);
  const nameRef = useRef(role.name);

  // Keep local name in sync if role changes (e.g. after refetch)
  useEffect(() => {
    if (nameRef.current !== role.name) {
      setName(role.name);
      nameRef.current = role.name;
    }
  }, [role.name]);

  function handleNameBlur() {
    const trimmed = name.trim();
    if (!trimmed) { setName(role.name); return; }
    if (trimmed !== role.name) onUpdate(role.id, { name: trimmed });
  }

  const canDelete = !isOnlyOwner;

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/20">
      {/* Color swatch */}
      <ColorSwatch
        color={role.color}
        onChange={(c) => onUpdate(role.id, { color: c })}
      />

      {/* Name */}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleNameBlur}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className="flex-1 bg-transparent text-[13px] font-medium text-foreground focus:outline-none border-b border-transparent hover:border-border focus:border-primary transition-colors pb-0.5"
      />

      {/* Tier badge + description */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <TierBadge tier={role.tier} />
        <span className="text-[11.5px] text-muted-foreground">
          {TIER_META[role.tier].description}
        </span>
      </div>

      {/* Delete */}
      <div className="ml-2 shrink-0">
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-muted-foreground">Delete?</span>
            <button
              onClick={() => onDelete(role.id)}
              className="rounded px-2 py-0.5 text-[11.5px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded px-2 py-0.5 text-[11.5px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => canDelete && setConfirming(true)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors opacity-0 group-hover:opacity-100",
              canDelete
                ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                : "cursor-not-allowed text-muted-foreground/30",
            )}
            title={!canDelete ? "Can't delete — must have at least one Owner role" : undefined}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── AddRoleRow ───────────────────────────────────────────────────────────────

function AddRoleRow({
  tenantId,
  onAdd,
}: {
  tenantId: string;
  onAdd: (values: { tenant_id: string; name: string; tier: PermissionTier; color: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tier, setTier] = useState<PermissionTier>("field");
  const [color, setColor] = useState(PRESET_COLORS[3]); // emerald default
  const nameInputRef = useRef<HTMLInputElement>(null);

  function handleOpen() {
    setOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ tenant_id: tenantId, name: trimmed, tier, color });
    setName("");
    setTier("field");
    setColor(PRESET_COLORS[3]);
    setOpen(false);
  }

  function handleCancel() {
    setName("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-[12.5px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors w-full"
      >
        <Plus className="h-3.5 w-3.5" />
        Add role
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-card px-4 py-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">New Role</p>
      <div className="flex items-end gap-3">
        {/* Color */}
        <div>
          <label className={labelCls}>Color</label>
          <div className="flex h-8 items-center">
            <ColorSwatch color={color} onChange={setColor} />
          </div>
        </div>

        {/* Name */}
        <div className="flex-1">
          <label className={labelCls}>Role Name</label>
          <input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") handleCancel(); }}
            placeholder="e.g. Lead Installer"
            className={inputCls}
          />
        </div>

        {/* Tier */}
        <div className="w-40">
          <label className={labelCls}>Permission Tier</label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as PermissionTier)}
            className={cn(inputCls, "appearance-none")}
          >
            {TIER_ORDER.map((t) => (
              <option key={t} value={t}>{TIER_META[t].label} — {TIER_META[t].description}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!name.trim()}
          className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Add Role
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="h-8 rounded-md border border-border px-4 text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── RolesPage ────────────────────────────────────────────────────────────────

function RolesPage() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Roles", subtitle: "Settings" }); }, [setMeta]);

  const qc = useQueryClient();
  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; color?: string } }) =>
      updateRole(id, patch),
    onSuccess: (_, { id, patch }) => {
      qc.setQueryData<Role[]>(["roles"], (prev) =>
        prev?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? []
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: (_, id) => {
      qc.setQueryData<Role[]>(["roles"], (prev) =>
        prev?.filter((r) => r.id !== id) ?? []
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: createRole,
    onSuccess: (newRole) => {
      qc.setQueryData<Role[]>(["roles"], (prev) => [...(prev ?? []), newRole]);
    },
  });

  const ownerRoles = roles.filter((r) => r.tier === "owner");
  const tenantId = roles[0]?.tenant_id ?? "";

  // Group roles by tier for display
  const grouped = TIER_ORDER
    .map((tier) => ({ tier, items: roles.filter((r) => r.tier === tier) }))
    .filter((g) => g.items.length > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-[12.5px] text-muted-foreground">
        Loading roles…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-8 py-8 text-[12.5px] text-destructive">
        Failed to load roles. Please refresh.
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[15px] font-semibold">Roles</h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Custom role names for your team. Each role maps to a permission tier that controls access.
          Click a name to rename it, or the color dot to change its color.
        </p>
      </div>

      {/* Tier legend */}
      <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4">
        <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Permission Tiers
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TIER_ORDER.map((tier) => (
            <div key={tier} className="flex items-center gap-2">
              <TierBadge tier={tier} />
              <span className="text-[11.5px] text-muted-foreground">{TIER_META[tier].description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Role groups */}
      <div className="space-y-5">
        {grouped.map(({ tier, items }) => (
          <div key={tier}>
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {TIER_META[tier].label}
            </p>
            <div className="space-y-1.5">
              {items.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  isOnlyOwner={role.tier === "owner" && ownerRoles.length === 1}
                  onUpdate={(id, patch) => updateMutation.mutate({ id, patch })}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add role */}
      <div className="mt-4">
        {tenantId && (
          <AddRoleRow
            tenantId={tenantId}
            onAdd={(values) => createMutation.mutate(values)}
          />
        )}
      </div>
    </div>
  );
}
