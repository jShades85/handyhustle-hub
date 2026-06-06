import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency, ownerNames } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PROJECTS, STATUS_OPTIONS, statusMeta,
  type ProjectStatus,
} from "@/data/projects";

export const Route = createFileRoute("/work-orders/")({
  head: () => ({ meta: [{ title: "Work Orders · Crosscurrent" }] }),
  component: WorkOrdersListPage,
});

// ─── Data ─────────────────────────────────────────────────────────────────────

const WORK_ORDERS = PROJECTS.filter((p) => p.type === "work-order");

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, cls } = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function WorkOrdersListPage() {
  const { setMeta } = useMeta();
  const navigate = useNavigate();
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

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
    return WORK_ORDERS.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.customer.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, statusFilter]);

  const openDetail = useCallback(
    (id: string) => navigate({ to: "/work-orders/$workOrderId", params: { workOrderId: id } }),
    [navigate],
  );

  const selectCls = "h-7 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search work orders…"
            className="h-7 w-full rounded-md border border-border bg-surface pl-7 pr-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "all")}
          className={selectCls}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <span className="text-[11px] font-mono text-muted-foreground">
          {filtered.length} of {WORK_ORDERS.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface/50 border-b border-border">
              <tr className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-4 text-left font-medium">Work Order</th>
                <th className="py-2 px-3 text-left font-medium">Customer</th>
                <th className="py-2 px-3 text-left font-medium">Status</th>
                <th className="py-2 px-3 text-right font-medium">Contract Value</th>
                <th className="py-2 px-3 text-left font-medium">Start Date</th>
                <th className="py-2 px-3 text-left font-medium">Target End</th>
                <th className="py-2 px-3 text-left font-medium">PM</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => openDetail(p.id)}
                  className="border-b border-border/60 cursor-pointer hover:bg-accent/40 transition-colors"
                >
                  <td className="py-2.5 px-4">
                    <div className="font-semibold leading-snug">{p.name}</div>
                    <div className="text-[10.5px] font-mono text-muted-foreground">{p.code}</div>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{p.customer}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-muted-foreground">
                    {currency(p.contractValue)}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{p.startDate}</td>
                  <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{p.targetEndDate}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <Avatar initials={p.pm} />
                      <span className="text-[11.5px] text-muted-foreground">
                        {ownerNames[p.pm]?.split(" ")[0] ?? p.pm}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[12.5px] text-muted-foreground">
                    No work orders match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Work Order modal stub */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Work Order</DialogTitle>
          </DialogHeader>
          <p className="text-[12.5px] text-muted-foreground">
            Work order creation form coming soon.
          </p>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setNewOpen(false)}
              className="h-8 rounded-md bg-primary px-4 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
