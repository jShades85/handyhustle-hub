import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { SC } from "@/lib/status-colors";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Avatar } from "@/components/ui-bits";
import { PageTabs, PageTab, FilterBar, FilterSelect } from "@/components/ui/page-components";
import { FormSelect } from "@/components/ui/form-select";
import { useMeta } from "@/contexts/PageMetaContext";
import { cn } from "@/lib/utils";
import { Mail, MapPin, Phone } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DrawerHeader } from "@/components/ui/drawer-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/crm/lead-inbox")({
  head: () => ({ meta: [{ title: "Lead Inbox · BearingPro" }] }),
  component: LeadInbox,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "dismissed";
type LeadSource = "Phone" | "Web Form" | "Referral" | "Email" | "Walk-in";

interface DbLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  source: LeadSource | null;
  service_interest: string | null;
  location: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  converted_at: string | null;
  converted_contact_id: string | null;
  converted_opportunity_id: string | null;
  assignee: { id: string; full_name: string | null } | null;
}

interface TeamMember { id: string; full_name: string | null }
interface ContactMatch { id: string; full_name: string; email: string | null }

// ─── Config ──────────────────────────────────────────────────────────────────

const statusMeta: Record<LeadStatus, { label: string; cls: string }> = {
  new:       { label: "New",       cls: SC.blue },
  contacted: { label: "Contacted", cls: SC.yellow },
  qualified: { label: "Qualified", cls: SC.green },
  converted: { label: "Converted", cls: SC.teal },
  dismissed: { label: "Dismissed", cls: SC.neutral },
};

const sourceCls: Record<LeadSource, string> = {
  "Phone":    SC.violet,
  "Web Form": SC.blue,
  "Referral": SC.emerald,
  "Email":    SC.orange,
  "Walk-in":  SC.teal,
};

const statusOrder: LeadStatus[] = ["new", "contacted", "qualified", "converted", "dismissed"];
const sourceOptions: LeadSource[] = ["Phone", "Web Form", "Referral", "Email", "Walk-in"];

// ─── Data ─────────────────────────────────────────────────────────────────────

function fullName(lead: DbLead) {
  return [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—";
}

async function fetchLeads(): Promise<DbLead[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*, assignee:user_profiles!assigned_to(id,full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbLead[];
}

async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_profiles").select("id,full_name").eq("is_active", true).order("full_name");
  if (error) throw error;
  return data ?? [];
}

async function updateLeadStatus(id: string, status: LeadStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) throw error;
}

async function updateLeadNotes(id: string, notes: string) {
  const supabase = createClient();
  const { error } = await supabase.from("leads").update({ notes }).eq("id", id);
  if (error) throw error;
}

async function insertLead(values: {
  first_name: string; last_name: string; company_name: string;
  phone: string; email: string; source: LeadSource;
  service_interest: string; location: string; assigned_to: string | null;
}) {
  const supabase = createClient();
  const { data: tenantRow } = await supabase.from("tenants").select("id").single();
  if (!tenantRow) throw new Error("No tenant");
  const { error } = await supabase.from("leads").insert({ ...values, tenant_id: tenantRow.id });
  if (error) throw error;
}

async function searchContacts(query: string): Promise<ContactMatch[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id,full_name,email")
    .ilike("full_name", `%${query}%`)
    .order("full_name")
    .limit(5);
  if (error) throw error;
  return (data ?? []) as ContactMatch[];
}

async function convertLead(lead: DbLead, existingContactId?: string): Promise<void> {
  const supabase = createClient();
  const { data: tenantRow } = await supabase.from("tenants").select("id").single();
  if (!tenantRow) throw new Error("No tenant");
  const tid = tenantRow.id;

  let contactId: string;

  if (existingContactId) {
    contactId = existingContactId;
  } else {
    const { data: contact, error: ce } = await supabase
      .from("contacts")
      .insert({
        tenant_id:     tid,
        full_name:     fullName(lead),
        phone:         lead.phone,
        email:         lead.email,
        address:       lead.location,
        source:        lead.source,
        stage:         "Lead",
        customer_type: "commercial",
        tags:          [],
        assigned_to:   lead.assignee?.id ?? null,
      })
      .select("id")
      .single();
    if (ce || !contact) throw ce ?? new Error("Contact insert failed");
    contactId = contact.id;
  }

  const { data: opp, error: oe } = await supabase
    .from("opportunities")
    .insert({
      tenant_id:   tid,
      title:       lead.service_interest ?? `Opportunity — ${fullName(lead)}`,
      contact_id:  contactId,
      assigned_to: lead.assignee?.id ?? null,
      source:      lead.source,
      stage:       "site-visit",
      priority:    "med",
    })
    .select("id")
    .single();
  if (oe || !opp) throw oe ?? new Error("Opportunity insert failed");

  const { error: le } = await supabase
    .from("leads")
    .update({
      status:                   "converted",
      converted_at:             new Date().toISOString(),
      converted_contact_id:     contactId,
      converted_opportunity_id: opp.id,
    })
    .eq("id", lead.id);
  if (le) throw le;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeadStatus }) {
  const { label, cls } = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function SourceBadge({ source }: { source: LeadSource }) {
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium", sourceCls[source])}>
      {source}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function LeadInbox() {
  const { setMeta } = useMeta();
  const qc = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<DbLead | null>(null);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [convertModalLead, setConvertModalLead] = useState<DbLead | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");

  const { can } = usePermissions();
  const canWrite = can("crm", "write");
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const { data: team = [] } = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) => updateLeadStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const convertMutation = useMutation({
    mutationFn: ({ lead, existingContactId }: { lead: DbLead; existingContactId?: string }) =>
      convertLead(lead, existingContactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setSelectedLead(null);
      setConvertModalLead(null);
      toast.success("Lead converted to contact");
    },
  });

  const unreviewedCount = useMemo(
    () => leads.filter((l) => l.status === "new" || l.status === "contacted").length,
    [leads],
  );

  useEffect(() => {
    setMeta({
      title: "Lead Inbox",
      subtitle: `${unreviewedCount} unreviewed lead${unreviewedCount !== 1 ? "s" : ""}`,
      onNew: () => setNewLeadOpen(true),
      newLabel: "New Lead",
    });
  }, [setMeta, unreviewedCount]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length, new: 0, contacted: 0, qualified: 0, converted: 0, dismissed: 0 };
    leads.forEach((l) => { c[l.status]++; });
    return c;
  }, [leads]);

  const filteredLeads = useMemo(() => leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
    if (assignedFilter !== "all" && l.assignee?.id !== assignedFilter) return false;
    return true;
  }), [leads, statusFilter, sourceFilter, assignedFilter]);

  // Keep drawer in sync after mutations
  useEffect(() => {
    if (!selectedLead) return;
    const updated = leads.find((l) => l.id === selectedLead.id);
    if (updated) setSelectedLead(updated);
  }, [leads]);

  return (
    <div className="flex flex-col">
      <PageTabs>
        {(["all", ...statusOrder] as (LeadStatus | "all")[]).map((s) => (
          <PageTab key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} count={statusCounts[s]}>
            {s === "all" ? "All" : statusMeta[s].label}
          </PageTab>
        ))}
      </PageTabs>

      <FilterBar>
        <FilterSelect value={sourceFilter} onChange={(v) => setSourceFilter(v as LeadSource | "all")}>
          <option value="all">All Sources</option>
          {sourceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </FilterSelect>
        <FilterSelect value={assignedFilter} onChange={(v) => setAssignedFilter(v)}>
          <option value="all">All Assigned</option>
          {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </FilterSelect>
      </FilterBar>

      <div className="p-4">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface/50">
              <tr className="border-b border-border text-2xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-3 text-left font-medium">Name / Company</th>
                <th className="py-2 px-3 text-left font-medium">Source</th>
                <th className="py-2 px-3 text-left font-medium">Service</th>
                <th className="py-2 px-3 text-left font-medium">Location</th>
                <th className="py-2 px-3 text-left font-medium">Received</th>
                <th className="py-2 px-3 text-left font-medium">Assigned</th>
                <th className="py-2 px-3 text-left font-medium">Status</th>
                <th className="py-2 px-3 pr-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="row-hover border-b border-border/60 cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="py-2.5 px-3">
                    <div className="font-semibold leading-snug">{fullName(lead)}</div>
                    <div className="text-xs text-muted-foreground">{lead.company_name ?? "—"}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    {lead.source ? <SourceBadge source={lead.source} /> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground max-w-[180px]">
                    <span className="truncate block">{lead.service_interest ?? "—"}</span>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{lead.location ?? "—"}</td>
                  <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {lead.created_at.slice(0, 10)}
                  </td>
                  <td className="py-2.5 px-3">
                    {lead.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar initials={(lead.assignee.full_name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()} />
                        <span className="text-xs">{lead.assignee.full_name?.split(" ")[0]}</span>
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="py-2.5 px-3"><StatusBadge status={lead.status} /></td>
                  <td className="py-2.5 px-3 pr-3 text-right">
                    {canWrite && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConvertModalLead(lead);
                          }}
                          disabled={lead.status === "converted" || lead.status === "dismissed" || convertMutation.isPending}
                          className="h-6 rounded px-2 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-35 disabled:cursor-default transition-opacity"
                        >
                          Convert
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            statusMutation.mutate({ id: lead.id, status: "dismissed" });
                          }}
                          disabled={lead.status === "dismissed" || lead.status === "converted"}
                          className="h-6 rounded px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-35 disabled:cursor-default transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    {leads.length === 0 ? "No leads yet — create the first one." : "No leads match the current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={selectedLead !== null} onOpenChange={(open) => { if (!open) setSelectedLead(null); }}>
        {selectedLead !== null && (
          <LeadDrawer
            key={selectedLead.id}
            lead={selectedLead}
            canWrite={canWrite}
            converting={convertMutation.isPending}
            onStatusChange={(status) => statusMutation.mutate({ id: selectedLead.id, status })}
            onNotesChange={(notes) => updateLeadNotes(selectedLead.id, notes)}
            onConvert={() => setConvertModalLead(selectedLead)}
          />
        )}
      </Sheet>

      <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
        <NewLeadModal
          team={team}
          onClose={() => setNewLeadOpen(false)}
          onSave={async (values) => {
            await insertLead(values);
            qc.invalidateQueries({ queryKey: ["leads"] });
            setNewLeadOpen(false);
          }}
        />
      </Dialog>

      <Dialog open={convertModalLead !== null} onOpenChange={(open) => { if (!open) setConvertModalLead(null); }}>
        {convertModalLead !== null && (
          <ConvertModal
            key={convertModalLead.id}
            lead={convertModalLead}
            converting={convertMutation.isPending}
            onClose={() => setConvertModalLead(null)}
            onConvert={(existingContactId) =>
              convertMutation.mutate({ lead: convertModalLead, existingContactId })
            }
          />
        )}
      </Dialog>
    </div>
  );
}

// ─── Lead detail drawer ───────────────────────────────────────────────────────

function LeadDrawer({
  lead, canWrite, converting, onStatusChange, onNotesChange, onConvert,
}: {
  lead: DbLead;
  canWrite: boolean;
  converting: boolean;
  onStatusChange: (status: LeadStatus) => void;
  onNotesChange: (notes: string) => void;
  onConvert: () => void;
}) {
  const [notes, setNotes] = useState(lead.notes ?? "");
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setNotes(lead.notes ?? "");
  }, [lead.notes]);

  const repInitials = lead.assignee?.full_name
    ? lead.assignee.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <SheetContent hideClose className="sm:max-w-[440px] flex flex-col p-0 gap-0">
      <DrawerHeader title={fullName(lead)} subtitle={lead.company_name ?? "—"} />

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm">
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Source</p>
            {lead.source ? <SourceBadge source={lead.source} /> : <span>—</span>}
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Status</p>
            <StatusBadge status={lead.status} />
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Date Received</p>
            <span className="font-mono text-sm">{lead.created_at.slice(0, 10)}</span>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Assigned To</p>
            {lead.assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar initials={repInitials} />
                <span>{lead.assignee.full_name}</span>
              </div>
            ) : <span className="text-muted-foreground">—</span>}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Service Interested In</p>
            <span>{lead.service_interest ?? "—"}</span>
          </div>
          {lead.location && (
            <div>
              <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Location</p>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />{lead.location}
              </span>
            </div>
          )}
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Contact</p>
            <div className="flex flex-col gap-1 text-muted-foreground">
              {lead.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" />{lead.phone}</span>}
              {lead.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0" />{lead.email}</span>}
            </div>
          </div>
        </div>

        <div>
          <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => canWrite && setNotes(e.target.value)}
            onBlur={() => canWrite && onNotesChange(notes)}
            readOnly={!canWrite}
            placeholder={canWrite ? "Add notes…" : ""}
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary read-only:cursor-default read-only:opacity-70"
          />
        </div>

        {lead.status === "converted" && lead.converted_at && (
          <div className="rounded-md bg-teal-500/10 border border-teal-500/20 px-3 py-2.5 text-sm text-teal-600 dark:text-teal-400">
            Converted on {lead.converted_at.slice(0, 10)} — contact and opportunity created.
          </div>
        )}
      </div>

      {canWrite && (
        <div className="border-t border-border px-5 py-4 flex flex-col gap-2">
          {lead.status !== "converted" && lead.status !== "dismissed" && (
            <button
              onClick={() => onStatusChange(lead.status === "new" ? "contacted" : "qualified")}
              className="w-full h-8 rounded-md bg-accent text-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Mark as {lead.status === "new" ? "Contacted" : "Qualified"}
            </button>
          )}
          <button
            onClick={onConvert}
            disabled={lead.status === "converted" || lead.status === "dismissed" || converting}
            className="w-full h-8 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-default transition-opacity"
          >
            {converting ? "Converting…" : "Convert to Contact + Opportunity"}
          </button>
          <button
            onClick={() => onStatusChange("dismissed")}
            disabled={lead.status === "dismissed" || lead.status === "converted"}
            className="w-full h-8 rounded-md border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            Dismiss Lead
          </button>
        </div>
      )}
    </SheetContent>
  );
}

// ─── Convert modal ────────────────────────────────────────────────────────────

function ConvertModal({
  lead,
  converting,
  onClose,
  onConvert,
}: {
  lead: DbLead;
  converting: boolean;
  onClose: () => void;
  onConvert: (existingContactId?: string) => void;
}) {
  const [search, setSearch] = useState(fullName(lead));
  const [selected, setSelected] = useState<string | "new">("new");

  const { data: matches = [], isFetching } = useQuery({
    queryKey: ["contact-search", search],
    queryFn: () => searchContacts(search),
    enabled: search.trim().length > 1,
  });

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Convert Lead</DialogTitle>
      </DialogHeader>
      <div className="mt-1 space-y-4 text-sm">
        <p className="text-muted-foreground">
          Link <span className="font-medium text-foreground">{fullName(lead)}</span> to an existing contact, or create a new one.
        </p>

        <div>
          <label className="block text-2xs uppercase tracking-wider text-muted-foreground mb-1.5">Search contacts</label>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected("new"); }}
            className="w-full h-8 rounded-md border border-border bg-surface px-2.5 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
            placeholder="Search by name…"
          />
        </div>

        <div className="space-y-1.5">
          {isFetching && (
            <p className="text-sm text-muted-foreground px-1">Searching…</p>
          )}
          {matches.map((c) => (
            <label
              key={c.id}
              className={cn(
                "flex items-start gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors",
                selected === c.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50",
              )}
            >
              <input
                type="radio"
                name="contact"
                value={c.id}
                checked={selected === c.id}
                onChange={() => setSelected(c.id)}
                className="mt-0.5 accent-primary"
              />
              <div>
                <p className="font-medium leading-snug">{c.full_name}</p>
                {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
              </div>
            </label>
          ))}
          {!isFetching && search.trim().length > 1 && matches.length === 0 && (
            <p className="text-sm text-muted-foreground px-1">No existing contacts match "{search}".</p>
          )}
          <label
            className={cn(
              "flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors",
              selected === "new" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50",
            )}
          >
            <input
              type="radio"
              name="contact"
              value="new"
              checked={selected === "new"}
              onChange={() => setSelected("new")}
              className="accent-primary"
            />
            <span>Create new contact for <span className="font-medium">{fullName(lead)}</span></span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={converting}
            onClick={() => onConvert(selected === "new" ? undefined : selected)}
            className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {converting ? "Converting…" : "Convert"}
          </button>
        </div>
      </div>
    </DialogContent>
  );
}

// ─── New lead modal ───────────────────────────────────────────────────────────

function NewLeadModal({
  team,
  onClose,
  onSave,
}: {
  team: TeamMember[];
  onClose: () => void;
  onSave: (values: Parameters<typeof insertLead>[0]) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const inputCls  = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50";  const labelCls  = "block text-2xs uppercase tracking-wider text-muted-foreground mb-1";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave({
        first_name:       fd.get("first_name") as string,
        last_name:        fd.get("last_name") as string,
        company_name:     fd.get("company_name") as string,
        phone:            fd.get("phone") as string,
        email:            fd.get("email") as string,
        source:           fd.get("source") as LeadSource,
        service_interest: fd.get("service_interest") as string,
        location:         fd.get("location") as string,
        assigned_to:      (fd.get("assigned_to") as string) || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>New Lead</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="mt-1 grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>First Name</label>
          <input name="first_name" className={inputCls} placeholder="Jane" />
        </div>
        <div>
          <label className={labelCls}>Last Name</label>
          <input name="last_name" className={inputCls} placeholder="Smith" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Company</label>
          <input name="company_name" className={inputCls} placeholder="Company name" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input name="phone" className={inputCls} placeholder="(555) 000-0000" type="tel" />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input name="email" className={inputCls} placeholder="email@example.com" type="email" />
        </div>
        <div>
          <label className={labelCls}>Source</label>
          <FormSelect name="source" defaultValue="Phone">
            {sourceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
        </div>
        <div>
          <label className={labelCls}>Assign To</label>
          <FormSelect name="assigned_to">
            <option value="">— Unassigned —</option>
            {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </FormSelect>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Service Interested In</label>
          <input name="service_interest" className={inputCls} placeholder="e.g. Security system install" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Location</label>
          <input name="location" className={inputCls} placeholder="City, State" />
        </div>
        <div className="col-span-2 flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? "Adding…" : "Add Lead"}
          </button>
        </div>
      </form>
    </DialogContent>
  );
}
