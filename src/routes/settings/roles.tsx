import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMeta } from "@/contexts/PageMetaContext";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart2, ChevronDown, ChevronRight, DollarSign, Eye,
  Headphones, Package, Pencil, Plus, Settings2, Trash2,
  TrendingUp, Users2, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Database } from "@/lib/supabase/types";

export const Route = createFileRoute("/settings/roles")({
  component: RolesPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type AppModule   = Database["public"]["Enums"]["app_module"];
type Role        = Database["public"]["Tables"]["roles"]["Row"];
type Permission  = Database["public"]["Tables"]["role_permissions"]["Row"];
type RoleWithPermissions = Role & { role_permissions: Permission[] };
type PermState   = "none" | "read" | "write";

// ─── Config ───────────────────────────────────────────────────────────────────

const MODULE_ORDER: AppModule[] = [
  "crm", "sales", "finance", "operations", "service", "inventory", "reports", "settings",
];

const MODULE_META: Record<AppModule, { label: string; Icon: React.ElementType }> = {
  crm:        { label: "CRM",        Icon: Users2      },
  sales:      { label: "Sales",      Icon: TrendingUp  },
  finance:    { label: "Finance",    Icon: DollarSign  },
  operations: { label: "Operations", Icon: Wrench      },
  service:    { label: "Service",    Icon: Headphones  },
  inventory:  { label: "Inventory",  Icon: Package     },
  reports:    { label: "Reports",    Icon: BarChart2   },
  settings:   { label: "Settings",   Icon: Settings2   },
};

const PRESET_COLORS = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9", "#06b6d4",
  "#10b981", "#84cc16", "#f59e0b", "#f97316", "#ef4444",
  "#ec4899", "#94a3b8",
];

const inputCls = "h-8 w-full rounded-md border border-border bg-background px-2.5 text-[12.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
const labelCls = "block text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium mb-1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function permState(perms: Permission[], module: AppModule): PermState {
  const p = perms.find((p) => p.module === module);
  if (!p) return "none";
  return p.can_write ? "write" : "read";
}

function nextState(current: PermState): PermState {
  if (current === "none")  return "read";
  if (current === "read")  return "write";
  return "none";
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function fetchRoles() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("*, role_permissions(*)")
    .order("created_at");
  if (error) throw error;
  return data as RoleWithPermissions[];
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

async function createRole(values: { tenant_id: string; name: string; color: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roles")
    .insert(values)
    .select("*, role_permissions(*)")
    .single();
  if (error) throw error;
  return data as RoleWithPermissions;
}

async function setPermission(roleId: string, module: AppModule, state: PermState) {
  const supabase = createClient();
  if (state === "none") {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("module", module);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("role_permissions")
      .upsert(
        { role_id: roleId, module, can_write: state === "write" },
        { onConflict: "role_id,module" },
      );
    if (error) throw error;
  }
}

// ─── ColorSwatch ──────────────────────────────────────────────────────────────

function ColorSwatch({ color, onChange }: { color: string; onChange: (c: string) => void }) {
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
              className={cn(
                "h-6 w-6 rounded-full border-2 border-white shadow-sm ring-1 transition-transform hover:scale-110",
                c === color ? "ring-primary" : "ring-border",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── ModuleButton ─────────────────────────────────────────────────────────────

function ModuleButton({
  module, state, onChange,
}: {
  module: AppModule;
  state: PermState;
  onChange: (next: PermState) => void;
}) {
  const { label, Icon } = MODULE_META[module];

  const styles: Record<PermState, string> = {
    none:  "bg-muted/40 text-muted-foreground/50 border-border/50 hover:border-border hover:text-muted-foreground",
    read:  "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/20",
    write: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
  };

  const AccessIcon = state === "write" ? Pencil : state === "read" ? Eye : null;

  return (
    <button
      type="button"
      onClick={() => onChange(nextState(state))}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
        styles[state],
      )}
      title={state === "none" ? "No access — click to grant Read" : state === "read" ? "Read only — click to grant Read & Write" : "Read & Write — click to remove access"}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[11px] font-medium leading-tight">{label}</span>
      {AccessIcon && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-current">
          <AccessIcon className="h-2.5 w-2.5 text-white" />
        </span>
      )}
    </button>
  );
}

// ─── PermissionEditor ─────────────────────────────────────────────────────────

function PermissionEditor({
  role,
  onSetPermission,
}: {
  role: RoleWithPermissions;
  onSetPermission: (roleId: string, module: AppModule, state: PermState) => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        Module Access — click to cycle: No Access → Read → Read & Write
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {MODULE_ORDER.map((mod) => (
          <ModuleButton
            key={mod}
            module={mod}
            state={permState(role.role_permissions, mod)}
            onChange={(next) => onSetPermission(role.id, mod, next)}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-500/60" /> Read
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500/60" /> Read & Write
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/20" /> No Access
        </span>
      </div>
    </div>
  );
}

// ─── RoleRow ──────────────────────────────────────────────────────────────────

function RoleRow({
  role,
  isLastRole,
  onUpdate,
  onDelete,
  onSetPermission,
}: {
  role: RoleWithPermissions;
  isLastRole: boolean;
  onUpdate: (id: string, patch: { name?: string; color?: string }) => void;
  onDelete: (id: string) => void;
  onSetPermission: (roleId: string, module: AppModule, state: PermState) => void;
}) {
  const [name, setName] = useState(role.name);
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const nameRef = useRef(role.name);

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

  // Summary pills — modules that have any access
  const accessedModules = MODULE_ORDER.filter(
    (m) => role.role_permissions.some((p) => p.module === m),
  );

  return (
    <div className={cn(
      "rounded-lg border border-border bg-card transition-colors",
      expanded && "border-primary/20 shadow-sm",
    )}>
      {/* Header row */}
      <div className="group flex items-center gap-3 px-4 py-3">
        <ColorSwatch
          color={role.color}
          onChange={(c) => onUpdate(role.id, { color: c })}
        />

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          className="w-36 shrink-0 bg-transparent text-[13px] font-medium text-foreground focus:outline-none border-b border-transparent hover:border-border focus:border-primary transition-colors pb-0.5"
        />

        {/* Module access summary */}
        <div className="flex flex-1 flex-wrap items-center gap-1 min-w-0">
          {accessedModules.length === 0 ? (
            <span className="text-[11px] text-muted-foreground/50 italic">No module access</span>
          ) : accessedModules.length === MODULE_ORDER.length ? (
            <span className="rounded px-1.5 py-0.5 text-[10.5px] font-medium bg-violet-500/15 text-violet-600 dark:text-violet-400">
              All modules
            </span>
          ) : (
            accessedModules.map((mod) => {
              const state = permState(role.role_permissions, mod);
              return (
                <span
                  key={mod}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10.5px] font-medium",
                    state === "write"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-sky-500/15 text-sky-600 dark:text-sky-400",
                  )}
                >
                  {MODULE_META[mod].label}
                </span>
              );
            })
          )}
        </div>

        {/* Expand + delete */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Edit permissions"
          >
            {expanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />}
          </button>

          {confirming ? (
            <div className="flex items-center gap-2 ml-1">
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
              disabled={isLastRole}
              onClick={() => !isLastRole && setConfirming(true)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors opacity-0 group-hover:opacity-100",
                isLastRole
                  ? "cursor-not-allowed text-muted-foreground/20"
                  : "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
              )}
              title={isLastRole ? "Can't delete the last role" : undefined}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Permission editor */}
      {expanded && (
        <div className="px-4 pb-4">
          <PermissionEditor role={role} onSetPermission={onSetPermission} />
        </div>
      )}
    </div>
  );
}

// ─── AddRoleRow ───────────────────────────────────────────────────────────────

function AddRoleRow({
  tenantId,
  onAdd,
}: {
  tenantId: string;
  onAdd: (values: { tenant_id: string; name: string; color: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[3]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function handleOpen() {
    setOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ tenant_id: tenantId, name: trimmed, color });
    setName("");
    setColor(PRESET_COLORS[3]);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-[12.5px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
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
        <div>
          <label className={labelCls}>Color</label>
          <div className="flex h-8 items-center">
            <ColorSwatch color={color} onChange={setColor} />
          </div>
        </div>
        <div className="flex-1">
          <label className={labelCls}>Role Name</label>
          <input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="e.g. Lead Installer"
            className={inputCls}
          />
        </div>
      </div>
      <p className="text-[11.5px] text-muted-foreground">
        Module permissions can be configured after adding the role.
      </p>
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
          onClick={() => { setName(""); setOpen(false); }}
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
      qc.setQueryData<RoleWithPermissions[]>(["roles"], (prev) =>
        prev?.map((r) => r.id === id ? { ...r, ...patch } : r) ?? []
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: (_, id) => {
      qc.setQueryData<RoleWithPermissions[]>(["roles"], (prev) =>
        prev?.filter((r) => r.id !== id) ?? []
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: createRole,
    onSuccess: (newRole) => {
      qc.setQueryData<RoleWithPermissions[]>(["roles"], (prev) =>
        [...(prev ?? []), newRole]
      );
    },
  });

  const permMutation = useMutation({
    mutationFn: ({ roleId, module, state }: { roleId: string; module: AppModule; state: PermState }) =>
      setPermission(roleId, module, state),
    onMutate: ({ roleId, module, state }) => {
      qc.setQueryData<RoleWithPermissions[]>(["roles"], (prev) =>
        prev?.map((r) => {
          if (r.id !== roleId) return r;
          const filtered = r.role_permissions.filter((p) => p.module !== module);
          if (state === "none") return { ...r, role_permissions: filtered };
          return {
            ...r,
            role_permissions: [
              ...filtered,
              { id: "optimistic", role_id: roleId, module, can_write: state === "write" },
            ],
          };
        }) ?? []
      );
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const tenantId = roles[0]?.tenant_id ?? "";

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
          Define roles for your team and control which modules they can access.
          Click a role's arrow to configure its module permissions.
        </p>
      </div>

      <div className="space-y-2">
        {roles.map((role) => (
          <RoleRow
            key={role.id}
            role={role}
            isLastRole={roles.length === 1}
            onUpdate={(id, patch) => updateMutation.mutate({ id, patch })}
            onDelete={(id) => deleteMutation.mutate(id)}
            onSetPermission={(roleId, module, state) =>
              permMutation.mutate({ roleId, module, state })
            }
          />
        ))}
      </div>

      <div className="mt-3">
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
