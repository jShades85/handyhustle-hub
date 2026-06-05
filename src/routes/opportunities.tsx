import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Avatar, PriorityDot } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import type { Priority } from "@/lib/demo-data";
import { LayoutGrid, List, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/opportunities")({
  head: () => ({ meta: [{ title: "Opportunities · Port City Sound & Security" }] }),
  component: Opportunities,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type OpportunityStage =
  | "lead" | "site-visit" | "estimating" | "proposal-sent"
  | "negotiation" | "closed-won" | "closed-lost";

type Source = "Referral" | "Repeat Client" | "Cold Outreach" | "Bid/RFP";

type Opportunity = {
  id: number;
  company: string;
  contact: string;
  value: number;
  stage: OpportunityStage;
  closeDate: string;
  rep: string;
  repInitials: string;
  source: Source;
  priority: Priority;
};

// ─── Config ──────────────────────────────────────────────────────────────────

const stageOrder: OpportunityStage[] = [
  "lead", "site-visit", "estimating", "proposal-sent",
  "negotiation", "closed-won", "closed-lost",
];

const stageMeta: Record<OpportunityStage, { label: string; badge: string; dim?: true }> = {
  "lead":          { label: "Lead",          badge: "bg-gray-500/15 text-gray-500 dark:text-gray-400" },
  "site-visit":    { label: "Site Visit",    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  "estimating":    { label: "Estimating",    badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  "proposal-sent": { label: "Proposal Sent", badge: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
  "negotiation":   { label: "Negotiation",   badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  "closed-won":    { label: "Closed Won",    badge: "bg-green-500/15 text-green-600 dark:text-green-400",  dim: true },
  "closed-lost":   { label: "Closed Lost",   badge: "bg-red-500/15 text-red-500 dark:text-red-400",        dim: true },
};

const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, med: 2, low: 3 };

// ─── Placeholder data ─────────────────────────────────────────────────────────

const INITIAL: Opportunity[] = [
  { id:  1, company: "Harborview Hotel",         contact: "Marcus Bell",    value: 76400,  stage: "site-visit",    closeDate: "2026-07-15", rep: "Damon Reyes", repInitials: "DR", source: "Repeat Client", priority: "high" },
  { id:  2, company: "Riverside Medical Center", contact: "Dr. Lena Park",  value: 84200,  stage: "proposal-sent", closeDate: "2026-06-28", rep: "Audrey Chen", repInitials: "AC", source: "Bid/RFP",       priority: "high" },
  { id:  3, company: "Downtown Office Retrofit", contact: "Eli Voss",       value: 52000,  stage: "negotiation",   closeDate: "2026-06-20", rep: "Damon Reyes", repInitials: "DR", source: "Repeat Client", priority: "med"  },
  { id:  4, company: "Northbeam Architects",     contact: "Iris Wang",      value: 38500,  stage: "estimating",    closeDate: "2026-07-30", rep: "Marcus Bell", repInitials: "MB", source: "Referral",      priority: "med"  },
  { id:  5, company: "Summit Medical Group",     contact: "Dr. A. Okonkwo", value: 145000, stage: "lead",          closeDate: "2026-09-01", rep: "Damon Reyes", repInitials: "DR", source: "Referral",      priority: "high" },
  { id:  6, company: "Greenfield Manufacturing", contact: "Tom Birch",      value: 12000,  stage: "lead",          closeDate: "2026-08-10", rep: "Iris Wang",   repInitials: "IW", source: "Cold Outreach", priority: "low"  },
  { id:  7, company: "Lakeside Comfort Systems", contact: "Carla Ruiz",     value: 18500,  stage: "site-visit",    closeDate: "2026-07-18", rep: "Audrey Chen", repInitials: "AC", source: "Referral",      priority: "med"  },
  { id:  8, company: "River North Plumbing",     contact: "James Pruitt",   value: 9800,   stage: "estimating",    closeDate: "2026-07-05", rep: "Iris Wang",   repInitials: "IW", source: "Bid/RFP",       priority: "low"  },
  { id:  9, company: "Coastal Electric Co",      contact: "Nina Torres",    value: 34000,  stage: "proposal-sent", closeDate: "2026-07-01", rep: "Marcus Bell", repInitials: "MB", source: "Cold Outreach", priority: "med"  },
  { id: 10, company: "Harbor View Apartments",   contact: "Greg Moss",      value: 67500,  stage: "closed-won",    closeDate: "2026-06-05", rep: "Audrey Chen", repInitials: "AC", source: "Repeat Client", priority: "med"  },
  { id: 11, company: "Tri-County School Dist.",  contact: "Supt. D. Hale",  value: 180000, stage: "closed-lost",   closeDate: "2026-05-30", rep: "Damon Reyes", repInitials: "DR", source: "Bid/RFP",       priority: "high" },
  { id: 12, company: "Midwest Plumbing Supply",  contact: "Phil Garza",     value: 4200,   stage: "negotiation",   closeDate: "2026-06-18", rep: "Iris Wang",   repInitials: "IW", source: "Referral",      priority: "low"  },
];

// ─── Stage badge ─────────────────────────────────────────────────────────────

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
  const [opps, setOpps] = useState<Opportunity[]>(INITIAL);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  useEffect(() => {
    const total = INITIAL.reduce((s, o) => s + o.value, 0);
    setMeta({
      title: "Opportunities",
      subtitle: `${INITIAL.length} opportunities · ${currency(total)} pipeline`,
      onNew: () => console.log("New opportunity"),
      newLabel: "New Opportunity",
    });
  }, [setMeta]);

  const moveStage = (id: number, stage: OpportunityStage) =>
    setOpps((prev) => prev.map((o) => (o.id === id ? { ...o, stage } : o)));

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-border px-4 py-2">
        <button
          onClick={() => setView("kanban")}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] transition-colors",
            view === "kanban" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Kanban
        </button>
        <button
          onClick={() => setView("list")}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] transition-colors",
            view === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <List className="h-3.5 w-3.5" /> List
        </button>
      </div>

      {view === "kanban"
        ? <KanbanView opps={opps} onMove={moveStage} />
        : <ListView opps={opps} />}
    </div>
  );
}

// ─── Kanban view ──────────────────────────────────────────────────────────────

function KanbanView({
  opps,
  onMove,
}: {
  opps: Opportunity[];
  onMove: (id: number, stage: OpportunityStage) => void;
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto w-full">
      <div className="relative flex gap-3 p-4" style={{ minWidth: "max-content" }}>
        {openId !== null && (
          <div className="fixed inset-0 z-10" onClick={() => setOpenId(null)} />
        )}
        {stageOrder.map((stage) => {
          const items = opps.filter((o) => o.stage === stage);
          const total = items.reduce((s, o) => s + o.value, 0);
          const { dim } = stageMeta[stage];
          return (
            <div
              key={stage}
              className={cn(
                "flex w-[272px] min-w-[260px] shrink-0 flex-col rounded-lg border border-border",
                dim ? "bg-muted/30 opacity-80" : "bg-surface/40",
              )}
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <StageBadge stage={stage} />
                  <span className="font-mono text-[10.5px] text-muted-foreground">{items.length}</span>
                </div>
                <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{currency(total)}</span>
              </div>
              <div className="max-h-[calc(100vh-220px)] overflow-y-auto space-y-2 p-2">
                {items.map((opp) => (
                  <KanbanCard
                    key={opp.id}
                    opp={opp}
                    selectorOpen={openId === opp.id}
                    onOpenSelector={(e) => { e.stopPropagation(); setOpenId(opp.id); }}
                    onMove={(stage) => { onMove(opp.id, stage); setOpenId(null); }}
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
  opp,
  selectorOpen,
  onOpenSelector,
  onMove,
}: {
  opp: Opportunity;
  selectorOpen: boolean;
  onOpenSelector: (e: React.MouseEvent) => void;
  onMove: (stage: OpportunityStage) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3 hover:border-primary/30 transition-colors">
      <div className="relative inline-block">
        <button
          onClick={onOpenSelector}
          className={cn("rounded px-1.5 py-0.5 text-[10.5px] font-medium flex items-center gap-1", stageMeta[opp.stage].badge)}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {stageMeta[opp.stage].label}
        </button>
        {selectorOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-md border border-border bg-popover py-1 shadow-lg">
            {stageOrder.map((s) => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); onMove(s); }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] hover:bg-accent",
                  s === opp.stage && "bg-accent/60",
                )}
              >
                <StageBadge stage={s} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-1.5 text-[12.5px] font-semibold leading-snug truncate">{opp.company}</div>
      <div className="text-[11px] text-muted-foreground">{opp.contact}</div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="font-mono tabular-nums text-[12.5px] font-semibold">{currency(opp.value)}</span>
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

type SortCol = "company" | "contact" | "value" | "stage" | "closeDate" | "rep" | "source" | "priority";
type SortDir = "asc" | "desc";

function ListView({ opps }: { opps: Opportunity[] }) {
  const [stageFilter, setStageFilter] = useState<OpportunityStage | "all">("all");
  const [repFilter,   setRepFilter]   = useState<string>("all");
  const [sortCol,     setSortCol]     = useState<SortCol>("closeDate");
  const [sortDir,     setSortDir]     = useState<SortDir>("asc");

  const reps = useMemo(() => Array.from(new Set(opps.map((o) => o.rep))).sort(), [opps]);

  const rows = useMemo(() => {
    let r = opps;
    if (stageFilter !== "all") r = r.filter((o) => o.stage === stageFilter);
    if (repFilter   !== "all") r = r.filter((o) => o.rep   === repFilter);

    return [...r].sort((a, b) => {
      let av: number, bv: number;
      if (sortCol === "value") {
        av = a.value; bv = b.value;
      } else if (sortCol === "stage") {
        av = stageOrder.indexOf(a.stage); bv = stageOrder.indexOf(b.stage);
      } else if (sortCol === "priority") {
        av = priorityOrder[a.priority]; bv = priorityOrder[b.priority];
      } else {
        const as = String(a[sortCol]).toLowerCase();
        const bs = String(b[sortCol]).toLowerCase();
        return (as < bs ? -1 : as > bs ? 1 : 0) * (sortDir === "asc" ? 1 : -1);
      }
      return (av - bv) * (sortDir === "asc" ? 1 : -1);
    });
  }, [opps, stageFilter, repFilter, sortCol, sortDir]);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortCol }) =>
    sortCol !== col ? (
      <ChevronsUpDown className="inline h-3 w-3 ml-0.5 text-muted-foreground/40" />
    ) : sortDir === "asc" ? (
      <ChevronUp className="inline h-3 w-3 ml-0.5" />
    ) : (
      <ChevronDown className="inline h-3 w-3 ml-0.5" />
    );

  const selectCls = "h-7 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as OpportunityStage | "all")} className={selectCls}>
          <option value="all">All stages</option>
          {stageOrder.map((s) => <option key={s} value={s}>{stageMeta[s].label}</option>)}
        </select>
        <select value={repFilter} onChange={(e) => setRepFilter(e.target.value)} className={selectCls}>
          <option value="all">All reps</option>
          {reps.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="ml-auto self-center font-mono text-[11px] text-muted-foreground">{rows.length} result{rows.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface/50">
            <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-muted-foreground">
              {(
                [
                  ["company",   "Company",    "text-left"],
                  ["contact",   "Contact",    "text-left"],
                  ["value",     "Value",      "text-right"],
                  ["stage",     "Stage",      "text-left"],
                  ["closeDate", "Close Date", "text-left"],
                  ["rep",       "Rep",        "text-left"],
                  ["source",    "Source",     "text-left"],
                  ["priority",  "Priority",   "text-left pr-3"],
                ] as [SortCol, string, string][]
              ).map(([col, label, align]) => (
                <th
                  key={col}
                  onClick={() => toggleSort(col)}
                  className={cn("py-2 px-2 font-medium cursor-pointer select-none hover:text-foreground whitespace-nowrap", align)}
                >
                  {label}<SortIcon col={col} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="row-hover border-b border-border/60">
                <td className="py-2.5 px-2 font-medium">{o.company}</td>
                <td className="py-2.5 px-2 text-muted-foreground">{o.contact}</td>
                <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold">{currency(o.value)}</td>
                <td className="py-2.5 px-2"><StageBadge stage={o.stage} /></td>
                <td className="py-2.5 px-2 text-muted-foreground font-mono text-[11.5px]">{o.closeDate}</td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <Avatar initials={o.repInitials} />
                    <span className="text-[11.5px]">{o.rep}</span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-muted-foreground text-[11.5px]">{o.source}</td>
                <td className="py-2.5 px-2 pr-3"><PriorityDot p={o.priority} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[12.5px] text-muted-foreground">
                  No opportunities match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
