import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  Archive, Briefcase, Calendar, ChevronDown, Clock, Copy, FileText,
  FolderKanban, MapPin, MoreHorizontal, Pencil, Plus, Trash2, UploadCloud,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DrawerHeader } from "@/components/ui/drawer-header";
import { FormSelect } from "@/components/ui/form-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui-bits";
import {
  statusMeta, STATUS_OPTIONS,
  type ProjectStatus, type ProjectRecord,
} from "@/data/projects";
import { PartsPanel } from "@/components/projects/PartsPanel";
import { TeamPanel } from "@/components/projects/TeamPanel";
import { ActivityPanel } from "@/components/projects/ActivityPanel";
import { usePermissions } from "@/contexts/PermissionsContext";

export const Route = createFileRoute("/operations/projects/$projectId")({
  component: ProjectDetailPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = "overview" | "phases" | "parts" | "team" | "activity" | "files";
type DetailSection = "Projects" | "Work Orders";

interface TeamMember {
  id: string;
  full_name: string | null;
}

type ProjectUpdateFields = {
  name: string;
  site_address: string | null;
  start_date: string | null;
  target_end_date: string | null;
  pm_id: string | null;
  contract_value: number | null;
  budgeted_cost: number | null;
  budgeted_hours: number | null;
  notes: string | null;
};

interface DbProject {
  id: string;
  code: string | null;
  name: string;
  status: ProjectStatus;
  site_address: string | null;
  contract_value: number | null;
  budgeted_cost: number | null;
  budgeted_hours: number | null;
  start_date: string | null;
  target_end_date: string | null;
  notes: string | null;
  contact_id: string | null;
  company: { id: string; name: string } | null;
  pm: { id: string; full_name: string | null } | null;
  opportunity: { id: string; title: string } | null;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview",  label: "Overview" },
  { id: "phases",    label: "Phases & Tasks" },
  { id: "parts",     label: "Parts List" },
  { id: "team",      label: "Team" },
  { id: "activity",  label: "Activity" },
  { id: "files",     label: "Files" },
];

const ACTIVITY: Array<{ icon: typeof FileText; color: string; text: string; time: string }> = [
  { icon: Clock,        color: "text-amber-500",  text: "Ravi Tate logged 8 hours on Install — Phase 2", time: "2h ago" },
  { icon: FolderKanban, color: "text-primary",     text: "Status changed to In Progress",                 time: "Jun 2" },
  { icon: FileText,     color: "text-blue-500",    text: "Quote Q-2026-0415 linked to this project",      time: "May 28" },
];

// ─── Data ─────────────────────────────────────────────────────────────────────

async function fetchProjectById(id: string): Promise<DbProject | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id,code,name,status,site_address,contract_value,budgeted_cost,budgeted_hours,start_date,target_end_date,notes,contact_id,company:companies(id,name),pm:user_profiles!pm_id(id,full_name),opportunity:opportunities(id,title)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as DbProject;
}

async function updateProjectStatus(id: string, status: ProjectStatus): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").update({ status }).eq("id", id).select().single();
  if (error) throw error;
}

async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("id, full_name")
    .eq("is_active", true)
    .order("full_name");
  return (data ?? []) as TeamMember[];
}

async function updateProject(id: string, fields: ProjectUpdateFields): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").update(fields).eq("id", id).select().single();
  if (error) throw error;
}

// ─── Phase (WO) types + data ──────────────────────────────────────────────────

type PhaseStatus = "scheduled" | "in-progress" | "on-hold" | "completed" | "cancelled";

interface DbPhaseWO {
  id: string;
  code: string | null;
  name: string;
  status: PhaseStatus;
  scheduled_date: string | null;
  budgeted_hours: number | null;
  assignee: { id: string; full_name: string | null } | null;
}

async function fetchProjectPhases(projectId: string): Promise<DbPhaseWO[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("id,code,name,status,scheduled_date,budgeted_hours,assignee:user_profiles!assigned_to(id,full_name)")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as DbPhaseWO[];
}

async function insertProjectPhase(values: {
  name: string;
  project_id: string;
  company_id: string | null;
  contact_id: string | null;
  site_address: string | null;
  assigned_to: string | null;
  scheduled_date: string | null;
  budgeted_hours: number | null;
  notes: string;
}): Promise<void> {
  const supabase = createClient();
  const { data: tenantRow } = await supabase.from("tenants").select("id").single();
  if (!tenantRow) throw new Error("No tenant");
  const { count } = await supabase.from("work_orders").select("*", { count: "exact", head: true });
  const code = `WO-${String((count ?? 0) + 1).padStart(4, "0")}`;
  const { error } = await supabase.from("work_orders").insert({
    ...values,
    tenant_id: tenantRow.id,
    code,
    status: "scheduled",
  });
  if (error) throw error;
}

function toProjectRecord(d: DbProject): ProjectRecord {
  const pmName = d.pm?.full_name ?? "";
  const pmInitials = pmName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  return {
    id: d.id,
    code: d.code ?? "—",
    name: d.name,
    customer: d.company?.name ?? "—",
    siteAddress: d.site_address ?? "—",
    status: d.status,
    type: "project",
    contractValue: Number(d.contract_value ?? 0),
    budgetedCost: Number(d.budgeted_cost ?? 0),
    actualCost: 0,
    budgetedHours: Number(d.budgeted_hours ?? 0),
    loggedHours: 0,
    tasksTotal: 0,
    tasksDone: 0,
    startDate: d.start_date ?? "—",
    targetEndDate: d.target_end_date ?? "—",
    pm: pmInitials,
    sourceQuote: null,
    opportunityRef: d.opportunity?.title ?? null,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ProjectRecord["type"] }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium",
      type === "work-order"
        ? "bg-slate-500/10 text-slate-500 dark:text-slate-400"
        : "bg-primary/10 text-primary",
    )}>
      {type === "work-order" ? "Work Order" : "Project"}
    </span>
  );
}

function StatusDropdown({
  status,
  onChange,
  disabled = false,
}: {
  status: ProjectStatus;
  onChange: (s: ProjectStatus) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const { label, cls } = statusMeta[status];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-opacity",
          disabled ? "cursor-default" : "hover:opacity-80",
          cls,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {label}
        {!disabled && <ChevronDown className="h-3 w-3 opacity-60" />}
      </button>
      {!disabled && open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-border bg-popover py-1 shadow-md">
          {STATUS_OPTIONS.filter((o) => o.value !== "all").map((o) => {
            const s = o.value as ProjectStatus;
            const { label: l, cls: c } = statusMeta[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => { onChange(s); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors",
                  status === s && "bg-accent/50",
                )}
              >
                <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium", c)}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {l}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums leading-none", valueClass)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Project phases tab (live work orders) ────────────────────────────────────

function AddPhaseModal({
  projectId,
  dbProject,
  teamMembers,
  onClose,
  onSaved,
}: {
  projectId: string;
  dbProject: DbProject;
  teamMembers: TeamMember[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputCls  = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50";  const labelCls  = "block text-2xs uppercase tracking-wider text-muted-foreground mb-1";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setSaveError(null);
    try {
      await insertProjectPhase({
        name:           fd.get("name") as string,
        project_id:     projectId,
        company_id:     dbProject.company?.id ?? null,
        contact_id:     dbProject.contact_id ?? null,
        site_address:   dbProject.site_address,
        assigned_to:    (fd.get("assigned_to") as string) || null,
        scheduled_date: (fd.get("scheduled_date") as string) || null,
        budgeted_hours: fd.get("budgeted_hours") ? parseFloat(fd.get("budgeted_hours") as string) : null,
        notes:          (fd.get("notes") as string) ?? "",
      });
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to add phase — check console for details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-md" onInteractOutside={(e) => { if (saving) e.preventDefault(); }}>
      <DialogHeader><DialogTitle>Add Phase</DialogTitle></DialogHeader>
      {(dbProject.company || dbProject.site_address) && (
        <div className="rounded-md bg-muted/40 border border-border px-3 py-2 text-sm text-muted-foreground space-y-0.5">
          {dbProject.company && <p><span className="font-medium text-foreground">{dbProject.company.name}</span></p>}
          {dbProject.site_address && <p>{dbProject.site_address}</p>}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>Phase Name *</label>
          <input name="name" required className={inputCls} placeholder="e.g. Rough-In, Trim-Out, Commission" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Assigned Technician</label>
            <FormSelect name="assigned_to">
              <option value="">— Unassigned —</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </FormSelect>
          </div>
          <div>
            <label className={labelCls}>Scheduled Date</label>
            <input name="scheduled_date" type="date" className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Budgeted Hours</label>
            <input name="budgeted_hours" type="number" min="0" step="0.5" className={inputCls} placeholder="0" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea name="notes" rows={2} className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary" placeholder="Any additional context…" />
        </div>
        {saveError && (
          <p className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">{saveError}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? "Adding…" : "Add Phase"}
          </button>
        </div>
      </form>
    </DialogContent>
  );
}

function ProjectPhasesTab({
  projectId,
  dbProject,
  teamMembers,
  canWrite,
}: {
  projectId: string;
  dbProject: DbProject;
  teamMembers: TeamMember[];
  canWrite: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: phases = [], isLoading } = useQuery({
    queryKey: ["project-work-orders", projectId],
    queryFn: () => fetchProjectPhases(projectId),
  });

  const handleSaved = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["project-work-orders", projectId] });
    qc.invalidateQueries({ queryKey: ["work-orders"] });
    setAddOpen(false);
  }, [qc, projectId]);

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-2xs uppercase tracking-wider text-muted-foreground">
          {phases.length} phase{phases.length !== 1 ? "s" : ""}
        </p>
        {canWrite && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 h-7 rounded-md border border-border bg-surface px-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Phase
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading phases…</div>
      ) : phases.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-base font-medium">No phases yet</p>
          <p className="mt-1 text-sm text-muted-foreground mb-4">
            Add phases to break this project into schedulable work orders.
          </p>
          {canWrite && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 h-7 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Phase
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface/50 border-b border-border">
              <tr className="text-2xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-4 text-left font-medium">Phase</th>
                <th className="py-2 px-3 text-left font-medium">Status</th>
                <th className="py-2 px-3 text-left font-medium">Assigned</th>
                <th className="py-2 px-3 text-left font-medium">Scheduled</th>
                <th className="py-2 px-3 text-right font-medium">Hours</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((phase) => {
                const { label, cls } = statusMeta[phase.status as ProjectStatus];
                const techName = phase.assignee?.full_name ?? "Unassigned";
                const techInitials = techName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <tr
                    key={phase.id}
                    onClick={() => navigate({ to: "/operations/work-orders/$workOrderId", params: { workOrderId: phase.id } })}
                    className="border-b border-border/60 last:border-0 cursor-pointer hover:bg-accent/40 transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <div className="font-medium leading-snug">{phase.name}</div>
                      <div className="text-2xs font-mono text-muted-foreground">{phase.code ?? "—"}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap", cls)}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Avatar initials={techInitials} className="!h-5 !w-5 !text-2xs shrink-0" />
                        <span className="text-muted-foreground">{techName.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {phase.scheduled_date ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {phase.scheduled_date}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                      {phase.budgeted_hours != null ? `${phase.budgeted_hours}h` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <AddPhaseModal
          projectId={projectId}
          dbProject={dbProject}
          teamMembers={teamMembers}
          onClose={() => setAddOpen(false)}
          onSaved={handleSaved}
        />
      </Dialog>
    </div>
  );
}

// ─── Shared detail view ───────────────────────────────────────────────────────

export interface ProjectDetailViewProps {
  projectId: string;
  section?: DetailSection;
}

export function ProjectDetailView({
  projectId,
  section = "Projects",
}: ProjectDetailViewProps) {
  const { setMeta } = useMeta();
  const { can } = usePermissions();
  const canWrite = can("operations", "write");
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const statusInitialized = useRef(false);

  const { data: dbProject } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProjectById(projectId),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-basic"],
    queryFn: fetchTeamMembers,
  });

  const updateMutation = useMutation({
    mutationFn: (fields: ProjectUpdateFields) => updateProject(projectId, fields),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      setEditOpen(false);
    },
  });

  const project = useMemo(
    () => (dbProject ? toProjectRecord(dbProject) : null),
    [dbProject],
  );

  const [status, setStatus] = useState<ProjectStatus>("in-progress");

  useEffect(() => {
    if (dbProject && !statusInitialized.current) {
      setStatus(dbProject.status);
      statusInitialized.current = true;
    }
  }, [dbProject]);

  const statusMutation = useMutation({
    mutationFn: (s: ProjectStatus) => updateProjectStatus(projectId, s),
    onMutate: (s) => {
      setStatus(s);
      qc.setQueryData(["project", projectId], (old: DbProject | null | undefined) =>
        old ? { ...old, status: s } : old,
      );
    },
    onError: () => {
      if (dbProject) setStatus(dbProject.status);
    },
  });

  const backHref = section === "Work Orders" ? "/operations/work-orders" : "/operations/projects";
  const backLabel = section === "Work Orders" ? "All Work Orders" : "All Projects";

  useEffect(() => {
    if (project) {
      setMeta({ title: project.name, subtitle: section });
    }
  }, [setMeta, project, section]);

  if (!dbProject && dbProject !== undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Briefcase className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-md font-medium">
          {section === "Work Orders" ? "Work order" : "Project"} not found
        </p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          No record with ID &ldquo;{projectId}&rdquo; exists.
        </p>
        <Link
          to={backHref}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to {section}
        </Link>
      </div>
    );
  }

  if (!project) {
    return <div className="flex items-center justify-center py-24 text-muted-foreground text-base">Loading…</div>;
  }

  const margin = project.contractValue > 0
    ? ((project.contractValue - project.actualCost) / project.contractValue) * 100
    : 0;
  const completionPct = project.tasksTotal > 0
    ? Math.round((project.tasksDone / project.tasksTotal) * 100)
    : 0;

  return (
    <div className="flex flex-col">
      {/* Back nav */}
      <div className="border-b border-border px-5 py-2.5">
        <Link
          to={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 13L5 8l5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {backLabel}
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-border px-5 py-5 space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-2xs text-muted-foreground">{project.code}</span>
              <TypeBadge type={project.type} />
            </div>
            <h1 className="text-lg font-semibold tracking-tight leading-snug">{project.name}</h1>
            <p className="mt-0.5 text-base text-muted-foreground">{project.customer}</p>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{project.siteAddress}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusDropdown status={status} onChange={(s) => statusMutation.mutate(s)} disabled={!canWrite} />
            <p className="text-display font-semibold tabular-nums">{currency(project.contractValue)}</p>
            <p className="text-2xs text-muted-foreground">Contract Value</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5">
              <dt className="text-muted-foreground">Start</dt>
              <dd className="font-medium">{project.startDate}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="text-muted-foreground">Target End</dt>
              <dd className="font-medium">{project.targetEndDate}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="text-muted-foreground">Quote</dt>
              <dd className={project.sourceQuote ? "font-medium text-blue-500" : "text-muted-foreground"}>
                {project.sourceQuote ?? "No quote linked"}
              </dd>
            </div>
            <div className="flex items-center gap-1.5 max-w-xs">
              <dt className="text-muted-foreground shrink-0">Opportunity</dt>
              <dd className={cn("truncate", project.opportunityRef ? "font-medium text-blue-500" : "text-muted-foreground")}>
                {project.opportunityRef ?? "No opportunity linked"}
              </dd>
            </div>
          </dl>

          <div className="flex items-center gap-2 shrink-0">
            {canWrite && (
              <button type="button" onClick={() => setEditOpen(true)} className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors" aria-label="More options">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem disabled className="gap-2">
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="gap-2">
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="gap-2 text-destructive focus:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Sticky tab bar */}
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-background px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative h-9 rounded-md px-2.5 text-sm transition-colors",
              tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-px bg-primary" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {tab === "overview" && <OverviewTab project={project} margin={margin} completionPct={completionPct} />}
        {tab === "phases"   && dbProject && <ProjectPhasesTab projectId={project.id} dbProject={dbProject} teamMembers={teamMembers} canWrite={canWrite} />}
        {tab === "parts"    && <PartsPanel projectId={project.id} />}
        {tab === "team"     && <TeamPanel projectId={project.id} />}
        {tab === "activity" && <ActivityPanel projectId={project.id} />}
        {tab === "files"    && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <UploadCloud className="h-9 w-9 text-muted-foreground/30 mb-3" />
            <p className="text-base font-medium">No files attached</p>
            <p className="mt-1 text-sm text-muted-foreground">File attachments coming soon.</p>
          </div>
        )}
      </div>

      {dbProject && (
        <ProjectEditDrawer
          open={editOpen}
          onClose={() => setEditOpen(false)}
          dbProject={dbProject}
          teamMembers={teamMembers}
          onSave={(fields) => updateMutation.mutate(fields)}
          saving={updateMutation.isPending}
        />
      )}
    </div>
  );
}

// ─── Route component ──────────────────────────────────────────────────────────

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  return <ProjectDetailView projectId={projectId} section="Projects" />;
}

// ─── Edit drawer ──────────────────────────────────────────────────────────────

function ProjectEditDrawer({
  open, onClose, dbProject, teamMembers, onSave, saving,
}: {
  open: boolean;
  onClose: () => void;
  dbProject: DbProject;
  teamMembers: TeamMember[];
  onSave: (fields: ProjectUpdateFields) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(dbProject.name);
  const [siteAddress, setSiteAddress] = useState(dbProject.site_address ?? "");
  const [startDate, setStartDate] = useState(dbProject.start_date ?? "");
  const [targetEndDate, setTargetEndDate] = useState(dbProject.target_end_date ?? "");
  const [pmId, setPmId] = useState(dbProject.pm?.id ?? "");
  const [contractValue, setContractValue] = useState(dbProject.contract_value?.toString() ?? "");
  const [budgetedCost, setBudgetedCost] = useState(dbProject.budgeted_cost?.toString() ?? "");
  const [budgetedHours, setBudgetedHours] = useState(dbProject.budgeted_hours?.toString() ?? "");
  const [notes, setNotes] = useState(dbProject.notes ?? "");

  useEffect(() => {
    if (open) {
      setName(dbProject.name);
      setSiteAddress(dbProject.site_address ?? "");
      setStartDate(dbProject.start_date ?? "");
      setTargetEndDate(dbProject.target_end_date ?? "");
      setPmId(dbProject.pm?.id ?? "");
      setContractValue(dbProject.contract_value?.toString() ?? "");
      setBudgetedCost(dbProject.budgeted_cost?.toString() ?? "");
      setBudgetedHours(dbProject.budgeted_hours?.toString() ?? "");
      setNotes(dbProject.notes ?? "");
    }
  }, [open, dbProject]);

  const fieldCls = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-base focus:outline-none focus-visible:ring-1 focus-visible:ring-ring";
  const labelCls = "text-sm font-medium text-muted-foreground";

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent hideClose className="sm:max-w-[460px] flex flex-col p-0 gap-0">
        <DrawerHeader title="Edit Project" />

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Project Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Site Address</label>
            <input value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} className={fieldCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelCls}>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Target End</label>
              <input type="date" value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)} className={fieldCls} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Project Manager</label>
            <FormSelect value={pmId} onChange={(e) => setPmId(e.target.value)} className={fieldCls}>
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name ?? "—"}</option>
              ))}
            </FormSelect>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelCls}>Contract Value ($)</label>
              <input type="number" min="0" step="0.01" value={contractValue} onChange={(e) => setContractValue(e.target.value)} className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Budgeted Cost ($)</label>
              <input type="number" min="0" step="0.01" value={budgetedCost} onChange={(e) => setBudgetedCost(e.target.value)} className={fieldCls} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Budgeted Hours</label>
            <input type="number" min="0" step="0.5" value={budgetedHours} onChange={(e) => setBudgetedHours(e.target.value)} className={fieldCls} />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={cn(fieldCls, "resize-none")} />
          </div>
        </div>

        <div className="border-t border-border px-5 py-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-base hover:bg-accent transition-colors">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={() => onSave({
              name: name.trim(),
              site_address: siteAddress.trim() || null,
              start_date: startDate || null,
              target_end_date: targetEndDate || null,
              pm_id: pmId || null,
              contract_value: contractValue ? parseFloat(contractValue) : null,
              budgeted_cost: budgetedCost ? parseFloat(budgetedCost) : null,
              budgeted_hours: budgetedHours ? parseFloat(budgetedHours) : null,
              notes: notes.trim() || null,
            })}
            className="rounded-md bg-primary px-3 py-1.5 text-base font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  project,
  margin,
  completionPct,
}: {
  project: ProjectRecord;
  margin: number;
  completionPct: number;
}) {
  const marginClass =
    margin >= 30 ? "text-status-won" :
    margin >= 20 ? "text-amber-500" :
    project.actualCost === 0 ? "" :
    "text-status-lost";

  return (
    <div className="px-5 py-5 space-y-6">
      <section>
        <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-3">Financials</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock label="Contract Value" value={currency(project.contractValue)} />
          <StatBlock label="Budgeted Cost" value={currency(project.budgetedCost)} />
          <StatBlock label="Actual Cost" value={project.actualCost > 0 ? currency(project.actualCost) : "—"} />
          <StatBlock
            label="Margin"
            value={project.actualCost > 0 ? `${margin.toFixed(1)}%` : "—"}
            sub={project.actualCost > 0 ? `${currency(project.contractValue - project.actualCost)} gross` : undefined}
            valueClass={marginClass}
          />
        </div>
      </section>

      <section>
        <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-3">Progress</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatBlock label="Budgeted Hours" value={project.budgetedHours > 0 ? `${project.budgetedHours} hrs` : "—"} />
          <StatBlock
            label="Logged Hours"
            value={project.loggedHours > 0 ? `${project.loggedHours} hrs` : "—"}
            sub={project.budgetedHours > 0 && project.loggedHours > 0
              ? `${Math.round((project.loggedHours / project.budgetedHours) * 100)}% of budget`
              : undefined}
          />
          <StatBlock
            label="Completion"
            value={project.tasksTotal > 0 ? `${completionPct}%` : "—"}
            sub={project.tasksTotal > 0 ? `${project.tasksDone} of ${project.tasksTotal} tasks done` : "No tasks yet"}
          />
        </div>
        {project.budgetedHours > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-2xs text-muted-foreground">
              <span>Hours used</span>
              <span className="font-mono">{project.loggedHours} / {project.budgetedHours} hrs</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-[width]"
                style={{ width: `${Math.min(100, (project.loggedHours / project.budgetedHours) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </section>

      <section>
        <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-3">Recent Activity</p>
        <ul className="space-y-3">
          {ACTIVITY.map((a, i) => {
            const Icon = a.icon;
            return (
              <li key={i} className="flex gap-3 text-sm">
                <div className={cn("mt-0.5 shrink-0", a.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p>{a.text}</p>
                  <p className="mt-0.5 font-mono text-2xs text-muted-foreground">{a.time}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
