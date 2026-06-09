import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useMeta } from "@/contexts/PageMetaContext";
import { Avatar } from "@/components/ui-bits";
import { currency } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  Archive, Briefcase, Calendar, ChevronDown, Clock, Copy,
  MapPin, MoreHorizontal, Pencil, Trash2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { statusMeta, type ProjectStatus } from "@/data/projects";
import { PhasesPanel } from "@/components/projects/PhasesPanel";
import { PartsPanel } from "@/components/projects/PartsPanel";
import { TeamPanel } from "@/components/projects/TeamPanel";
import { ActivityPanel } from "@/components/projects/ActivityPanel";

export const Route = createFileRoute("/operations/work-orders/$workOrderId")({
  component: WorkOrderDetailPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type WOTabId = "tasks" | "parts" | "team" | "activity";
type WOStatus = "scheduled" | "in-progress" | "on-hold" | "completed" | "cancelled";

interface DbWorkOrder {
  id: string;
  code: string | null;
  name: string;
  status: WOStatus;
  site_address: string | null;
  contract_value: number | null;
  budgeted_hours: number | null;
  scheduled_date: string | null;
  notes: string | null;
  company: { id: string; name: string } | null;
  assignee: { id: string; full_name: string | null } | null;
  opportunity: { id: string; title: string } | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const WO_STATUS_OPTIONS: Array<{ value: WOStatus }> = [
  { value: "scheduled" },
  { value: "in-progress" },
  { value: "on-hold" },
  { value: "completed" },
  { value: "cancelled" },
];

const TABS: Array<{ id: WOTabId; label: string }> = [
  { id: "tasks",    label: "Tasks" },
  { id: "parts",    label: "Parts" },
  { id: "team",     label: "Team" },
  { id: "activity", label: "Activity" },
];

// ─── Data ─────────────────────────────────────────────────────────────────────

async function fetchWorkOrderById(id: string): Promise<DbWorkOrder | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("id,code,name,status,site_address,contract_value,budgeted_hours,scheduled_date,notes,company:companies(id,name),assignee:user_profiles!assigned_to(id,full_name),opportunity:opportunities(id,title)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as DbWorkOrder;
}

async function updateWorkOrderStatus(id: string, status: WOStatus): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("work_orders").update({ status }).eq("id", id).select().single();
  if (error) throw error;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDropdown({
  status,
  onChange,
}: {
  status: WOStatus;
  onChange: (s: WOStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const { label, cls } = statusMeta[status as ProjectStatus];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-opacity hover:opacity-80",
          cls,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-border bg-popover py-1 shadow-md">
          {WO_STATUS_OPTIONS.map(({ value }) => {
            const { label: l, cls: c } = statusMeta[value as ProjectStatus];
            return (
              <button
                key={value}
                type="button"
                onClick={() => { onChange(value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-accent transition-colors",
                  status === value && "bg-accent/50",
                )}
              >
                <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium", c)}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {l}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkOrderDetailPage() {
  const { workOrderId } = Route.useParams();
  const { setMeta } = useMeta();
  const qc = useQueryClient();
  const [tab, setTab] = useState<WOTabId>("tasks");
  const statusInitialized = useRef(false);

  const { data: wo } = useQuery({
    queryKey: ["work-order", workOrderId],
    queryFn: () => fetchWorkOrderById(workOrderId),
  });

  const [status, setStatus] = useState<WOStatus>("scheduled");

  useEffect(() => {
    if (wo && !statusInitialized.current) {
      setStatus(wo.status);
      statusInitialized.current = true;
    }
  }, [wo]);

  const statusMutation = useMutation({
    mutationFn: (s: WOStatus) => updateWorkOrderStatus(workOrderId, s),
    onMutate: (s) => {
      setStatus(s);
      qc.setQueryData(["work-order", workOrderId], (old: DbWorkOrder | null | undefined) =>
        old ? { ...old, status: s } : old,
      );
    },
    onError: () => {
      if (wo) setStatus(wo.status);
    },
  });

  useEffect(() => {
    if (wo) {
      setMeta({ title: wo.name, subtitle: "Work Orders" });
    }
  }, [setMeta, wo]);

  if (wo === null) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Briefcase className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-[14px] font-medium">Work order not found</p>
        <p className="text-[12.5px] text-muted-foreground mt-1 mb-4">
          No record with ID &ldquo;{workOrderId}&rdquo; exists.
        </p>
        <Link
          to="/operations/work-orders"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground hover:opacity-90"
        >
          Back to Work Orders
        </Link>
      </div>
    );
  }

  if (!wo) {
    return <div className="flex items-center justify-center py-24 text-muted-foreground text-[13px]">Loading…</div>;
  }

  const techName = wo.assignee?.full_name ?? "Unassigned";
  const techInitials = techName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex flex-col">
      {/* Back nav */}
      <div className="border-b border-border px-5 py-2.5">
        <Link
          to="/operations/work-orders"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 13L5 8l5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All Work Orders
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-border px-5 py-5 space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-[19px] font-semibold tracking-tight leading-snug">
              {wo.code ? `${wo.code} — ` : ""}{wo.name}
            </h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{wo.company?.name ?? "—"}</p>
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{wo.site_address ?? "—"}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusDropdown status={status} onChange={(s) => statusMutation.mutate(s)} />
            <p className="text-[22px] font-semibold tabular-nums">
              {wo.contract_value != null ? currency(Number(wo.contract_value)) : "—"}
            </p>
            <p className="text-[10.5px] text-muted-foreground">Estimated Value</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
            <div className="flex items-center gap-2">
              <dt className="text-muted-foreground">Assigned</dt>
              <dd className="flex items-center gap-1.5">
                <Avatar initials={techInitials} className="!h-5 !w-5 !text-[8px] shrink-0" />
                <span className="font-medium">{techName}</span>
              </dd>
            </div>
            {wo.scheduled_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <dd className="font-medium">{wo.scheduled_date}</dd>
              </div>
            )}
            {wo.budgeted_hours != null && Number(wo.budgeted_hours) > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <dd className="font-medium">{wo.budgeted_hours}h est.</dd>
              </div>
            )}
          </dl>

          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[12px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button type="button" className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[12px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              <Clock className="h-3.5 w-3.5" />
              Log Hours
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors" aria-label="More options">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => console.log("duplicate")} className="gap-2">
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log("archive")} className="gap-2">
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => console.log("delete")} className="gap-2 text-destructive focus:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Sticky tab bar */}
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-background px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative h-9 rounded-md px-2.5 text-[12.5px] transition-colors",
              tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-px bg-primary" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {tab === "tasks"    && <PhasesPanel projectId={wo.id} projectType="work-order" />}
        {tab === "parts"    && <PartsPanel projectId={wo.id} />}
        {tab === "team"     && <TeamPanel projectId={wo.id} />}
        {tab === "activity" && <ActivityPanel projectId={wo.id} />}
      </div>
    </div>
  );
}
