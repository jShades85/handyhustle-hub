import { Building2, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DealStage, Priority } from "@/lib/demo-data";

// Reserved for in-page section headers — do not delete
export function PageHeader({
  title, subtitle, actions, tabs,
}: { title: string; subtitle?: string; actions?: React.ReactNode; tabs?: React.ReactNode }) {
  return (
    <div className="border-b border-border bg-background">
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="flex items-center gap-1 px-4 pb-0">{tabs}</div>}
    </div>
  );
}

export function Tab({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative h-8 rounded-md px-2.5 text-[12.5px] transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && <span className="absolute inset-x-2 -bottom-px h-px bg-primary" />}
    </button>
  );
}

const stageMap: Record<DealStage, { label: string; cls: string }> = {
  lead: { label: "Lead", cls: "bg-status-lead/15 text-status-lead" },
  qualified: { label: "Qualified", cls: "bg-status-qualified/15 text-status-qualified" },
  proposal: { label: "Proposal", cls: "bg-status-proposal/15 text-status-proposal" },
  won: { label: "Won", cls: "bg-status-won/15 text-status-won" },
  lost: { label: "Lost", cls: "bg-status-lost/15 text-status-lost" },
};

export function StageChip({ stage }: { stage: DealStage }) {
  const s = stageMap[stage];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10.5px] font-medium", s.cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

const priMap: Record<Priority, { label: string; cls: string }> = {
  urgent: { label: "Urgent", cls: "text-priority-urgent" },
  high: { label: "High", cls: "text-priority-high" },
  med: { label: "Medium", cls: "text-priority-med" },
  low: { label: "Low", cls: "text-priority-low" },
};

export function PriorityDot({ p }: { p: Priority }) {
  const m = priMap[p];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px]", m.cls)}>
      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5"><circle cx="5" cy="5" r="4" fill="currentColor" /></svg>
      {m.label}
    </span>
  );
}

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  // deterministic hue
  let h = 0; for (let i = 0; i < initials.length; i++) h = (h * 31 + initials.charCodeAt(i)) % 360;
  return (
    <span
      className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-[9.5px] font-semibold text-white/95", className)}
      style={{ background: `linear-gradient(135deg, oklch(0.55 0.16 ${h}), oklch(0.42 0.18 ${(h + 40) % 360}))` }}
    >
      {initials}
    </span>
  );
}

export function StatCard({
  label, value, delta, accent,
}: { label: string; value: string; delta?: string; accent?: "up" | "down" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[11.5px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="text-[22px] font-semibold tracking-tight">{value}</div>
        {delta && (
          <span className={cn("text-[11px] font-medium", accent === "down" ? "text-destructive" : "text-status-won")}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const w = 120, h = 36, pad = 2;
  const pts = data.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (data.length - 1);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-9 w-full", className)} preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export interface JobCardProps {
  id: string;
  title: string;
  customer: string;
  status: DealStage;
  date: string;
  assignee: string;
  value: string;
  onClick: () => void;
}

export function JobCard({ id: _id, title, customer, status, date, assignee, value, onClick }: JobCardProps) {
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer px-3 py-2.5 hover:bg-elevated transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12.5px] font-semibold">{title}</span>
        <StageChip stage={status} />
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-muted-foreground">
        <span className="flex items-center gap-1 truncate">
          <Building2 className="h-3 w-3 shrink-0" />
          {customer}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <CalendarDays className="h-3 w-3 shrink-0" />
          {date}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11.5px]">
          <Avatar initials={assignee} />
          <span className="text-muted-foreground">{assignee}</span>
        </span>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{value}</span>
      </div>
    </Card>
  );
}
