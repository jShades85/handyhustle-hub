import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { cn } from "@/lib/utils";
import { Clock, MapPin, Phone } from "lucide-react";
import { FilterBar, FilterSelect, PageTabs, PageTab } from "@/components/ui/page-components";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_ORDER,
  priorityMeta,
  statusMeta,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/data/service-tickets";

export const Route = createFileRoute("/service/service-tickets")({
  head: () => ({ meta: [{ title: "Service Tickets · BearingPro" }] }),
  component: ServiceTicketsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbTicket {
  id: string;
  code: string | null;
  company: { id: string; name: string } | null;
  contact: { id: string; full_name: string } | null;
  customer_name: string | null;
  contact_name: string | null;
  phone: string | null;
  site_address: string | null;
  issue: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: { id: string; full_name: string | null } | null;
  on_service_plan: boolean;
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

interface TeamMember { id: string; full_name: string | null }
interface CompanyOption { id: string; name: string }
interface ContactOption { id: string; full_name: string }

// ─── Data helpers ─────────────────────────────────────────────────────────────

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

async function fetchTickets(): Promise<DbTicket[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("service_tickets")
    .select(
      "id,code,customer_name,contact_name,phone,site_address,issue,category,priority,status,on_service_plan,due_date,notes,created_at," +
      "company:companies(id,name)," +
      "contact:contacts(id,full_name)," +
      "assignee:user_profiles!assigned_to(id,full_name)"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DbTicket[];
}

async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id,full_name")
    .eq("is_active", true)
    .order("full_name");
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

async function insertTicket(values: {
  company_id: string | null;
  contact_id: string | null;
  customer_name: string;
  contact_name: string;
  phone: string;
  site_address: string;
  issue: string;
  category: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  on_service_plan: boolean;
}) {
  const supabase = createClient();
  const { data: tenantRow } = await supabase.from("tenants").select("id").single();
  if (!tenantRow) throw new Error("No tenant");
  const { count } = await supabase
    .from("service_tickets")
    .select("*", { count: "exact", head: true });
  const year = new Date().getFullYear();
  const code = `ST-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
  const { error } = await supabase
    .from("service_tickets")
    .insert({ ...values, tenant_id: tenantRow.id, code });
  if (error) throw error;
}

async function patchTicket(id: string, patch: { status?: string; notes?: string }) {
  const supabase = createClient();
  const { error } = await supabase.from("service_tickets").update(patch).eq("id", id);
  if (error) throw error;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
  const { label, cls } = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const { label, cls, dot } = priorityMeta[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11.5px] font-medium", cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ServiceTicketsPage() {
  const { setMeta } = useMeta();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");

  const { data: tickets = [] } = useQuery({ queryKey: ["service-tickets"], queryFn: fetchTickets });
  const { data: team = [] } = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });

  const openCount = useMemo(
    () => tickets.filter((t) => t.status === "open" || t.status === "assigned").length,
    [tickets],
  );

  useEffect(() => {
    setMeta({
      title: "Service Tickets",
      subtitle: openCount > 0 ? `${openCount} open` : undefined,
      newLabel: "New Ticket",
      onNew: () => setNewOpen(true),
    });
  }, [setMeta, openCount]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length };
    STATUS_ORDER.forEach((s) => { c[s] = 0; });
    tickets.forEach((t) => { c[t.status]++; });
    return c;
  }, [tickets]);

  const filtered = useMemo(() => tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (assignedFilter !== "all" && (t.assignee?.id ?? "unassigned") !== assignedFilter) return false;
    return true;
  }), [tickets, statusFilter, priorityFilter, categoryFilter, assignedFilter]);

  const selectedTicket = tickets.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="flex flex-col">
      {/* Status tabs */}
      <PageTabs>
        {(["all", ...STATUS_ORDER] as (TicketStatus | "all")[]).map((s) => (
          <PageTab key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} count={statusCounts[s]}>
            {s === "all" ? "All" : statusMeta[s].label}
          </PageTab>
        ))}
      </PageTabs>

      {/* Filters */}
      <FilterBar>
        <FilterSelect value={priorityFilter} onChange={(v) => setPriorityFilter(v as TicketPriority | "all")}>
          <option value="all">All Priorities</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{priorityMeta[p].label}</option>)}
        </FilterSelect>
        <FilterSelect value={categoryFilter} onChange={(v) => setCategoryFilter(v as TicketCategory | "all")}>
          <option value="all">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
        <FilterSelect value={assignedFilter} onChange={setAssignedFilter}>
          <option value="all">All Techs</option>
          <option value="unassigned">Unassigned</option>
          {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </FilterSelect>
      </FilterBar>

      {/* Table */}
      <div className="p-4">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface/50">
              <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-3 text-left font-medium">Ticket</th>
                <th className="py-2 px-3 text-left font-medium">Customer</th>
                <th className="py-2 px-3 text-left font-medium">Issue</th>
                <th className="py-2 px-3 text-left font-medium">Category</th>
                <th className="py-2 px-3 text-left font-medium">Priority</th>
                <th className="py-2 px-3 text-left font-medium">Status</th>
                <th className="py-2 px-3 text-left font-medium">Assigned</th>
                <th className="py-2 px-3 text-left font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => {
                const customerDisplay = ticket.company?.name ?? ticket.customer_name ?? "—";
                const contactDisplay  = ticket.contact?.full_name ?? ticket.contact_name ?? "—";
                const assigneeName    = ticket.assignee?.full_name ?? null;
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelectedId(ticket.id)}
                    className="row-hover border-b border-border/60 cursor-pointer"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-mono text-[11.5px] text-muted-foreground">{ticket.code ?? "—"}</div>
                      {ticket.on_service_plan && (
                        <span className="inline-block mt-0.5 rounded px-1 py-0.5 text-[9.5px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Service Plan
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold leading-snug">{customerDisplay}</div>
                      <div className="text-[11px] text-muted-foreground">{contactDisplay}</div>
                    </td>
                    <td className="py-2.5 px-3 max-w-65">
                      <span className="line-clamp-2 leading-snug">{ticket.issue}</span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{ticket.category}</td>
                    <td className="py-2.5 px-3">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="py-2.5 px-3">
                      {assigneeName ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar initials={initials(assigneeName)} />
                          <span className="text-[11.5px] text-muted-foreground">
                            {assigneeName.split(" ")[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11.5px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11.5px] text-muted-foreground whitespace-nowrap">
                      {ticket.due_date ?? "—"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[12.5px] text-muted-foreground">
                    {tickets.length === 0
                      ? "No tickets yet — create the first one."
                      : "No tickets match the current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet
        open={selectedTicket !== null}
        onOpenChange={(open) => { if (!open) setSelectedId(null); }}
      >
        {selectedTicket !== null && (
          <TicketDrawer
            key={selectedTicket.id}
            ticket={selectedTicket}
            onStatusChange={(status) => {
              qc.setQueryData<DbTicket[]>(["service-tickets"], (old) =>
                (old ?? []).map((t) => t.id === selectedTicket.id ? { ...t, status } : t)
              );
              patchTicket(selectedTicket.id, { status }).catch(() =>
                qc.invalidateQueries({ queryKey: ["service-tickets"] })
              );
            }}
            onNotesSave={(notes) => {
              qc.setQueryData<DbTicket[]>(["service-tickets"], (old) =>
                (old ?? []).map((t) => t.id === selectedTicket.id ? { ...t, notes } : t)
              );
              patchTicket(selectedTicket.id, { notes }).catch(() =>
                qc.invalidateQueries({ queryKey: ["service-tickets"] })
              );
            }}
          />
        )}
      </Sheet>

      {/* New ticket modal */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <NewTicketModal
          team={team}
          onClose={() => setNewOpen(false)}
          onSave={async (values) => {
            await insertTicket(values);
            qc.invalidateQueries({ queryKey: ["service-tickets"] });
            setNewOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function TicketDrawer({
  ticket,
  onStatusChange,
  onNotesSave,
}: {
  ticket: DbTicket;
  onStatusChange: (status: TicketStatus) => void;
  onNotesSave: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(ticket.notes ?? "");
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    setNotes(ticket.notes ?? "");
  }, [ticket.id]);

  const customerDisplay = ticket.company?.name ?? ticket.customer_name ?? "—";
  const contactDisplay  = ticket.contact?.full_name ?? ticket.contact_name ?? "—";
  const assigneeName    = ticket.assignee?.full_name ?? "Unassigned";

  return (
    <SheetContent className="sm:max-w-115 flex flex-col p-0 gap-0">
      <SheetHeader className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[11px] text-muted-foreground">{ticket.code ?? "—"}</span>
          {ticket.on_service_plan && (
            <span className="rounded px-1.5 py-0.5 text-[9.5px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Service Plan
            </span>
          )}
        </div>
        <SheetTitle className="text-[14.5px] font-semibold leading-snug">{ticket.issue}</SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Status / Priority / Category */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-3.5 text-[12.5px]">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Status</p>
            <StatusBadge status={ticket.status} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Priority</p>
            <PriorityBadge priority={ticket.priority} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Category</p>
            <span className="text-[12px]">{ticket.category}</span>
          </div>
        </div>

        {/* Dates / Assigned */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-3.5 text-[12.5px]">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Created</p>
            <span className="font-mono text-[12px]">{ticket.created_at.slice(0, 10)}</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Due</p>
            <span className="font-mono text-[12px]">{ticket.due_date ?? "—"}</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Assigned</p>
            <div className="flex items-center gap-1.5">
              <Avatar initials={initials(ticket.assignee?.full_name)} />
              <span className="text-[12px]">{assigneeName.split(" ")[0]}</span>
            </div>
          </div>
        </div>

        {/* Customer / Contact / Site */}
        <div className="space-y-3 text-[12.5px]">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Customer</p>
            <span className="font-medium">{customerDisplay}</span>
            {contactDisplay !== "—" && (
              <span className="text-muted-foreground"> · {contactDisplay}</span>
            )}
          </div>
          {ticket.phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {ticket.phone}
            </div>
          )}
          {ticket.site_address && (
            <div className="flex items-start gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {ticket.site_address}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onNotesSave(notes)}
            placeholder="Add notes…"
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Activity stub */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Activity</p>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0 opacity-50" />
            <span>Activity log coming soon.</span>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-border px-5 py-4 flex flex-col gap-2">
        <button
          onClick={() => onStatusChange("resolved")}
          disabled={ticket.status === "resolved" || ticket.status === "closed"}
          className="w-full h-8 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-default transition-opacity"
        >
          Mark Resolved
        </button>
        <button
          onClick={() => onStatusChange("closed")}
          disabled={ticket.status === "closed"}
          className="w-full h-8 rounded-md border border-border text-muted-foreground text-[12.5px] font-medium hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-default transition-colors"
        >
          Close Ticket
        </button>
      </div>
    </SheetContent>
  );
}

// ─── New ticket modal ─────────────────────────────────────────────────────────

function NewTicketModal({
  team,
  onClose,
  onSave,
}: {
  team: TeamMember[];
  onClose: () => void;
  onSave: (values: Parameters<typeof insertTicket>[0]) => Promise<void>;
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
        company_id:      (fd.get("company_id") as string) || null,
        contact_id:      (fd.get("contact_id") as string) || null,
        customer_name:   fd.get("customer_name") as string,
        contact_name:    fd.get("contact_name") as string,
        phone:           fd.get("phone") as string,
        site_address:    fd.get("site_address") as string,
        issue:           fd.get("issue") as string,
        category:        fd.get("category") as string,
        priority:        fd.get("priority") as string,
        assigned_to:     (fd.get("assigned_to") as string) || null,
        due_date:        (fd.get("due_date") as string) || null,
        on_service_plan: fd.get("on_service_plan") === "on",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>New Service Ticket</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="mt-1 grid grid-cols-2 gap-3">
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
          <label className={labelCls}>Customer Name</label>
          <input name="customer_name" className={inputCls} placeholder="If not in list above" />
        </div>
        <div>
          <label className={labelCls}>Contact Name</label>
          <input name="contact_name" className={inputCls} placeholder="If not in list above" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input name="phone" type="tel" className={inputCls} placeholder="(555) 000-0000" />
        </div>
        <div>
          <label className={labelCls}>Due Date</label>
          <input name="due_date" type="date" className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Site Address</label>
          <input name="site_address" className={inputCls} placeholder="Street, City, State" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Issue Description *</label>
          <textarea
            name="issue"
            required
            rows={2}
            placeholder="Brief description of the problem…"
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select name="category" className={selectCls}>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select name="priority" className={selectCls} defaultValue="medium">
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{priorityMeta[p].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Assign To</label>
          <select name="assigned_to" className={selectCls}>
            <option value="">— Unassigned —</option>
            {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-4">
          <input id="on_service_plan" name="on_service_plan" type="checkbox" className="h-3.5 w-3.5 rounded border-border" />
          <label htmlFor="on_service_plan" className="text-[12px] text-muted-foreground cursor-pointer select-none">
            On Service Plan
          </label>
        </div>
        <div className="col-span-2 flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-border px-3 text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Creating…" : "Create Ticket"}
          </button>
        </div>
      </form>
    </DialogContent>
  );
}
