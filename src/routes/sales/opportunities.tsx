import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Avatar, PriorityDot } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { currency } from "@/lib/demo-data";
const fmtValue = (v: number | null) => (v ? currency(v) : "—");
import type { Priority } from "@/lib/demo-data";
import {
  ChevronDown, ChevronUp, ChevronsUpDown, FileText,
  KanbanSquare, List, MapPin, MessageSquare, Phone, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterBar, SearchInput, FilterSelect } from "@/components/ui/page-components";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/sales/opportunities")({
  head: () => ({ meta: [{ title: "Opportunities · BearingPro" }] }),
  component: Opportunities,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type OpportunityStage =
  | "site-visit" | "estimating" | "proposal-sent"
  | "negotiation" | "closed-won" | "closed-lost";

type OppSource = "Referral" | "Repeat Client" | "Cold Outreach" | "Bid/RFP" | "Phone" | "Web Form" | "Email" | "Walk-in";
type ActivityKind = "call" | "quote" | "site-visit" | "proposal" | "note";
type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "expired";

interface LinkedQuote { number: string; value: number; status: QuoteStatus }
interface ActivityEntry { kind: ActivityKind; text: string; date: string }

interface DbOpportunity {
  id: string;
  title: string;
  value: number | null;
  stage: OpportunityStage;
  close_date: string | null;
  source: OppSource | null;
  priority: Priority;
  notes: string | null;
  company: { id: string; name: string } | null;
  contact: { id: string; full_name: string } | null;
  assignee: { id: string; full_name: string | null } | null;
}

interface Opportunity {
  id: string;
  title: string;
  company: string;
  companyId: string | null;
  contact: string;
  contactId: string | null;
  value: number | null;
  stage: OpportunityStage;
  closeDate: string;
  rep: string;
  repId: string;
  repInitials: string;
  source: OppSource;
  priority: Priority;
  notes: string;
  linkedQuote?: LinkedQuote;
  activityFeed: ActivityEntry[];
}

interface TeamMember { id: string; full_name: string | null }
interface CompanyOption { id: string; name: string }
interface ContactOption { id: string; full_name: string }

// ─── Config ──────────────────────────────────────────────────────────────────

const stageOrder: OpportunityStage[] = [
  "site-visit", "estimating", "proposal-sent",
  "negotiation", "closed-won", "closed-lost",
];

const stageMeta: Record<OpportunityStage, { label: string; badge: string; dim?: true }> = {
  "site-visit":    { label: "Site Visit",    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  "estimating":    { label: "Estimating",    badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  "proposal-sent": { label: "Proposal Sent", badge: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
  "negotiation":   { label: "Negotiation",   badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  "closed-won":    { label: "Closed Won",    badge: "bg-green-500/15 text-green-600 dark:text-green-400",  dim: true },
  "closed-lost":   { label: "Closed Lost",   badge: "bg-red-500/15 text-red-500 dark:text-red-400",        dim: true },
};

const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, med: 2, low: 3 };

const priorityBadgeCls: Record<Priority, string> = {
  urgent: "bg-red-500/15 text-red-600 dark:text-red-400",
  high:   "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  med:    "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  low:    "bg-slate-500/15 text-slate-500 dark:text-slate-400",
};

const priorityLabel: Record<Priority, string> = {
  urgent: "Urgent", high: "High", med: "Medium", low: "Low",
};

const quoteStatusMeta: Record<QuoteStatus, { label: string; cls: string }> = {
  draft:    { label: "Draft",    cls: "bg-slate-500/15 text-slate-500" },
  sent:     { label: "Sent",     cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  viewed:   { label: "Viewed",   cls: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
  accepted: { label: "Accepted", cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  expired:  { label: "Expired",  cls: "bg-red-500/15 text-red-500 dark:text-red-400" },
};

const activityIcon: Record<ActivityKind, React.ComponentType<{ className?: string }>> = {
  call: Phone, quote: FileText, "site-visit": MapPin, proposal: Send, note: MessageSquare,
};

const activityColor: Record<ActivityKind, string> = {
  call: "text-green-500", quote: "text-blue-500",
  "site-visit": "text-teal-500", proposal: "text-amber-500", note: "text-violet-500",
};

const sourceOptions: OppSource[] = ["Referral", "Repeat Client", "Cold Outreach", "Bid/RFP", "Phone", "Web Form", "Email", "Walk-in"];

// ─── Data ─────────────────────────────────────────────────────────────────────

function toUiOpp(d: DbOpportunity): Opportunity {
  const repName = d.assignee?.full_name ?? "—";
  return {
    id:           d.id,
    title:        d.title,
    company:      d.company?.name ?? "—",
    companyId:    d.company?.id ?? null,
    contact:      d.contact?.full_name ?? "—",
    contactId:    d.contact?.id ?? null,
    value:        d.value ?? null,
    stage:        d.stage,
    closeDate:    d.close_date ?? "—",
    rep:          repName,
    repId:        d.assignee?.id ?? "",
    repInitials:  repName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
    source:       d.source ?? "Referral",
    priority:     d.priority ?? "med",
    notes:        d.notes ?? "",
    activityFeed: [],
  };
}

async function convertToProject(opp: Opportunity): Promise<void> {
  const supabase = createClient();
  const { data: tenantRow } = await supabase.from("tenants").select("id").single();
  if (!tenantRow) throw new Error("No tenant");
  const { count } = await supabase.from("projects").select("*", { count: "exact", head: true });
  const code = `AV-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, "0")}`;
  const { error } = await supabase.from("projects").insert({
    tenant_id:      tenantRow.id,
    code,
    name:           opp.title,
    company_id:     opp.companyId,
    contact_id:     opp.contactId,
    opportunity_id: opp.id,
    contract_value: opp.value || null,
    pm_id:          opp.repId || null,
    status:         "scheduled",
  });
  if (error) throw error;
}

async function convertToWorkOrder(opp: Opportunity): Promise<void> {
  const supabase = createClient();
  const { data: tenantRow } = await supabase.from("tenants").select("id").single();
  if (!tenantRow) throw new Error("No tenant");
  const { count } = await supabase.from("work_orders").select("*", { count: "exact", head: true });
  const code = `WO-${String((count ?? 0) + 1).padStart(4, "0")}`;
  const { error } = await supabase.from("work_orders").insert({
    tenant_id:      tenantRow.id,
    code,
    name:           opp.title,
    company_id:     opp.companyId,
    contact_id:     opp.contactId,
    opportunity_id: opp.id,
    contract_value: opp.value || null,
    assigned_to:    opp.repId || null,
    status:         "scheduled",
  });
  if (error) throw error;
}

async function fetchOpportunities(): Promise<DbOpportunity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*, company:companies(id,name), contact:contacts(id,full_name), assignee:user_profiles!assigned_to(id,full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbOpportunity[];
}

async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_profiles").select("id,full_name").eq("is_active", true).order("full_name");
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

async function updateStage(id: string, stage: OpportunityStage) {
  const supabase = createClient();
  const { error } = await supabase.from("opportunities").update({ stage }).eq("id", id);
  if (error) throw error;
}

async function updateNotes(id: string, notes: string) {
  const supabase = createClient();
  const { error } = await supabase.from("opportunities").update({ notes }).eq("id", id);
  if (error) throw error;
}

async function insertOpportunity(values: {
  title: string; company_id: string | null; contact_id: string | null;
  assigned_to: string | null; value: number | null; stage: OpportunityStage;
  close_date: string | null; source: OppSource | null; priority: Priority; notes: string;
}) {
  const supabase = createClient();
  const { data: tenantRow } = await supabase.from("tenants").select("id").single();
  if (!tenantRow) throw new Error("No tenant");
  const { error } = await supabase.from("opportunities").insert({ ...values, tenant_id: tenantRow.id });
  if (error) throw error;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: OpportunityStage }) {
  const { label, badge } = stageMeta[stage];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium", badge)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function Opportunities() {
  const { setMeta } = useMeta();
  const { can } = usePermissions();
  const canWrite = can("sales", "write");
  const qc = useQueryClient();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const { data: dbOpps = [] } = useQuery({ queryKey: ["opportunities"], queryFn: fetchOpportunities });
  const { data: team = [] } = useQuery({ queryKey: ["team-members"], queryFn: fetchTeamMembers });

  const opps = useMemo(() => dbOpps.map(toUiOpp), [dbOpps]);

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: OpportunityStage }) => updateStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunities"] }),
  });

  useEffect(() => {
    const pipeline = opps.filter((o) => o.stage !== "closed-lost").reduce((s, o) => s + (o.value ?? 0), 0);
    setMeta({
      title: "Opportunities",
      subtitle: opps.length ? `${opps.length} opportunities · ${currency(pipeline)} pipeline` : "Opportunities",
      onNew: () => setNewOpen(true),
      newLabel: "New Opportunity",
    });
  }, [setMeta, opps]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return opps.filter((o) => {
      if (q && !o.title.toLowerCase().includes(q) && !o.company.toLowerCase().includes(q) && !o.contact.toLowerCase().includes(q)) return false;
      if (priorityFilter !== "all" && o.priority !== priorityFilter) return false;
      if (assignedFilter !== "all" && o.repId !== assignedFilter) return false;
      return true;
    });
  }, [opps, search, priorityFilter, assignedFilter]);

  const moveStage = (id: string, stage: OpportunityStage) => stageMutation.mutate({ id, stage });

  return (
    <div className="flex h-full flex-col">
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search opportunities…" />
        <FilterSelect value={priorityFilter} onChange={(v) => setPriorityFilter(v as Priority | "all")}>
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="med">Medium</option>
          <option value="low">Low</option>
        </FilterSelect>
        <FilterSelect value={assignedFilter} onChange={(v) => setAssignedFilter(v)}>
          <option value="all">All Assigned</option>
          {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </FilterSelect>
        <span className="text-[11px] text-muted-foreground font-mono">
          {filtered.length} of {opps.length}
        </span>
        <div className="ml-auto flex items-center rounded-md border border-border overflow-hidden">
          <button
            type="button" onClick={() => setView("kanban")}
            className={cn("flex h-7 w-7 items-center justify-center transition-colors", view === "kanban" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground")}
            aria-label="Kanban view"
          >
            <KanbanSquare className="h-3.5 w-3.5" />
          </button>
          <button
            type="button" onClick={() => setView("list")}
            className={cn("flex h-7 w-7 items-center justify-center border-l border-border transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground")}
            aria-label="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </FilterBar>

      {view === "kanban"
        ? <KanbanView opps={filtered} onMove={moveStage} onSelect={setSelected} canWrite={canWrite} />
        : <ListView opps={filtered} onSelect={setSelected} />}

      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        {selected !== null && (
          <OpportunityDrawer
            key={selected.id}
            opp={selected}
            canWrite={canWrite}
            onNotesChange={(notes) => {
              updateNotes(selected.id, notes);
              qc.invalidateQueries({ queryKey: ["opportunities"] });
            }}
            onConvert={async (type) => {
              if (type === "project") await convertToProject(selected);
              else await convertToWorkOrder(selected);
              qc.invalidateQueries({ queryKey: ["projects"] });
              qc.invalidateQueries({ queryKey: ["work-orders"] });
              setSelected(null);
            }}
          />
        )}
      </Sheet>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <NewOpportunityModal
          team={team}
          onClose={() => setNewOpen(false)}
          onSave={async (values) => {
            await insertOpportunity(values);
            qc.invalidateQueries({ queryKey: ["opportunities"] });
            setNewOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}

// ─── Kanban view ──────────────────────────────────────────────────────────────

function KanbanView({
  opps, onMove, onSelect, canWrite,
}: {
  opps: Opportunity[];
  onMove: (id: string, stage: OpportunityStage) => void;
  onSelect: (opp: Opportunity) => void;
  canWrite: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", paddingRight: "24px" }}>
      <div className="relative flex h-full flex-row gap-3 p-4" style={{ minWidth: "max-content" }}>
        {openId !== null && <div className="fixed inset-0 z-10" onClick={() => setOpenId(null)} />}
        {stageOrder.map((stage) => {
          const items = opps.filter((o) => o.stage === stage);
          const total = items.reduce((s, o) => s + (o.value ?? 0), 0);
          const { dim } = stageMeta[stage];
          return (
            <div
              key={stage}
              className={cn(
                "flex h-full w-[272px] min-w-[260px] shrink-0 flex-col rounded-lg border border-border",
                dim ? "bg-muted/30 opacity-80" : "bg-surface/40",
              )}
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <StageBadge stage={stage} />
                  <span className="font-mono text-[10.5px] text-muted-foreground">{items.length}</span>
                </div>
                <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{total ? currency(total) : "—"}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 p-2">
                {items.map((opp) => (
                  <KanbanCard
                    key={opp.id}
                    opp={opp}
                    selectorOpen={openId === opp.id}
                    onOpenSelector={(e) => { e.stopPropagation(); setOpenId(opp.id); }}
                    onMove={(s) => { onMove(opp.id, s); setOpenId(null); }}
                    onSelect={() => onSelect(opp)}
                    canWrite={canWrite}
                  />
                ))}
                {items.length === 0 && (
                  <div className="py-5 text-center text-[11px] text-muted-foreground">Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({
  opp, selectorOpen, onOpenSelector, onMove, onSelect, canWrite,
}: {
  opp: Opportunity;
  selectorOpen: boolean;
  onOpenSelector: (e: React.MouseEvent) => void;
  onMove: (stage: OpportunityStage) => void;
  onSelect: () => void;
  canWrite: boolean;
}) {
  return (
    <div
      className="rounded-md border border-border bg-card p-3 hover:border-primary/30 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="relative inline-block">
        {canWrite ? (
          <button
            onClick={onOpenSelector}
            className={cn("rounded px-1.5 py-0.5 text-[10.5px] font-medium flex items-center gap-1 hover:opacity-80 transition-opacity", stageMeta[opp.stage].badge)}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {stageMeta[opp.stage].label}
            <ChevronsUpDown className="h-2.5 w-2.5 opacity-60" />
          </button>
        ) : (
          <StageBadge stage={opp.stage} />
        )}
        {canWrite && selectorOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-md border border-border bg-popover py-1 shadow-lg">
            {stageOrder.map((s) => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); onMove(s); }}
                className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] hover:bg-accent", s === opp.stage && "bg-accent/60")}
              >
                <StageBadge stage={s} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-1.5 text-[12.5px] font-semibold leading-snug truncate">{opp.title}</div>
      <div className="text-[11px] text-muted-foreground truncate">{opp.company} · {opp.contact}</div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="font-mono tabular-nums text-[12.5px] font-semibold">{fmtValue(opp.value)}</span>
        <PriorityDot p={opp.priority} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span>{opp.closeDate}</span>
        <div className="flex items-center gap-1.5">
          <Avatar initials={opp.repInitials} />
          <span>{opp.rep.split(" ")[0]}</span>
        </div>
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

type SortCol = "title" | "company" | "contact" | "value" | "stage" | "closeDate" | "rep" | "source" | "priority";
type SortDir = "asc" | "desc";

function ListView({ opps, onSelect }: { opps: Opportunity[]; onSelect: (opp: Opportunity) => void }) {
  const [sortCol, setSortCol] = useState<SortCol>("closeDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo(() => {
    return [...opps].sort((a, b) => {
      let av: number, bv: number;
      if (sortCol === "value") { av = a.value ?? 0; bv = b.value ?? 0; }
      else if (sortCol === "stage") { av = stageOrder.indexOf(a.stage); bv = stageOrder.indexOf(b.stage); }
      else if (sortCol === "priority") { av = priorityOrder[a.priority]; bv = priorityOrder[b.priority]; }
      else {
        const as = String(a[sortCol]).toLowerCase();
        const bs = String(b[sortCol]).toLowerCase();
        return (as < bs ? -1 : as > bs ? 1 : 0) * (sortDir === "asc" ? 1 : -1);
      }
      return (av - bv) * (sortDir === "asc" ? 1 : -1);
    });
  }, [opps, sortCol, sortDir]);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortCol }) =>
    sortCol !== col ? <ChevronsUpDown className="inline h-3 w-3 ml-0.5 text-muted-foreground/40" />
    : sortDir === "asc" ? <ChevronUp className="inline h-3 w-3 ml-0.5" />
    : <ChevronDown className="inline h-3 w-3 ml-0.5" />;

  return (
    <div className="p-4">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface/50">
            <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-muted-foreground">
              {(
                [
                  ["title",     "Opportunity", "text-left"],
                  ["company",   "Company",     "text-left"],
                  ["value",     "Value",       "text-right"],
                  ["stage",     "Stage",       "text-left"],
                  ["closeDate", "Close Date",  "text-left"],
                  ["rep",       "Assigned",    "text-left"],
                  ["priority",  "Priority",    "text-left pr-3"],
                ] as [SortCol, string, string][]
              ).map(([col, label, align]) => (
                <th
                  key={col} onClick={() => toggleSort(col)}
                  className={cn("py-2 px-2 font-medium cursor-pointer select-none hover:text-foreground whitespace-nowrap", align)}
                >
                  {label}<SortIcon col={col} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} onClick={() => onSelect(o)} className="row-hover border-b border-border/60 cursor-pointer">
                <td className="py-2.5 px-2">
                  <div className="font-medium leading-snug">{o.title}</div>
                  <div className="text-[11px] text-muted-foreground">{o.contact}</div>
                </td>
                <td className="py-2.5 px-2 text-muted-foreground text-[12px]">{o.company}</td>
                <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold">{fmtValue(o.value)}</td>
                <td className="py-2.5 px-2"><StageBadge stage={o.stage} /></td>
                <td className="py-2.5 px-2 text-muted-foreground font-mono text-[11.5px]">{o.closeDate}</td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <Avatar initials={o.repInitials} />
                    <span className="text-[11.5px]">{o.rep}</span>
                  </div>
                </td>
                <td className="py-2.5 px-2 pr-3"><PriorityDot p={o.priority} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[12.5px] text-muted-foreground">
                  {rows.length === 0 ? "No opportunities yet — create the first one." : "No opportunities match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Opportunity detail drawer ────────────────────────────────────────────────

function OpportunityDrawer({
  opp,
  onNotesChange,
  onConvert,
  canWrite,
}: {
  opp: Opportunity;
  onNotesChange: (notes: string) => void;
  onConvert: (type: "project" | "work-order") => Promise<void>;
  canWrite: boolean;
}) {
  const [notes, setNotes] = useState(opp.notes);
  const [converting, setConverting] = useState(false);
  const [convertPicking, setConvertPicking] = useState(false);

  return (
    <SheetContent className="sm:max-w-[460px] flex flex-col p-0 gap-0">
      <SheetHeader className="border-b border-border px-5 py-4">
        <SheetTitle className="text-[15px] font-semibold leading-tight">{opp.title}</SheetTitle>
        <p className="text-[12px] text-muted-foreground">{opp.company} · {opp.contact}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <StageBadge stage={opp.stage} />
          <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium", priorityBadgeCls[opp.priority])}>
            {priorityLabel[opp.priority]}
          </span>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        <section>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Details</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12.5px]">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Value</p>
              <p className="font-semibold font-mono tabular-nums">{fmtValue(opp.value)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Close Date</p>
              <p className="font-mono">{opp.closeDate}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Assigned To</p>
              <div className="flex items-center gap-1.5">
                <Avatar initials={opp.repInitials} />
                <span>{opp.rep}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Lead Source</p>
              <p>{opp.source}</p>
            </div>
          </div>
        </section>

        <section>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Linked Quote</p>
          {opp.linkedQuote ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-surface/50 px-3 py-2.5 text-[12px]">
              <span className="font-mono text-foreground">{opp.linkedQuote.number}</span>
              <div className="flex items-center gap-2.5 shrink-0 ml-2">
                <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium", quoteStatusMeta[opp.linkedQuote.status].cls)}>
                  {quoteStatusMeta[opp.linkedQuote.status].label}
                </span>
                <span className="font-mono text-muted-foreground">{currency(opp.linkedQuote.value)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2.5 text-[12px]">
              <span className="text-muted-foreground">No quote linked yet</span>
              <button className="text-primary text-[11.5px] font-medium hover:underline">Create Quote</button>
            </div>
          )}
        </section>

        <section>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
          <textarea
            rows={3}
            value={notes}
            readOnly={!canWrite}
            onChange={canWrite ? (e) => setNotes(e.target.value) : undefined}
            onBlur={canWrite ? () => onNotesChange(notes) : undefined}
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] text-foreground leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary read-only:cursor-default read-only:opacity-70"
            placeholder="Add notes…"
          />
        </section>

        {opp.activityFeed.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Activity</p>
            <ul className="space-y-3">
              {opp.activityFeed.map((a, i) => {
                const Icon = activityIcon[a.kind];
                return (
                  <li key={i} className="flex gap-3 text-[12px]">
                    <div className={cn("mt-0.5 shrink-0", activityColor[a.kind])}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div>{a.text}</div>
                      <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{a.date}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <div className="border-t border-border px-5 py-4 space-y-2">
        {canWrite && opp.stage === "closed-won" && !convertPicking && (
          <button
            onClick={() => setConvertPicking(true)}
            className="w-full h-8 rounded-md bg-primary text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Convert to Project / Work Order
          </button>
        )}
        {canWrite && opp.stage === "closed-won" && convertPicking && (
          <div className="rounded-md border border-border bg-surface/50 p-3 space-y-2">
            <p className="text-[11px] text-muted-foreground text-center">What type of record is this?</p>
            <div className="flex gap-2">
              <button
                disabled={converting}
                onClick={async () => {
                  setConverting(true);
                  try { await onConvert("project"); } finally { setConverting(false); }
                }}
                className="flex-1 h-8 rounded-md bg-primary text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Project
              </button>
              <button
                disabled={converting}
                onClick={async () => {
                  setConverting(true);
                  try { await onConvert("work-order"); } finally { setConverting(false); }
                }}
                className="flex-1 h-8 rounded-md border border-border text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
              >
                Work Order
              </button>
            </div>
            <button
              onClick={() => setConvertPicking(false)}
              className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
        {canWrite && (
          <button className="w-full h-8 rounded-md border border-border text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            Edit Opportunity
          </button>
        )}
      </div>
    </SheetContent>
  );
}

// ─── New opportunity modal ────────────────────────────────────────────────────

function NewOpportunityModal({
  team,
  onClose,
  onSave,
}: {
  team: TeamMember[];
  onClose: () => void;
  onSave: (values: Parameters<typeof insertOpportunity>[0]) => Promise<void>;
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
        title:       fd.get("title") as string,
        company_id:  (fd.get("company_id") as string) || null,
        contact_id:  (fd.get("contact_id") as string) || null,
        assigned_to: (fd.get("assigned_to") as string) || null,
        value:       fd.get("value") ? parseFloat(fd.get("value") as string) : null,
        stage:       fd.get("stage") as OpportunityStage,
        close_date:  (fd.get("close_date") as string) || null,
        source:      (fd.get("source") as OppSource) || null,
        priority:    fd.get("priority") as Priority,
        notes:       fd.get("notes") as string,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>New Opportunity</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="mt-1 space-y-3">
        <div>
          <label className={labelCls}>Title *</label>
          <input name="title" required className={inputCls} placeholder="e.g. Conference room AV" />
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
            <label className={labelCls}>Value ($)</label>
            <input name="value" type="number" min="0" step="100" className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Close Date</label>
            <input name="close_date" type="date" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Stage</label>
            <select name="stage" className={selectCls} defaultValue="site-visit">
              {stageOrder.map((s) => <option key={s} value={s}>{stageMeta[s].label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Priority</label>
            <select name="priority" className={selectCls} defaultValue="med">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="med">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Source</label>
            <select name="source" className={selectCls}>
              <option value="">— None —</option>
              {sourceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Assigned To</label>
            <select name="assigned_to" className={selectCls}>
              <option value="">— Unassigned —</option>
              {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            name="notes"
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Any additional context…"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-border px-3 text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? "Saving…" : "Create Opportunity"}
          </button>
        </div>
      </form>
    </DialogContent>
  );
}
