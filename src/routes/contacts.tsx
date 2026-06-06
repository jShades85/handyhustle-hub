import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { ownerNames } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  Building2, CheckCircle2, CreditCard, Eye, FileText,
  Home, Mail, MapPin, Pencil, Phone,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/contacts")({
  head: () => ({ meta: [{ title: "Contacts · Port City Sound & Security" }] }),
  component: ContactsPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type CustomerType   = "commercial" | "residential";
type ContactType    = "Decision Maker" | "Billing Contact" | "Site Contact" | "Influencer";
type LifecycleStage = "Lead" | "Customer" | "Inactive";
type ContactTag     = "VIP" | "Referral Source" | "Commercial" | "Residential";
type ContactSource  = "Phone" | "Web Form" | "Referral" | "Email" | "Walk-in";
type ActivityKind   = "quote" | "call" | "job" | "invoice";

interface ActivityEntry { kind: ActivityKind; text: string; date: string }
interface LinkedOpp     { id: string; title: string; value: number }
interface LinkedJob     { id: string; title: string; date: string }

interface Contact {
  id: string;
  name: string;
  title: string;
  company?: string;
  phone: string;
  email: string;
  address: string;
  type?: ContactType;
  source: ContactSource;
  assignedTo: string;
  stage: LifecycleStage;
  tags: ContactTag[];
  notes: string;
  openOpps: LinkedOpp[];
  recentJobs: LinkedJob[];
  activity: ActivityEntry[];
  customerType: CustomerType;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const typeMeta: Record<ContactType, string> = {
  "Decision Maker": "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  "Billing Contact": "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "Site Contact":    "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  "Influencer":      "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

const stageMeta: Record<LifecycleStage, { label: string; cls: string }> = {
  Lead:     { label: "Lead",     cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  Customer: { label: "Customer", cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  Inactive: { label: "Inactive", cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400" },
};

const tagCls: Record<ContactTag, string> = {
  "VIP":            "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Referral Source":"bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "Commercial":     "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  "Residential":    "bg-rose-500/15 text-rose-500 dark:text-rose-400",
};

const kindIcon: Record<ActivityKind, React.ComponentType<{ className?: string }>> = {
  quote:   FileText,
  call:    Phone,
  job:     CheckCircle2,
  invoice: CreditCard,
};

const kindColor: Record<ActivityKind, string> = {
  quote:   "text-blue-500",
  call:    "text-green-500",
  job:     "text-primary",
  invoice: "text-emerald-500",
};

const typeOptions: ContactType[]    = ["Decision Maker", "Billing Contact", "Site Contact", "Influencer"];
const sourceOptions: ContactSource[] = ["Phone", "Web Form", "Referral", "Email", "Walk-in"];

// ─── Demo data ────────────────────────────────────────────────────────────────

const CONTACTS: Contact[] = [
  {
    id: "p1", name: "Audrey Chen", title: "Principal Architect",
    company: "Northbeam Architects", phone: "(718) 555-0142",
    email: "audrey@northbeam.co", address: "44 Berry St, Brooklyn, NY 11211",
    type: "Decision Maker", source: "Referral", assignedTo: "MO",
    stage: "Customer", tags: ["VIP", "Commercial"],
    customerType: "commercial",
    notes: "Key contact for all Northbeam AV projects. Prefers email.",
    openOpps: [{ id: "AV-226", title: "Penthouse cinema build", value: 184500 }],
    recentJobs: [{ id: "pr1", title: "Penthouse cinema build", date: "Jul 09" }],
    activity: [
      { kind: "invoice", text: "INV-04809 paid — $92,250",               date: "Jun 10" },
      { kind: "quote",   text: "Quote Q-2026-0415 sent — $184,500",      date: "May 22" },
      { kind: "call",    text: "Call logged — discussed timeline",         date: "May 15" },
      { kind: "job",     text: "Vertex 14F boardroom — project completed", date: "Apr 30" },
    ],
  },
  {
    id: "p2", name: "Marcus Bell", title: "Director of IT",
    company: "Pinecrest Hospitality Group", phone: "(512) 555-0911",
    email: "mbell@pinecrest.com", address: "905 Congress Ave, Austin, TX 78701",
    type: "Decision Maker", source: "Web Form", assignedTo: "JK",
    stage: "Lead", tags: ["Commercial"],
    customerType: "commercial",
    notes: "Evaluating multiple vendors. Budget confirmed at $200k+.",
    openOpps: [{ id: "AV-238", title: "Lobby video wall (7×3 LED)", value: 212000 }],
    recentJobs: [],
    activity: [
      { kind: "call",  text: "Call logged — intro call with Marcus",           date: "Jun 01" },
      { kind: "quote", text: "Quote Q-2026-0417 sent — $212,000",             date: "May 31" },
      { kind: "call",  text: "Call logged — confirmed budget, next steps",     date: "May 20" },
    ],
  },
  {
    id: "p3", name: "Priya Anand", title: "Facilities Manager",
    company: "Helio Health Systems", phone: "(303) 555-2230",
    email: "panand@heliohealth.org", address: "1719 E 19th Ave, Denver, CO 80218",
    type: "Site Contact", source: "Referral", assignedTo: "RT",
    stage: "Customer", tags: ["Commercial"],
    customerType: "commercial",
    notes: "On-site coordinator for all installs. CC on all scheduling.",
    openOpps: [{ id: "AV-235", title: "Surgical center A/V overhaul", value: 148000 }],
    recentJobs: [{ id: "pr2", title: "Surgical center overhaul", date: "Aug 21" }],
    activity: [
      { kind: "quote",   text: "Quote Q-2026-0412 sent — $148,000",         date: "May 18" },
      { kind: "job",     text: "Telehealth cart deployment — completed",      date: "May 10" },
      { kind: "invoice", text: "INV-04806 paid — $74,000",                   date: "Apr 28" },
    ],
  },
  {
    id: "p4", name: "Theodore Fox", title: "Homeowner",
    phone: "(305) 555-1108",
    email: "tfox@quay.dev", address: "1408 Bayshore Dr, Miami, FL 33132",
    source: "Referral", assignedTo: "SN",
    stage: "Customer", tags: ["VIP", "Residential"],
    customerType: "residential",
    notes: "High-value residential client. Very detail-oriented.",
    openOpps: [],
    recentJobs: [{ id: "pr3", title: "Smart home — Fox residence", date: "Jun 19" }],
    activity: [
      { kind: "invoice", text: "INV-04811 paid — $48,200",              date: "Jun 12" },
      { kind: "job",     text: "Smart home commissioning — completed",   date: "Jun 01" },
      { kind: "invoice", text: "INV-04809 paid — $48,200 (deposit)",    date: "May 01" },
    ],
  },
  {
    id: "p5", name: "Lena Romero", title: "Head of Production",
    company: "Arden & Loom Studios", phone: "(323) 555-7741",
    email: "lena@ardenloom.tv", address: "5200 Lankershim Blvd, LA, CA 91601",
    type: "Decision Maker", source: "Phone", assignedTo: "AV",
    stage: "Lead", tags: ["Commercial"],
    customerType: "commercial",
    notes: "Wants full sound stage control room. Budget TBD.",
    openOpps: [{ id: "AV-230", title: "Sound stage 3 — control room", value: 142800 }],
    recentJobs: [{ id: "pr4", title: "Sound stage 3 control room", date: "Oct 02" }],
    activity: [
      { kind: "quote", text: "Quote Q-2026-0410 drafted — $142,800",  date: "Jun 03" },
      { kind: "call",  text: "Call logged — requirements gathering",   date: "May 28" },
      { kind: "call",  text: "Call logged — intro, facility walkthrough", date: "May 10" },
    ],
  },
  {
    id: "p6", name: "Damon Reyes", title: "Superintendent",
    company: "Halcyon Public Schools", phone: "(503) 555-4422",
    email: "dreyes@halcyon.k12.or.us", address: "1010 SE Powell Blvd, Portland, OR 97202",
    type: "Billing Contact", source: "Email", assignedTo: "EM",
    stage: "Customer", tags: ["Commercial"],
    customerType: "commercial",
    notes: "Approves all POs. Prefers invoices via email.",
    openOpps: [{ id: "AV-229", title: "District-wide classroom standardization", value: 521000 }],
    recentJobs: [{ id: "pr6", title: "Auditorium AV — Halcyon HS", date: "Aug 04" }],
    activity: [
      { kind: "invoice", text: "INV-04802 paid — $48,000",                   date: "Jun 05" },
      { kind: "job",     text: "Auditorium AV install — phase 1 complete",    date: "May 30" },
      { kind: "call",    text: "Call logged — PO approval discussion",         date: "May 12" },
    ],
  },
  {
    id: "p7", name: "Iris Wang", title: "VP Operations",
    company: "Vertex Capital Partners", phone: "(312) 555-9090",
    email: "iwang@vertexcap.io", address: "200 W Madison St, Chicago, IL 60606",
    type: "Decision Maker", source: "Referral", assignedTo: "EM",
    stage: "Customer", tags: ["VIP", "Commercial"],
    customerType: "commercial",
    notes: "Key decision maker. High priority account.",
    openOpps: [{ id: "AV-218", title: "Trading floor latency upgrade", value: 234400 }],
    recentJobs: [{ id: "pr5", title: "Vertex 14F boardroom", date: "Jun 12" }],
    activity: [
      { kind: "invoice", text: "INV-04811 partial — $42,250",            date: "Jun 08" },
      { kind: "job",     text: "Vertex 14F boardroom — closeout",         date: "Jun 04" },
      { kind: "quote",   text: "Quote Q-2026-0406 sent — $234,400",       date: "May 25" },
      { kind: "call",    text: "Call logged — trading floor scope review", date: "May 18" },
    ],
  },
  {
    id: "p8", name: "Hugo Albright", title: "General Manager",
    company: "Cinder & Oak Hospitality", phone: "(615) 555-3201",
    email: "hugo@cinderoak.co", address: "112 3rd Ave S, Nashville, TN 37201",
    type: "Decision Maker", source: "Walk-in", assignedTo: "JK",
    stage: "Inactive", tags: ["Commercial"],
    customerType: "commercial",
    notes: "Lost bid in May. Follow up Q4 — new location opening.",
    openOpps: [],
    recentJobs: [],
    activity: [
      { kind: "call",    text: "Call logged — project cancelled, budget cut", date: "May 22" },
      { kind: "quote",   text: "Quote Q-2026-0402 expired — $38,400",         date: "Apr 28" },
      { kind: "call",    text: "Call logged — walked through requirements",    date: "Apr 10" },
    ],
  },
  {
    id: "p9", name: "Noor Saleh", title: "CTO",
    company: "Vertex Capital Partners", phone: "(312) 555-9111",
    email: "nsaleh@vertexcap.io", address: "200 W Madison St, Chicago, IL 60606",
    type: "Site Contact", source: "Referral", assignedTo: "RT",
    stage: "Customer", tags: ["Commercial"],
    customerType: "commercial",
    notes: "Technical point of contact. Coordinates with Iris on approvals.",
    openOpps: [],
    recentJobs: [{ id: "pr5", title: "Vertex 14F boardroom", date: "Jun 12" }],
    activity: [
      { kind: "job",  text: "Vertex 14F — rack & cable sign-off", date: "Jun 04" },
      { kind: "call", text: "Call logged — reviewed low-voltage specs", date: "May 20" },
    ],
  },
  {
    id: "p10", name: "Caleb Ortiz", title: "Project Architect",
    company: "Northbeam Architects", phone: "(718) 555-0188",
    email: "caleb@northbeam.co", address: "44 Berry St, Brooklyn, NY 11211",
    type: "Influencer", source: "Referral", assignedTo: "MO",
    stage: "Lead", tags: ["Referral Source", "Commercial"],
    customerType: "commercial",
    notes: "Referred Audrey Chen. Potential to influence future residential projects.",
    openOpps: [],
    recentJobs: [],
    activity: [
      { kind: "call", text: "Call logged — intro, discussed referral program", date: "Jun 02" },
    ],
  },
  {
    id: "p11", name: "Sandra Mitchell", title: "Homeowner",
    phone: "(614) 555-0374",
    email: "smitchell@gmail.com", address: "219 Birchwood Ln, Columbus, OH 43215",
    source: "Referral", assignedTo: "SN",
    stage: "Customer", tags: ["Residential"],
    customerType: "residential",
    notes: "Referred by Theodore Fox. Interested in full home automation and whole-home audio.",
    openOpps: [{ id: "AV-241", title: "Whole-home audio — Mitchell residence", value: 28400 }],
    recentJobs: [],
    activity: [
      { kind: "quote", text: "Quote Q-2026-0419 sent — $28,400", date: "Jun 04" },
      { kind: "call",  text: "Call logged — walkthrough and scope review",   date: "May 29" },
    ],
  },
  {
    id: "p12", name: "James Whitfield", title: "Homeowner",
    phone: "(919) 555-2287",
    email: "jwhitfield@outlook.com", address: "17 Oak Ridge Ct, Raleigh, NC 27615",
    source: "Web Form", assignedTo: "JK",
    stage: "Lead", tags: ["Residential"],
    customerType: "residential",
    notes: "Looking for home theater and outdoor speaker install. Lot of natural light — projector vs display TBD.",
    openOpps: [{ id: "AV-243", title: "Home theater — Whitfield residence", value: 54000 }],
    recentJobs: [],
    activity: [
      { kind: "call",  text: "Call logged — initial consultation",         date: "Jun 05" },
      { kind: "quote", text: "Quote Q-2026-0421 drafted — $54,000",        date: "Jun 05" },
    ],
  },
  {
    id: "p13", name: "Elena Vasquez", title: "Homeowner",
    phone: "(210) 555-8819",
    email: "evasquez@icloud.com", address: "832 Sycamore Ave, San Antonio, TX 78210",
    source: "Phone", assignedTo: "RT",
    stage: "Customer", tags: ["Residential"],
    customerType: "residential",
    notes: "Completed smart lighting and security camera install last quarter. Wants to add door locks and thermostat control.",
    openOpps: [],
    recentJobs: [{ id: "pr7", title: "Smart lighting & security — Vasquez residence", date: "Apr 18" }],
    activity: [
      { kind: "call",    text: "Call logged — follow-up, add-on scope discussion", date: "Jun 03" },
      { kind: "invoice", text: "INV-04798 paid — $11,650",                          date: "Apr 22" },
      { kind: "job",     text: "Smart lighting & security — project completed",      date: "Apr 18" },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ContactType }) {
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap", typeMeta[type])}>
      {type}
    </span>
  );
}

function StageBadge({ stage }: { stage: LifecycleStage }) {
  const { label, cls } = stageMeta[stage];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function TagPill({ tag }: { tag: ContactTag }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", tagCls[tag])}>
      {tag}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ContactsPage() {
  const { setMeta } = useMeta();
  const [selected, setSelected] = useState<Contact | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContactType | "all">("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerType | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<ContactSource | "all">("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");

  useEffect(() => {
    setMeta({
      title: "Contacts",
      subtitle: `${CONTACTS.length} contacts`,
      onNew: () => setNewOpen(true),
      newLabel: "New Contact",
    });
  }, [setMeta]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CONTACTS.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !(c.company?.toLowerCase().includes(q)) && !c.email.toLowerCase().includes(q)) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (customerTypeFilter !== "all" && c.customerType !== customerTypeFilter) return false;
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (assignedFilter !== "all" && c.assignedTo !== assignedFilter) return false;
      return true;
    });
  }, [search, typeFilter, customerTypeFilter, sourceFilter, assignedFilter]);

  const openDrawer = useCallback((c: Contact) => setSelected(c), []);

  const selectCls = "h-7 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts…"
          className="h-7 min-w-[180px] flex-1 rounded-md border border-border bg-surface px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select value={customerTypeFilter} onChange={(e) => setCustomerTypeFilter(e.target.value as CustomerType | "all")} className={selectCls}>
          <option value="all">All Customers</option>
          <option value="commercial">Commercial</option>
          <option value="residential">Residential</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ContactType | "all")} className={selectCls}>
          <option value="all">All Types</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as ContactSource | "all")} className={selectCls}>
          <option value="all">All Sources</option>
          {sourceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} className={selectCls}>
          <option value="all">All Assigned</option>
          {Object.entries(ownerNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="text-[11px] text-muted-foreground font-mono">
          {filtered.length} of {CONTACTS.length}
        </span>
      </div>

      {/* Table */}
      <div className="p-4 overflow-x-auto">
        <div className="rounded-lg border border-border bg-card overflow-hidden min-w-[900px]">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface/50">
              <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-3 text-left font-medium">Name</th>
                <th className="py-2 px-3 text-left font-medium">Company</th>
                <th className="py-2 px-3 text-left font-medium">Phone</th>
                <th className="py-2 px-3 text-left font-medium">Email</th>
                <th className="py-2 px-3 text-left font-medium">Type</th>
                <th className="py-2 px-3 text-left font-medium">Assigned</th>
                <th className="py-2 px-3 text-left font-medium">Stage</th>
                <th className="py-2 px-3 pr-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="row-hover border-b border-border/60 cursor-pointer"
                  onClick={() => openDrawer(c)}
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={getInitials(c.name)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold leading-snug">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground">{c.title}</div>
                      </div>
                      {c.customerType === "commercial"
                        ? <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                        : <Home className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                      }
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    {c.customerType === "commercial" && c.company
                      ? (
                        <span className="text-foreground/75 hover:text-foreground hover:underline cursor-pointer text-[12px]">
                          {c.company}
                        </span>
                      )
                      : <span className="text-muted-foreground/40 text-[12px]">—</span>
                    }
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px] text-muted-foreground whitespace-nowrap">
                    {c.phone}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground text-[11.5px]">
                    <span className="truncate block max-w-[180px]">{c.email}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    {c.type
                      ? <TypeBadge type={c.type} />
                      : <span className="text-muted-foreground/40 text-[12px]">—</span>
                    }
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <Avatar initials={c.assignedTo} />
                      <span className="text-[11.5px]">{ownerNames[c.assignedTo]?.split(" ")[0]}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <StageBadge stage={c.stage} />
                  </td>
                  <td className="py-2.5 px-3 pr-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDrawer(c); }}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        aria-label="Edit contact"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openDrawer(c); }}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        aria-label="View contact"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[12.5px] text-muted-foreground">
                    No contacts match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        {selected !== null && <ContactDrawer key={selected.id} contact={selected} />}
      </Sheet>

      {/* New contact modal */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <NewContactModal onClose={() => setNewOpen(false)} />
      </Dialog>
    </div>
  );
}

// ─── Contact detail drawer ────────────────────────────────────────────────────

function ContactDrawer({ contact: c }: { contact: Contact }) {
  const isResidential = c.customerType === "residential";

  return (
    <SheetContent className="sm:max-w-[460px] flex flex-col p-0 gap-0">
      <SheetHeader className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar initials={getInitials(c.name)} className="!h-11 !w-11 !text-[15px] !rounded-xl" />
          <div>
            <SheetTitle className="text-[15px] font-semibold leading-tight">{c.name}</SheetTitle>
            {isResidential ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10.5px] font-medium text-rose-600 dark:text-rose-400">
                  <Home className="h-3 w-3" />
                  Residential
                </span>
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">{c.title} · {c.company}</p>
            )}
          </div>
        </div>
        {c.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {c.tags.map((tag) => <TagPill key={tag} tag={tag} />)}
          </div>
        )}
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* Contact info */}
        <section>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Contact Info</p>
          <div className="space-y-2 text-[12.5px]">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono text-[12px]">{c.phone}</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span>{c.email}</span>
            </div>
            {!isResidential && (
              <div className="flex items-start gap-2.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{c.address}</span>
              </div>
            )}
          </div>
        </section>

        {/* Property address — residential only */}
        {isResidential && (
          <section>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Property Address</p>
            <div className="flex items-start gap-2.5 rounded-md border border-border bg-surface/50 px-3 py-2.5 text-[12.5px]">
              <Home className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
              <span className="text-foreground">{c.address}</span>
            </div>
          </section>
        )}

        {/* Details */}
        <section>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Details</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12.5px]">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Assigned To</p>
              <div className="flex items-center gap-1.5">
                <Avatar initials={c.assignedTo} />
                <span>{ownerNames[c.assignedTo]}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Lead Source</p>
              <span>{c.source}</span>
            </div>
            {!isResidential && c.type && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Type</p>
                <TypeBadge type={c.type} />
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Stage</p>
              <StageBadge stage={c.stage} />
            </div>
          </div>
        </section>

        {/* Related company — commercial only */}
        {!isResidential && c.company && (
          <section>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Company</p>
            <div className="flex items-center gap-2 text-[12.5px]">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-primary hover:underline cursor-pointer">{c.company}</span>
            </div>
          </section>
        )}

        {/* Open opportunities */}
        {c.openOpps.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">
              Open Opportunities <span className="ml-1 text-foreground font-mono">{c.openOpps.length}</span>
            </p>
            <div className="space-y-1.5">
              {c.openOpps.map((opp) => (
                <div key={opp.id} className="flex items-center justify-between rounded-md border border-border bg-surface/50 px-3 py-2 text-[12px]">
                  <span className="truncate text-foreground">{opp.title}</span>
                  <span className="ml-2 shrink-0 font-mono text-muted-foreground">
                    ${opp.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent jobs */}
        {c.recentJobs.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">
              Recent Jobs <span className="ml-1 text-foreground font-mono">{c.recentJobs.length}</span>
            </p>
            <div className="space-y-1.5">
              {c.recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-md border border-border bg-surface/50 px-3 py-2 text-[12px]">
                  <span className="truncate text-foreground">{job.title}</span>
                  <span className="ml-2 shrink-0 font-mono text-muted-foreground">{job.date}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Activity timeline */}
        <section>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">Activity</p>
          <ul className="space-y-3">
            {c.activity.map((a, i) => {
              const Icon = kindIcon[a.kind];
              return (
                <li key={i} className="flex gap-3 text-[12px]">
                  <div className={cn("mt-0.5 shrink-0", kindColor[a.kind])}>
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

        {/* Notes */}
        {c.notes && (
          <section>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">{c.notes}</p>
          </section>
        )}
      </div>
    </SheetContent>
  );
}

// ─── New contact modal ────────────────────────────────────────────────────────

function NewContactModal({ onClose }: { onClose: () => void }) {
  const inputCls = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
  const selectCls = "w-full h-8 rounded-md border border-border bg-surface px-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "block text-[10px] uppercase tracking-wider text-muted-foreground mb-1";

  const allTags: ContactTag[] = ["VIP", "Referral Source", "Commercial", "Residential"];
  const [selectedTags, setSelectedTags] = useState<ContactTag[]>([]);
  const [customerModalType, setCustomerModalType] = useState<CustomerType>("commercial");

  const toggleTag = (tag: ContactTag) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>New Contact</DialogTitle>
      </DialogHeader>
      <div className="mt-1 grid grid-cols-2 gap-3">
        {/* Customer type toggle */}
        <div className="col-span-2">
          <label className={labelCls}>Customer Type</label>
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setCustomerModalType("commercial")}
              className={cn(
                "flex-1 h-8 flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors",
                customerModalType === "commercial"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              Commercial
            </button>
            <button
              type="button"
              onClick={() => setCustomerModalType("residential")}
              className={cn(
                "flex-1 h-8 flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors border-l border-border",
                customerModalType === "residential"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <Home className="h-3.5 w-3.5" />
              Residential
            </button>
          </div>
        </div>

        <div>
          <label className={labelCls}>First Name</label>
          <input className={inputCls} placeholder="First name" />
        </div>
        <div>
          <label className={labelCls}>Last Name</label>
          <input className={inputCls} placeholder="Last name" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Job Title</label>
          <input className={inputCls} placeholder={customerModalType === "residential" ? "e.g. Homeowner" : "e.g. Facilities Manager"} />
        </div>

        {/* Company — commercial only */}
        {customerModalType === "commercial" && (
          <div className="col-span-2">
            <label className={labelCls}>Company <span className="text-rose-500">*</span></label>
            <input className={inputCls} placeholder="Company name" required />
          </div>
        )}

        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} placeholder="(555) 000-0000" type="tel" />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} placeholder="email@example.com" type="email" />
        </div>

        {/* Address field — label changes by type */}
        <div className="col-span-2">
          <label className={labelCls}>{customerModalType === "residential" ? "Property Address" : "Address"}</label>
          <input className={inputCls} placeholder="Street, City, State ZIP" />
        </div>

        {/* Contact type — commercial only */}
        {customerModalType === "commercial" && (
          <div>
            <label className={labelCls}>Contact Type</label>
            <select className={selectCls}>
              {typeOptions.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        )}

        <div className={customerModalType === "commercial" ? "" : "col-span-2"}>
          <label className={labelCls}>Lead Source</label>
          <select className={selectCls}>
            {sourceOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Assign To</label>
          <select className={selectCls}>
            {Object.entries(ownerNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                  selectedTags.includes(tag)
                    ? cn(tagCls[tag], "border-transparent")
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea
            rows={3}
            placeholder="Add any notes…"
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="h-8 rounded-md border border-border px-3 text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onClose}
          className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Add Contact
        </button>
      </div>
    </DialogContent>
  );
}
