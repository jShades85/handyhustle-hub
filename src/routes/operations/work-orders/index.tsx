import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { FilterBar, SearchInput, FilterSelect } from "@/components/ui/page-components";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { statusMeta, type ProjectStatus } from "@/data/projects";

export const Route = createFileRoute("/operations/work-orders/")({
  head: () => ({ meta: [{ title: "Work Orders · BearingPro" }] }),
  component: WorkOrdersListPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type WOStatus = "scheduled" | "in-progress" | "on-hold" | "completed" | "cancelled";

interface DbWorkOrder {
  id: string;
  code: string | null;
  name: string;
  status: WOStatus;
  contract_value: number | null;
  scheduled_date: string | null;
  company: { id: string; name: string } | null;
  assignee: { id: string; full_name: string | null } | null;
}

interface TeamMember { id: string; full_name: string | null }
interface CompanyOption { id: string; name: string }
interface ContactOption { id: string; full_name: string }

const WO_STATUS_OPTIONS: Array<{ value: WOStatus | "all"; label: string }> = [
  { value: "all",         label: "All" },
  { value: "scheduled",   label: "Scheduled" },
  { value: "in-progress", label: "In Progress" },
  { value: "on-hold",     label: "On Hold" },
  { value: "completed",   label: "Completed" },
  { value: "cancelled",   label: "Cancelled" },
];

// ─── Data ─────────────────────────────────────────────────────────────────────

async function fetchWorkOrders(): Promise<DbWorkOrder[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("id,code,name,status,contract_value,scheduled_date,company:companies(id,name),assignee:user_profiles!assigned_to(id,full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbWorkOrder[];
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

async function insertWorkOrder(values: {
  name: string; company_id: string | null; contact_id: string | null;
  assigned_to: string | null; site_address: string; contract_value: number | null;
  budgeted_cost: number | null; budgeted_hours: number | null;
  scheduled_date: string | null; status: WOStatus; notes: string;
}) {
  const supabase = createClient();
  const { data: tenantRow } = await supabase.from("tenants").select("id").single();
  if (!tenantRow) throw new Error("No tenant");
  const { count } = await supabase.from("work_orders").select("*", { count: "exact", head: true });
  const code = `WO-${String((count ?? 0) + 1).padStart(4, "0")}`;
  const { error } = await supabase.from("work_orders").insert({ ...values, tenant_id: tenantRow.id, code });
  if (error) throw error;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WOStatus }) {
  const { label, cls } = statusMeta[status as ProjectStatus];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function WorkOrdersListPage() {
  const { setMeta } = useMeta();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WOStatus | "all">("all");

  const { data: workOrders = [] } = useQuery({ queryKey: ["work-orders"], queryFn: fetchWorkOrders });
  const { data: team = [] } = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });

  useEffect(() => {
    setMeta({
      title: "Work Orders",
      subtitle: "Operations",
      newLabel: "New Work Order",
      onNew: () => setNewOpen(true),
    });
  }, [setMeta]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return workOrders.filter((wo) => {
      if (statusFilter !== "all" && wo.status !== statusFilter) return false;
      if (q && !wo.name.toLowerCase().includes(q) && !(wo.company?.name ?? "").toLowerCase().includes(q) && !(wo.code ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [workOrders, search, statusFilter]);

  const openDetail = useCallback(
    (id: string) => navigate({ to: "/operations/work-orders/$workOrderId", params: { workOrderId: id } }),
    [navigate],
  );

  return (
    <div className="flex flex-col">
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search work orders…" />
        <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v as WOStatus | "all")}>
          {WO_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </FilterSelect>
      </FilterBar>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface/50 border-b border-border">
              <tr className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-4 text-left font-medium">Work Order</th>
                <th className="py-2 px-3 text-left font-medium">Customer</th>
                <th className="py-2 px-3 text-left font-medium">Status</th>
                <th className="py-2 px-3 text-right font-medium">Contract Value</th>
                <th className="py-2 px-3 text-left font-medium">Scheduled Date</th>
                <th className="py-2 px-3 text-left font-medium">Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wo) => {
                const techName = wo.assignee?.full_name ?? "—";
                const techInitials = techName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <tr
                    key={wo.id}
                    onClick={() => openDetail(wo.id)}
                    className="border-b border-border/60 cursor-pointer hover:bg-accent/40 transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <div className="font-semibold leading-snug">{wo.name}</div>
                      <div className="text-[10.5px] font-mono text-muted-foreground">{wo.code ?? "—"}</div>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{wo.company?.name ?? "—"}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={wo.status} /></td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-muted-foreground">
                      {wo.contract_value != null ? currency(Number(wo.contract_value)) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{wo.scheduled_date ?? "—"}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Avatar initials={techInitials} />
                        <span className="text-[11.5px] text-muted-foreground">{techName.split(" ")[0]}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[12.5px] text-muted-foreground">
                    {workOrders.length === 0 ? "No work orders yet — create the first one." : "No work orders match the current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <NewWorkOrderModal
          team={team}
          onClose={() => setNewOpen(false)}
          onSave={async (values) => {
            await insertWorkOrder(values);
            qc.invalidateQueries({ queryKey: ["work-orders"] });
            setNewOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}

// ─── New work order modal ─────────────────────────────────────────────────────

function NewWorkOrderModal({
  team,
  onClose,
  onSave,
}: {
  team: TeamMember[];
  onClose: () => void;
  onSave: (values: Parameters<typeof insertWorkOrder>[0]) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const { data: companies = [] } = useQuery({ queryKey: ["company-options"], queryFn: fetchCompanyOptions });
  const { data: contacts = [] } = useQuery({ queryKey: ["contact-options"], queryFn: fetchContactOptions });

  const inputCls  = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
  const selectCls = "w-full h-8 rounded-md border border-border bg-surface px-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls  = "block text-[10px] uppercase tracking-wider text-muted-foreground mb-1";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave({
        name:           fd.get("name") as string,
        company_id:     (fd.get("company_id") as string) || null,
        contact_id:     (fd.get("contact_id") as string) || null,
        assigned_to:    (fd.get("assigned_to") as string) || null,
        site_address:   fd.get("site_address") as string,
        contract_value: fd.get("contract_value") ? parseFloat(fd.get("contract_value") as string) : null,
        budgeted_cost:  fd.get("budgeted_cost") ? parseFloat(fd.get("budgeted_cost") as string) : null,
        budgeted_hours: fd.get("budgeted_hours") ? parseFloat(fd.get("budgeted_hours") as string) : null,
        scheduled_date: (fd.get("scheduled_date") as string) || null,
        status:         (fd.get("status") as WOStatus) || "scheduled",
        notes:          fd.get("notes") as string,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>New Work Order</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="mt-1 space-y-3">
        <div>
          <label className={labelCls}>Work Order Name *</label>
          <input name="name" required className={inputCls} placeholder="e.g. AV System Service Call" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Company</label>
            <select name="company_id" className={selectCls}>
              <option value="">— None —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Contact</label>
            <select name="contact_id" className={selectCls}>
              <option value="">— None —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Assigned Technician</label>
            <select name="assigned_to" className={selectCls}>
              <option value="">— Unassigned —</option>
              {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select name="status" className={selectCls} defaultValue="scheduled">
              {WO_STATUS_OPTIONS.filter((o) => o.value !== "all").map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Contract Value ($)</label>
            <input name="contract_value" type="number" min="0" step="100" className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Budgeted Hours</label>
            <input name="budgeted_hours" type="number" min="0" step="0.5" className={inputCls} placeholder="0" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Scheduled Date</label>
            <input name="scheduled_date" type="date" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Site Address</label>
          <input name="site_address" className={inputCls} placeholder="123 Main St, City, ST" />
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea name="notes" rows={2} className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Any additional context…" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-border px-3 text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? "Creating…" : "Create Work Order"}
          </button>
        </div>
      </form>
    </DialogContent>
  );
}
