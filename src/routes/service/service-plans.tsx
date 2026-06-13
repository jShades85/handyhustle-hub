import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { FormSelect } from "@/components/ui/form-select";
import type { TablesUpdate } from "@/lib/supabase/types";
import { AlertCircle, Clock, DollarSign, MapPin, Phone, RefreshCw, Shield, TrendingUp } from "lucide-react";
import { StatBar, StatItem, PageTabs, PageTab } from "@/components/ui/page-components";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DrawerHeader } from "@/components/ui/drawer-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { statusMeta, tierMeta, STATUS_ORDER, type PlanStatus, type PlanTier } from "@/data/service-plans";

export const Route = createFileRoute("/service/service-plans")({
  head: () => ({ meta: [{ title: "Service Plans · BearingPro" }] }),
  component: ServicePlansPage,
});

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityEntry {
  time: string;
  actor: string;
  text: string;
}

interface ServicePlan {
  id: string;
  code: string;
  customerName: string;
  companyId: string | null;
  contactName: string;
  contactId: string | null;
  phone: string;
  siteAddress: string;
  tier: PlanTier;
  coveredSystems: string[];
  mrr: number;
  billingCycle: "Monthly" | "Quarterly" | "Annual";
  slaResponse: string;
  visitsPerYear: number;
  visitsUsed: number;
  startDate: string | null;
  renewalDate: string | null;
  status: PlanStatus;
  accountManagerId: string | null;
  accountManagerName: string | null;
  notes: string;
  activity: ActivityEntry[];
}

type DbPlan = {
  id: string;
  code: string;
  customer_name: string;
  company_id: string | null;
  contact_name: string;
  contact_id: string | null;
  phone: string;
  site_address: string;
  tier: string;
  covered_systems: string[];
  mrr: number;
  billing_cycle: string;
  sla_response: string;
  visits_per_year: number;
  visits_used: number;
  start_date: string | null;
  renewal_date: string | null;
  status: string;
  account_manager_id: string | null;
  notes: string;
  activity: ActivityEntry[];
  user_profiles: { full_name: string | null } | null;
};

function toPlan(r: DbPlan): ServicePlan {
  return {
    id:               r.id,
    code:             r.code,
    customerName:     r.customer_name,
    companyId:        r.company_id,
    contactName:      r.contact_name,
    contactId:        r.contact_id,
    phone:            r.phone,
    siteAddress:      r.site_address,
    tier:             r.tier as PlanTier,
    coveredSystems:   r.covered_systems ?? [],
    mrr:              Number(r.mrr),
    billingCycle:     r.billing_cycle as ServicePlan["billingCycle"],
    slaResponse:      r.sla_response,
    visitsPerYear:    r.visits_per_year,
    visitsUsed:       r.visits_used,
    startDate:        r.start_date,
    renewalDate:      r.renewal_date,
    status:           r.status as PlanStatus,
    accountManagerId: r.account_manager_id,
    accountManagerName: r.user_profiles?.full_name ?? null,
    notes:            r.notes,
    activity:         (r.activity as ActivityEntry[]) ?? [],
  };
}

const COVERED_SYSTEM_OPTIONS = [
  "Security", "AV / Audio", "Networking", "Access Control",
  "Surveillance", "Smart Home",
] as const;

const SLA_OPTIONS = ["2 hours", "4 hours", "8 hours", "Next business day"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PlanStatus }) {
  const { label, cls } = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap", cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function TierBadge({ tier }: { tier: PlanTier }) {
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium", tierMeta[tier].cls)}>
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
      <span className="text-xs font-mono text-muted-foreground tabular-nums">{used}/{total}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ServicePlansPage() {
  const { setMeta } = useMeta();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<ServicePlan | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PlanStatus | "all">("all");

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["service-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_plans")
        .select("*, user_profiles!account_manager_id(full_name)")
        .order("code", { ascending: false });
      if (error) throw error;
      return (data as unknown as DbPlan[]).map(toPlan);
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data as { id: string; full_name: string | null }[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"service_plans"> }) => {
      const { data, error } = await supabase
        .from("service_plans")
        .update(patch)
        .eq("id", id)
        .select("*, user_profiles!account_manager_id(full_name)")
        .single();
      if (error) throw error;
      return toPlan(data as unknown as DbPlan);
    },
    onSuccess: (updated) => {
      qc.setQueryData<ServicePlan[]>(["service-plans"], (prev = []) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      setSelected((prev) => (prev?.id === updated.id ? updated : prev));
    },
  });

  const activePlans = useMemo(() => plans.filter((p) => p.status === "active" || p.status === "expiring"), [plans]);
  const mrr = useMemo(() => activePlans.reduce((sum, p) => sum + p.mrr, 0), [activePlans]);
  const expiringCount = useMemo(() => plans.filter((p) => p.status === "expiring").length, [plans]);

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

  const openNew = useCallback(() => setNewOpen(true), []);

  useEffect(() => {
    setMeta({
      title: "Service Plans",
      subtitle: `${activePlans.length} active`,
      newLabel: "New Plan",
      onNew: openNew,
    });
  }, [setMeta, activePlans.length, openNew]);

  function handleUpdate(id: string, patch: TablesUpdate<"service_plans">) {
    updateMutation.mutate({ id, patch });
  }

  return (
    <div className={cn("flex flex-col", isLoading && "opacity-50")}>
      <StatBar>
        <StatItem icon={Shield}      label="Active Plans"    value={String(activePlans.length)} />
        <StatItem icon={DollarSign}  label="Monthly Revenue" value={currency(mrr)} />
        <StatItem icon={TrendingUp}  label="Annual Revenue"  value={currency(mrr * 12)} />
        <StatItem icon={AlertCircle} label="Expiring Soon"   value={String(expiringCount)} accent={expiringCount > 0} accentColor="amber" />
      </StatBar>

      <PageTabs>
        {(["all", ...STATUS_ORDER] as (PlanStatus | "all")[]).map((s) => (
          <PageTab key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} count={statusCounts[s]}>
            {s === "all" ? "All" : statusMeta[s].label}
          </PageTab>
        ))}
      </PageTabs>

      <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((plan) => (
          <div
            key={plan.id}
            onClick={() => setSelected(plan)}
            className="group rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer flex flex-col gap-3"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <TierBadge tier={plan.tier} />
                <StatusBadge status={plan.status} />
              </div>
              <div className="text-base font-semibold leading-snug">{plan.customerName}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{plan.contactName}</div>
            </div>

            <div className="flex flex-wrap gap-1">
              {plan.coveredSystems.map((s) => (
                <span key={s} className="rounded px-1.5 py-0.5 text-2xs font-medium bg-muted text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
              <div>
                <div className="text-2xs text-muted-foreground uppercase tracking-wider mb-0.5">MRR</div>
                <div className="text-sm font-semibold tabular-nums">{currency(plan.mrr)}</div>
              </div>
              <div>
                <div className="text-2xs text-muted-foreground uppercase tracking-wider mb-0.5">SLA</div>
                <div className="text-sm text-foreground">{plan.slaResponse}</div>
              </div>
              <div>
                <div className="text-2xs text-muted-foreground uppercase tracking-wider mb-0.5">Renewal</div>
                <div className="text-xs font-mono text-muted-foreground">{plan.renewalDate ?? "—"}</div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="flex flex-col gap-0.5">
                <div className="text-2xs text-muted-foreground uppercase tracking-wider">Visits</div>
                <VisitsBar used={plan.visitsUsed} total={plan.visitsPerYear} />
              </div>
              {plan.accountManagerName && (
                <div className="flex items-center gap-1.5">
                  <Avatar initials={plan.accountManagerName.split(" ").map((w) => w[0]).join("").slice(0, 2)} />
                  <span className="text-xs text-muted-foreground">
                    {plan.accountManagerName.split(" ")[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <div className="col-span-3 py-12 text-center text-sm text-muted-foreground">
            No plans match the current filter.
          </div>
        )}
      </div>

      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        {selected !== null && (
          <PlanDrawer
            key={selected.id}
            plan={selected}
            teamMembers={teamMembers}
            onUpdate={handleUpdate}
            isPending={updateMutation.isPending}
          />
        )}
      </Sheet>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <NewPlanModal
          teamMembers={teamMembers}
          planCount={plans.length}
          onClose={() => setNewOpen(false)}
          onCreated={(plan) => {
            qc.setQueryData<ServicePlan[]>(["service-plans"], (prev = []) => [plan, ...prev]);
            setNewOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function PlanDrawer({
  plan,
  teamMembers,
  onUpdate,
  isPending,
}: {
  plan: ServicePlan;
  teamMembers: { id: string; full_name: string | null }[];
  onUpdate: (id: string, patch: TablesUpdate<"service_plans">) => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState(plan.notes);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    setNotes(plan.notes);
  }, [plan.notes]);

  return (
    <SheetContent hideClose className="sm:max-w-115 flex flex-col p-0 gap-0">
      <DrawerHeader
        eyebrow={<p className="font-mono text-xs text-muted-foreground">{plan.code}</p>}
        title={plan.customerName}
      >
        <div className="flex items-center gap-2">
          <TierBadge tier={plan.tier} />
          <StatusBadge status={plan.status} />
        </div>
      </DrawerHeader>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-3.5 text-sm">
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Plan Tier</p>
            <FormSelect
              value={plan.tier}
              disabled={isPending}
              onChange={(e) => onUpdate(plan.id, { tier: e.target.value })}
              className="h-7 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              {(["Essential", "Standard", "Professional", "Elite"] as PlanTier[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </FormSelect>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Status</p>
            <FormSelect
              value={plan.status}
              disabled={isPending}
              onChange={(e) => onUpdate(plan.id, { status: e.target.value })}
              className="h-7 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{statusMeta[s].label}</option>
              ))}
            </FormSelect>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">MRR</p>
            <span className="font-semibold tabular-nums">{currency(plan.mrr)}</span>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Billing</p>
            <span>{plan.billingCycle}</span>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">SLA Response</p>
            <span>{plan.slaResponse}</span>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Account Mgr</p>
            {plan.accountManagerName ? (
              <div className="flex items-center gap-1.5">
                <Avatar initials={plan.accountManagerName.split(" ").map((w) => w[0]).join("").slice(0, 2)} />
                <span className="text-sm">{plan.accountManagerName.split(" ")[0]}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Start Date</p>
            <span className="font-mono text-sm">{plan.startDate ?? "—"}</span>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Renewal Date</p>
            <span className="font-mono text-sm">{plan.renewalDate ?? "—"}</span>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Annual</p>
            <span className="font-semibold tabular-nums">{currency(plan.mrr * 12)}</span>
          </div>
        </div>

        {/* Visits */}
        <div>
          <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-2">
            Visits This Year
          </p>
          <div className="flex items-center gap-3">
            <VisitsBar used={plan.visitsUsed} total={plan.visitsPerYear} />
            <span className="text-sm text-muted-foreground">
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
          <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-2">Covered Systems</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.coveredSystems.map((s) => (
              <span key={s} className="rounded-md px-2 py-1 text-xs font-medium bg-muted text-foreground">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Contact / Site */}
        <div className="space-y-2.5 text-sm">
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">Contact</p>
            <div className="flex flex-col gap-1 text-muted-foreground">
              <span className="text-foreground font-medium">{plan.contactName}</span>
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
          <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => { if (notes !== plan.notes) onUpdate(plan.id, { notes }); }}
            placeholder="Add notes…"
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Activity */}
        {plan.activity.length > 0 && (
          <div>
            <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-2">Activity</p>
            <ul className="space-y-3">
              {plan.activity.map((a, i) => (
                <li key={i} className="flex gap-2.5 text-sm">
                  <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/50" />
                  <div>
                    <div>
                      <span className="font-medium">{a.actor.split(" ")[0]}</span>
                      {" — "}
                      {a.text}
                    </div>
                    <div className="mt-0.5 font-mono text-2xs text-muted-foreground">{a.time}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-border px-5 py-4 flex flex-col gap-2">
        <button
          onClick={() => onUpdate(plan.id, { status: "active" })}
          disabled={plan.status === "active" || isPending}
          className="w-full h-8 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-default transition-opacity flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Renew Plan
        </button>
        <button
          onClick={() => onUpdate(plan.id, { status: "cancelled" })}
          disabled={plan.status === "cancelled" || isPending}
          className="w-full h-8 rounded-md border border-border text-muted-foreground text-sm font-medium hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-default transition-colors"
        >
          Cancel Plan
        </button>
      </div>
    </SheetContent>
  );
}

// ─── New plan modal ───────────────────────────────────────────────────────────

const TIERS: PlanTier[] = ["Essential", "Standard", "Professional", "Elite"];
const BILLING_CYCLES = ["Monthly", "Quarterly", "Annual"] as const;

function NewPlanModal({
  teamMembers,
  planCount,
  onClose,
  onCreated,
}: {
  teamMembers: { id: string; full_name: string | null }[];
  planCount: number;
  onClose: () => void;
  onCreated: (plan: ServicePlan) => void;
}) {
  const qc = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<PlanTier>("Standard");
  const [billingCycle, setBillingCycle] = useState<"Monthly" | "Quarterly" | "Annual">("Monthly");
  const [slaResponse, setSlaResponse] = useState("8 hours");
  const [mrr, setMrr] = useState("");
  const [visitsPerYear, setVisitsPerYear] = useState("2");
  const [startDate, setStartDate] = useState("");
  const [accountManagerId, setAccountManagerId] = useState(teamMembers[0]?.id ?? "");
  const [siteAddress, setSiteAddress] = useState("");
  const [coveredSystems, setCoveredSystems] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const tenantId = qc.getQueryData<{ id: string }>(["tenant"])?.id;
      const year = new Date().getFullYear();
      const num = String(planCount + 1).padStart(3, "0");
      const code = `SP-${year}-${num}`;

      const { data, error } = await supabase
        .from("service_plans")
        .insert({
          tenant_id:          tenantId!,
          code,
          customer_name:      customerName.trim(),
          contact_name:       contactName.trim(),
          phone:              phone.trim(),
          tier,
          billing_cycle:      billingCycle,
          sla_response:       slaResponse,
          mrr:                parseFloat(mrr) || 0,
          visits_per_year:    parseInt(visitsPerYear) || 1,
          visits_used:        0,
          start_date:         startDate || null,
          site_address:       siteAddress.trim(),
          covered_systems:    coveredSystems,
          account_manager_id: accountManagerId || null,
          status:             "pending",
          notes:              notes.trim(),
        })
        .select("*, user_profiles!account_manager_id(full_name)")
        .single();
      if (error) throw error;
      return toPlan(data as unknown as DbPlan);
    },
    onSuccess: onCreated,
  });

  const inputCls = "w-full h-8 rounded-md border border-border bg-surface px-2.5 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50";
  const labelCls = "block text-2xs uppercase tracking-wider text-muted-foreground mb-1";

  function toggleSystem(s: string) {
    setCoveredSystems((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  const canSubmit = customerName.trim().length > 0;

  return (
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>New Service Plan</DialogTitle>
      </DialogHeader>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Customer *</label>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputCls} placeholder="Company name" />
        </div>
        <div>
          <label className={labelCls}>Contact</label>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} placeholder="Contact name" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="(555) 000-0000" type="tel" />
        </div>
        <div>
          <label className={labelCls}>Plan Tier</label>
          <FormSelect value={tier} onChange={(e) => setTier(e.target.value as PlanTier)}>
            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </FormSelect>
        </div>
        <div>
          <label className={labelCls}>Billing Cycle</label>
          <FormSelect value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as typeof billingCycle)}>
            {BILLING_CYCLES.map((b) => <option key={b} value={b}>{b}</option>)}
          </FormSelect>
        </div>
        <div>
          <label className={labelCls}>MRR ($)</label>
          <input value={mrr} onChange={(e) => setMrr(e.target.value)} className={inputCls} placeholder="0.00" type="number" min="0" step="0.01" />
        </div>
        <div>
          <label className={labelCls}>SLA Response</label>
          <FormSelect value={slaResponse} onChange={(e) => setSlaResponse(e.target.value)}>
            {SLA_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
        </div>
        <div>
          <label className={labelCls}>Visits / Year</label>
          <input value={visitsPerYear} onChange={(e) => setVisitsPerYear(e.target.value)} className={inputCls} type="number" min="1" />
        </div>
        <div>
          <label className={labelCls}>Start Date</label>
          <input value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} type="date" />
        </div>
        <div>
          <label className={labelCls}>Account Manager</label>
          <FormSelect value={accountManagerId} onChange={(e) => setAccountManagerId(e.target.value)}>
            <option value="">Unassigned</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name ?? m.id}</option>
            ))}
          </FormSelect>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Site Address</label>
          <input value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} className={inputCls} placeholder="Street, City, State" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Covered Systems</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {COVERED_SYSTEM_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSystem(s)}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium border transition-colors",
                  coveredSystems.includes(s)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any special instructions or notes…"
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="h-8 rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => createMutation.mutate()}
          disabled={!canSubmit || createMutation.isPending}
          className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {createMutation.isPending ? "Creating…" : "Create Plan"}
        </button>
      </div>
    </DialogContent>
  );
}
