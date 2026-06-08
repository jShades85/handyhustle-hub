import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, Tab } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency, ownerNames } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Clock, MapPin, Phone, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  SERVICE_PLANS,
  STATUS_ORDER,
  statusMeta,
  tierMeta,
  type PlanStatus,
  type PlanTier,
  type ServicePlan,
} from "@/data/service-plans";

export const Route = createFileRoute("/service/service-plans")({
  head: () => ({ meta: [{ title: "Service Plans · Port City Sound & Security" }] }),
  component: ServicePlansPage,
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PlanStatus }) {
  const { label, cls } = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function TierBadge({ tier }: { tier: PlanTier }) {
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-medium", tierMeta[tier].cls)}>
      {tier}
    </span>
  );
}

function VisitsBar({ used, total }: { used: number; total: number }) {
  const pct = total === 0 ? 0 : Math.min(used / total, 1);
  const overHalf = pct > 0.75;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", overHalf ? "bg-amber-500" : "bg-primary")}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{used}/{total}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ServicePlansPage() {
  const { setMeta } = useMeta();
  const [plans, setPlans] = useState<ServicePlan[]>(SERVICE_PLANS);
  const [selected, setSelected] = useState<ServicePlan | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PlanStatus | "all">("all");

  const activePlans = useMemo(() => plans.filter((p) => p.status === "active" || p.status === "expiring"), [plans]);
  const mrr = useMemo(() => activePlans.reduce((sum, p) => sum + p.mrr, 0), [activePlans]);
  const expiringCount = useMemo(() => plans.filter((p) => p.status === "expiring").length, [plans]);

  useEffect(() => {
    setMeta({
      title: "Service Plans",
      subtitle: `${activePlans.length} active`,
      newLabel: "New Plan",
      onNew: () => setNewOpen(true),
    });
  }, [setMeta, activePlans.length]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: plans.length };
    STATUS_ORDER.forEach((s) => { c[s] = 0; });
    plans.forEach((p) => { c[p.status]++; });
    return c;
  }, [plans]);

  const filtered = useMemo(
    () => plans.filter((p) => statusFilter === "all" || p.status === statusFilter),
    [plans, statusFilter],
  );

  const updatePlan = useCallback((id: string, patch: Partial<ServicePlan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setSelected((prev) => (prev !== null && prev.id === id ? { ...prev, ...patch } : prev));
  }, []);

  return (
    <div className="flex flex-col">
      {/* Stat bar */}
      <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
        {[
          { label: "Active Plans",    value: String(activePlans.length) },
          { label: "Monthly Revenue", value: currency(mrr) },
          { label: "Annual Revenue",  value: currency(mrr * 12) },
          { label: "Expiring Soon",   value: String(expiringCount), warn: expiringCount > 0 },
        ].map(({ label, value, warn }) => (
          <div key={label} className="px-6 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={cn("mt-0.5 text-[20px] font-semibold tabular-nums", warn ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter tab bar */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-border px-4 py-2">
        {(["all", ...STATUS_ORDER] as (PlanStatus | "all")[]).map((s) => (
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
      </div>

      {/* Card grid */}
      <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((plan) => (
          <div
            key={plan.id}
            onClick={() => setSelected(plan)}
            className="group rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer flex flex-col gap-3"
          >
            {/* Header */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <TierBadge tier={plan.tier} />
                <StatusBadge status={plan.status} />
              </div>
              <div className="text-[13.5px] font-semibold leading-snug">{plan.customer}</div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">{plan.contact}</div>
            </div>

            {/* Covered systems */}
            <div className="flex flex-wrap gap-1">
              {plan.coveredSystems.map((s) => (
                <span key={s} className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">MRR</div>
                <div className="text-[12.5px] font-semibold tabular-nums">{currency(plan.mrr)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">SLA</div>
                <div className="text-[12px] text-foreground">{plan.slaResponse}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Renewal</div>
                <div className="text-[11.5px] font-mono text-muted-foreground">{plan.renewalDate}</div>
              </div>
            </div>

            {/* Footer: visits + manager */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="flex flex-col gap-0.5">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Visits</div>
                <VisitsBar used={plan.visitsUsed} total={plan.visitsPerYear} />
              </div>
              <div className="flex items-center gap-1.5">
                <Avatar initials={plan.accountManager} />
                <span className="text-[11.5px] text-muted-foreground">
                  {ownerNames[plan.accountManager]?.split(" ")[0]}
                </span>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 py-12 text-center text-[12.5px] text-muted-foreground">
            No plans match the current filter.
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        {selected !== null && (
          <PlanDrawer key={selected.id} plan={selected} onUpdate={updatePlan} />
        )}
      </Sheet>

      {/* New plan modal */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <NewPlanModal onClose={() => setNewOpen(false)} />
      </Dialog>
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function PlanDrawer({
  plan,
  onUpdate,
}: {
  plan: ServicePlan;
  onUpdate: (id: string, patch: Partial<ServicePlan>) => void;
}) {
  const [notes, setNotes] = useState(plan.notes);

  return (
    <SheetContent className="sm:max-w-115 flex flex-col p-0 gap-0">
      <SheetHeader className="border-b border-border px-5 py-4 pr-12">
        <p className="font-mono text-[11px] text-muted-foreground mb-1">{plan.id}</p>
        <SheetTitle className="text-[15px] font-semibold">{plan.customer}</SheetTitle>
        <div className="flex items-center gap-2 mt-1">
          <TierBadge tier={plan.tier} />
          <StatusBadge status={plan.status} />
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-3.5 text-[12.5px]">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Plan Tier</p>
            <select
              value={plan.tier}
              onChange={(e) => onUpdate(plan.id, { tier: e.target.value as PlanTier })}
              className="h-7 w-full rounded-md border border-border bg-surface px-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {(["Essential", "Standard", "Professional", "Elite"] as PlanTier[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
            <select
              value={plan.status}
              onChange={(e) => onUpdate(plan.id, { status: e.target.value as PlanStatus })}
              className="h-7 w-full rounded-md border border-border bg-surface px-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{statusMeta[s].label}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">MRR</p>
            <span className="font-semibold tabular-nums">{currency(plan.mrr)}</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Billing</p>
            <span>{plan.billingCycle}</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">SLA Response</p>
            <span>{plan.slaResponse}</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Account Mgr</p>
            <div className="flex items-center gap-1.5">
              <Avatar initials={plan.accountManager} />
              <span className="text-[12px]">{ownerNames[plan.accountManager]?.split(" ")[0]}</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Start Date</p>
            <span className="font-mono text-[12px]">{plan.startDate}</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Renewal Date</p>
            <span className="font-mono text-[12px]">{plan.renewalDate}</span>
          </div>
        </div>

        {/* Visits */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Visits This Year
          </p>
          <div className="flex items-center gap-3">
            <VisitsBar used={plan.visitsUsed} total={plan.visitsPerYear} />
            <span className="text-[12.5px] text-muted-foreground">
              {plan.visitsUsed} of {plan.visitsPerYear} used
              {plan.visitsPerYear - plan.visitsUsed > 0 && (
                <span className="text-foreground font-medium">
                  {" "}· {plan.visitsPerYear - plan.visitsUsed} remaining
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Covered systems */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Covered Systems</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.coveredSystems.map((s) => (
              <span key={s} className="rounded-md px-2 py-1 text-[11.5px] font-medium bg-muted text-foreground">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Contact / Site */}
        <div className="space-y-2.5 text-[12.5px]">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Contact</p>
            <div className="flex flex-col gap-1 text-muted-foreground">
              <span className="text-foreground font-medium">{plan.contact}</span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {plan.phone}
              </span>
              <span className="flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {plan.siteAddress}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onUpdate(plan.id, { notes })}
            placeholder="Add notes…"
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Activity */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Activity</p>
          <ul className="space-y-3">
            {plan.activity.map((a, i) => (
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
          onClick={() => onUpdate(plan.id, { status: "active" })}
          disabled={plan.status === "active"}
          className="w-full h-8 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-default transition-opacity flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Renew Plan
        </button>
        <button
          onClick={() => onUpdate(plan.id, { status: "cancelled" })}
          disabled={plan.status === "cancelled"}
          className="w-full h-8 rounded-md border border-border text-muted-foreground text-[12.5px] font-medium hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-default transition-colors"
        >
          Cancel Plan
        </button>
      </div>
    </SheetContent>
  );
}

// ─── New plan modal ───────────────────────────────────────────────────────────

function NewPlanModal({ onClose }: { onClose: () => void }) {
  const inputCls = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50";
  const selectCls = "w-full h-8 rounded-md border border-border bg-surface px-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "block text-[10px] uppercase tracking-wider text-muted-foreground mb-1";

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>New Service Plan</DialogTitle>
      </DialogHeader>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Customer</label>
          <input className={inputCls} placeholder="Company name" />
        </div>
        <div>
          <label className={labelCls}>Contact</label>
          <input className={inputCls} placeholder="Contact name" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} placeholder="(555) 000-0000" type="tel" />
        </div>
        <div>
          <label className={labelCls}>Plan Tier</label>
          <select className={selectCls}>
            {(["Essential", "Standard", "Professional", "Elite"] as PlanTier[]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Billing Cycle</label>
          <select className={selectCls}>
            <option>Monthly</option>
            <option>Quarterly</option>
            <option>Annual</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Start Date</label>
          <input className={inputCls} type="date" />
        </div>
        <div>
          <label className={labelCls}>Account Manager</label>
          <select className={selectCls}>
            {Object.entries(ownerNames).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Site Address</label>
          <input className={inputCls} placeholder="Street, City, State" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea
            rows={2}
            placeholder="Any special instructions or notes…"
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
          Create Plan
        </button>
      </div>
    </DialogContent>
  );
}
