import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, Tab } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { ownerNames } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  SERVICE_TICKETS,
  STATUS_ORDER,
  priorityMeta,
  statusMeta,
  type ServiceTicket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/data/service-tickets";

export const Route = createFileRoute("/service/service-tickets")({
  head: () => ({ meta: [{ title: "Service Tickets · Port City Sound & Security" }] }),
  component: ServiceTicketsPage,
});

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
  const [tickets, setTickets] = useState<ServiceTicket[]>(SERVICE_TICKETS);
  const [selected, setSelected] = useState<ServiceTicket | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");

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
    if (assignedFilter !== "all" && t.assignedTo !== assignedFilter) return false;
    return true;
  }), [tickets, statusFilter, priorityFilter, categoryFilter, assignedFilter]);

  const updateTicket = useCallback((id: string, patch: Partial<ServiceTicket>) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setSelected((prev) => (prev !== null && prev.id === id ? { ...prev, ...patch } : prev));
  }, []);

  const selectCls = "h-7 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="flex flex-col">
      {/* Status tab bar */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-border px-4 py-2">
        {(["all", ...STATUS_ORDER] as (TicketStatus | "all")[]).map((s) => (
          <Tab key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
            {s === "all" ? "All" : statusMeta[s].label}
            <span className={cn(
              "ml-1.5 rounded px-1 py-0.5 text-[10px] font-mono",
              statusFilter === s ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}>
              {statusCounts[s]}
            </span>
          </Tab>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | "all")} className={selectCls}>
            <option value="all">All Priorities</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{priorityMeta[p].label}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | "all")} className={selectCls}>
            <option value="all">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} className={selectCls}>
            <option value="all">All Techs</option>
            {Object.entries(ownerNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

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
              {filtered.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className="row-hover border-b border-border/60 cursor-pointer"
                >
                  <td className="py-2.5 px-3">
                    <div className="font-mono text-[11.5px] text-muted-foreground">{ticket.id}</div>
                    {ticket.onServicePlan && (
                      <span className="inline-block mt-0.5 rounded px-1 py-0.5 text-[9.5px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        Service Plan
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold leading-snug">{ticket.customer}</div>
                    <div className="text-[11px] text-muted-foreground">{ticket.contact}</div>
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
                    <div className="flex items-center gap-1.5">
                      <Avatar initials={ticket.assignedTo} />
                      <span className="text-[11.5px] text-muted-foreground">
                        {ownerNames[ticket.assignedTo]?.split(" ")[0]}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px] text-muted-foreground whitespace-nowrap">
                    {ticket.dateDue}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[12.5px] text-muted-foreground">
                    No tickets match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        {selected !== null && (
          <TicketDrawer key={selected.id} ticket={selected} onUpdate={updateTicket} />
        )}
      </Sheet>

      {/* New ticket modal */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <NewTicketModal onClose={() => setNewOpen(false)} />
      </Dialog>
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function TicketDrawer({
  ticket,
  onUpdate,
}: {
  ticket: ServiceTicket;
  onUpdate: (id: string, patch: Partial<ServiceTicket>) => void;
}) {
  const [notes, setNotes] = useState(ticket.notes);

  return (
    <SheetContent className="sm:max-w-115 flex flex-col p-0 gap-0">
      <SheetHeader className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[11px] text-muted-foreground">{ticket.id}</span>
          {ticket.onServicePlan && (
            <span className="rounded px-1.5 py-0.5 text-[9.5px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Service Plan
            </span>
          )}
        </div>
        <SheetTitle className="text-[14.5px] font-semibold leading-snug">{ticket.issue}</SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Status / Priority / Category row */}
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
            <span className="font-mono text-[12px]">{ticket.dateCreated}</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Due</p>
            <span className="font-mono text-[12px]">{ticket.dateDue}</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Assigned</p>
            <div className="flex items-center gap-1.5">
              <Avatar initials={ticket.assignedTo} />
              <span className="text-[12px]">{ownerNames[ticket.assignedTo]?.split(" ")[0]}</span>
            </div>
          </div>
        </div>

        {/* Customer / Contact / Site */}
        <div className="space-y-3 text-[12.5px]">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Customer</p>
            <span className="font-medium">{ticket.customer}</span>
            <span className="text-muted-foreground"> · {ticket.contact}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {ticket.phone}
          </div>
          <div className="flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {ticket.siteAddress}
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onUpdate(ticket.id, { notes })}
            placeholder="Add notes…"
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Activity */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Activity</p>
          <ul className="space-y-3">
            {ticket.activity.map((a, i) => (
              <li key={i} className="flex gap-2.5 text-[12px]">
                <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/50" />
                <div>
                  <div>
                    <span className="font-medium">{ownerNames[a.actor]?.split(" ")[0] ?? a.actor}</span>
                    {" — "}
                    {a.text}
                  </div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{a.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-border px-5 py-4 flex flex-col gap-2">
        <button
          onClick={() => onUpdate(ticket.id, { status: "resolved" })}
          disabled={ticket.status === "resolved" || ticket.status === "closed"}
          className="w-full h-8 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-default transition-opacity"
        >
          Mark Resolved
        </button>
        <button
          onClick={() => onUpdate(ticket.id, { status: "closed" })}
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

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const inputCls = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
  const selectCls = "w-full h-8 rounded-md border border-border bg-surface px-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "block text-[10px] uppercase tracking-wider text-muted-foreground mb-1";

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>New Service Ticket</DialogTitle>
      </DialogHeader>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Customer</label>
          <input className={inputCls} placeholder="Company or contact name" />
        </div>
        <div>
          <label className={labelCls}>Contact</label>
          <input className={inputCls} placeholder="Contact name" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} placeholder="(555) 000-0000" type="tel" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Site Address</label>
          <input className={inputCls} placeholder="Street, City, State" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Issue Description</label>
          <textarea
            rows={2}
            placeholder="Brief description of the problem…"
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={selectCls}>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select className={selectCls}>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{priorityMeta[p].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Assign To</label>
          <select className={selectCls}>
            {Object.entries(ownerNames).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Due Date</label>
          <input className={inputCls} type="date" />
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
          Create Ticket
        </button>
      </div>
    </DialogContent>
  );
}
