import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useNewIntent } from "@/hooks/use-new-intent";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { FilterBar, SearchInput, FilterSelect } from "@/components/ui/page-components";
import { FormSelect } from "@/components/ui/form-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STATUS_OPTIONS, statusMeta, type ProjectStatus } from "@/data/projects";

export const Route = createFileRoute("/operations/projects/")({
  head: () => ({ meta: [{ title: "Projects · BearingPro" }] }),
  component: ProjectsListPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface DbProject {
  id: string;
  code: string | null;
  name: string;
  status: ProjectStatus;
  contract_value: number | null;
  start_date: string | null;
  target_end_date: string | null;
  company: { id: string; name: string } | null;
  pm: { id: string; full_name: string | null } | null;
}

interface TeamMember { id: string; full_name: string | null }
interface CompanyOption { id: string; name: string }
interface ContactOption { id: string; full_name: string }

// ─── Data ─────────────────────────────────────────────────────────────────────

async function fetchProjects(): Promise<DbProject[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id,code,name,status,contract_value,start_date,target_end_date,company:companies(id,name),pm:user_profiles!pm_id(id,full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbProject[];
}

async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("user_profiles").select("id,full_name").eq("is_active", true).order("full_name");
  if (error) throw error;
  return data ?? [];
}

async function fetchCompanyOptions(): Promise<CompanyOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("companies").select("id,name").order("name");
  if (error) throw error;
  return data ?? [];
}

async function fetchContactOptions(): Promise<ContactOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("contacts").select("id,full_name").order("full_name");
  if (error) throw error;
  return data ?? [];
}

async function insertProject(values: {
  name: string; company_id: string | null; contact_id: string | null;
  pm_id: string | null; site_address: string; contract_value: number | null;
  budgeted_cost: number | null; budgeted_hours: number | null;
  start_date: string | null; target_end_date: string | null;
  status: ProjectStatus; notes: string;
}) {
  const supabase = createClient();
  const { data: tenantRow } = await supabase.from("tenants").select("id").single();
  if (!tenantRow) throw new Error("No tenant");
  const { count } = await supabase.from("projects").select("*", { count: "exact", head: true });
  const code = `AV-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, "0")}`;
  const { error } = await supabase.from("projects").insert({ ...values, tenant_id: tenantRow.id, code });
  if (error) throw error;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, cls } = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ProjectsListPage() {
  const { setMeta } = useMeta();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  useNewIntent(() => setNewOpen(true));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
  const { data: team = [] } = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });

  useEffect(() => {
    setMeta({
      title: "Projects",
      subtitle: "Operations",
      newLabel: "New Project",
      onNew: () => setNewOpen(true),
    });
  }, [setMeta]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !(p.company?.name ?? "").toLowerCase().includes(q) && !(p.code ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, search, statusFilter]);

  const openDetail = useCallback(
    (id: string) => navigate({ to: "/operations/projects/$projectId", params: { projectId: id } }),
    [navigate],
  );

  return (
    <div className="flex flex-col">
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search projects…" />
        <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v as ProjectStatus | "all")}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </FilterSelect>
        <button
          type="button"
          className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Date Range</span>
        </button>
      </FilterBar>

      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <table className="w-full text-sm">
            <thead className="bg-surface/50 border-b border-border">
              <tr className="text-2xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-4 text-left font-medium">Project Name</th>
                <th className="py-2 px-3 text-left font-medium">Customer</th>
                <th className="py-2 px-3 text-left font-medium">Status</th>
                <th className="py-2 px-3 text-right font-medium">Contract Value</th>
                <th className="py-2 px-3 text-left font-medium">Start Date</th>
                <th className="py-2 px-3 text-left font-medium">Target End</th>
                <th className="py-2 px-3 text-left font-medium">PM</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const pmName = p.pm?.full_name ?? "—";
                const pmInitials = pmName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <tr
                    key={p.id}
                    onClick={() => openDetail(p.id)}
                    className="border-b border-border/60 cursor-pointer hover:bg-accent/40 transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <div className="font-semibold leading-snug">{p.name}</div>
                      <div className="text-2xs font-mono text-muted-foreground">{p.code ?? "—"}</div>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{p.company?.name ?? "—"}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-muted-foreground">
                      {p.contract_value != null ? currency(Number(p.contract_value)) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{p.start_date ?? "—"}</td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{p.target_end_date ?? "—"}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Avatar initials={pmInitials} />
                        <span className="text-xs text-muted-foreground">{pmName.split(" ")[0]}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    {projects.length === 0 ? "No projects yet — create the first one." : "No projects match the current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <NewProjectModal
          team={team}
          onClose={() => setNewOpen(false)}
          onSave={async (values) => {
            await insertProject(values);
            qc.invalidateQueries({ queryKey: ["projects"] });
            setNewOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}

// ─── New project modal ────────────────────────────────────────────────────────

function NewProjectModal({
  team,
  onClose,
  onSave,
}: {
  team: TeamMember[];
  onClose: () => void;
  onSave: (values: Parameters<typeof insertProject>[0]) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const { data: companies = [] } = useQuery({ queryKey: ["company-options"], queryFn: fetchCompanyOptions });
  const { data: contacts = [] } = useQuery({ queryKey: ["contact-options"], queryFn: fetchContactOptions });

  const inputCls  = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50";  const labelCls  = "block text-2xs uppercase tracking-wider text-muted-foreground mb-1";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave({
        name:           fd.get("name") as string,
        company_id:     (fd.get("company_id") as string) || null,
        contact_id:     (fd.get("contact_id") as string) || null,
        pm_id:          (fd.get("pm_id") as string) || null,
        site_address:   fd.get("site_address") as string,
        contract_value: fd.get("contract_value") ? parseFloat(fd.get("contract_value") as string) : null,
        budgeted_cost:  fd.get("budgeted_cost") ? parseFloat(fd.get("budgeted_cost") as string) : null,
        budgeted_hours: fd.get("budgeted_hours") ? parseFloat(fd.get("budgeted_hours") as string) : null,
        start_date:     (fd.get("start_date") as string) || null,
        target_end_date:(fd.get("target_end_date") as string) || null,
        status:         (fd.get("status") as ProjectStatus) || "scheduled",
        notes:          fd.get("notes") as string,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="mt-1 space-y-3">
        <div>
          <label className={labelCls}>Project Name *</label>
          <input name="name" required className={inputCls} placeholder="e.g. Ballroom A/V Install" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Company</label>
            <FormSelect name="company_id">
              <option value="">— None —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </FormSelect>
          </div>
          <div>
            <label className={labelCls}>Contact</label>
            <FormSelect name="contact_id">
              <option value="">— None —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </FormSelect>
          </div>
          <div>
            <label className={labelCls}>Project Manager</label>
            <FormSelect name="pm_id">
              <option value="">— Unassigned —</option>
              {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </FormSelect>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <FormSelect name="status" defaultValue="scheduled">
              {STATUS_OPTIONS.filter((o) => o.value !== "all").map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </FormSelect>
          </div>
          <div>
            <label className={labelCls}>Contract Value ($)</label>
            <input name="contract_value" type="number" min="0" step="100" className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Budgeted Cost ($)</label>
            <input name="budgeted_cost" type="number" min="0" step="100" className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Start Date</label>
            <input name="start_date" type="date" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Target End Date</label>
            <input name="target_end_date" type="date" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Site Address</label>
          <input name="site_address" className={inputCls} placeholder="123 Main St, City, ST" />
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea name="notes" rows={2} className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary" placeholder="Any additional context…" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? "Creating…" : "Create Project"}
          </button>
        </div>
      </form>
    </DialogContent>
  );
}
