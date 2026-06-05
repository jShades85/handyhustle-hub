import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { deals, quotes, projects, invoices, currency } from "@/lib/demo-data";
import { StageChip } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import {
  Briefcase, Receipt, Target, FileText, Package,
  AlertTriangle, Clock, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard · Port City Sound & Security" }] }),
  component: Dashboard,
});

const CARD = "rounded-lg border border-border bg-card p-4";
const LABEL = "text-[11px] uppercase tracking-wide text-muted-foreground";
const SPARKLINE_DATA = [55, 63, 70, 61, 74, 100];

type ActivityIcon = typeof Briefcase;
type ActivityItem = { Icon: ActivityIcon; label: string; sub: string; iconColor: string };

const activityItems: ActivityItem[] = [
  { Icon: Briefcase, label: "Project started",        sub: "Penthouse cinema build · Northbeam Architects · 2h ago",              iconColor: "text-status-won"       },
  { Icon: Receipt,   label: "Invoice sent",            sub: "$84,500 · Vertex Capital Partners · 3h ago",                          iconColor: "text-primary"          },
  { Icon: Target,    label: "Deal moved to Proposal",  sub: "Surgical center A/V overhaul · Helio Health Systems · 5h ago",        iconColor: "text-status-proposal"  },
  { Icon: FileText,  label: "Quote accepted",          sub: "Q-2026-0415 · $184,500 · Northbeam Architects · Yesterday",           iconColor: "text-status-won"       },
  { Icon: Package,   label: "Inventory low",           sub: "Crestron MX-150 — 2 units remaining · Yesterday",                     iconColor: "text-priority-urgent"  },
];

function daysUntil(dateStr: string): number {
  return (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}

function Dashboard() {
  const { setMeta } = useMeta();
  useEffect(() => {
    setMeta({
      title: "Dashboard",
      subtitle: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    });
  }, [setMeta]);

  const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const pipeline = open.reduce((s, d) => s + d.value, 0);
  const activeProjects = projects.length;
  const quotesTotal = quotes.reduce((s, q) => s + q.total, 0);
  const outstandingInvoices = invoices.filter((i) => i.status !== "paid");
  const outstandingTotal = outstandingInvoices.reduce((s, i) => s + i.amount, 0);
  const wonMTD = deals.filter((d) => d.stage === "won").reduce((s, d) => s + d.value, 0);

  const closingSoon = open
    .sort((a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime())
    .slice(0, 3);

  const atRisk = projects
    .filter((p) => p.spent / p.budget > 0.85 || new Date(p.due) < new Date())
    .slice(0, 3);

  return (
    <div>
      <div className="p-5 space-y-3">

        {/* Row 1 — 5 stat cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">

          <div className={CARD}>
            <div className={LABEL}>Pipeline Value</div>
            <div className="mt-1 text-[22px] font-semibold tracking-tight">{currency(pipeline)}</div>
            <div className="mt-0.5 text-[11px] text-status-won">+12.4%</div>
          </div>

          <div className={CARD}>
            <div className={LABEL}>Active Projects</div>
            <div className="mt-1 text-[22px] font-semibold tracking-tight">{String(activeProjects)}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">+2 this month</div>
          </div>

          <div className={CARD}>
            <div className={LABEL}>Quotes Out</div>
            <div className="mt-1 text-[22px] font-semibold tracking-tight">{currency(quotesTotal)}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{quotes.length} open</div>
          </div>

          <div className={CARD}>
            <div className={LABEL}>Outstanding</div>
            <div className="mt-1 text-[22px] font-semibold tracking-tight">{currency(outstandingTotal)}</div>
            <div className="mt-0.5 text-[11px] text-destructive">{outstandingInvoices.length} invoices</div>
          </div>

          <div className={CARD}>
            <div className={LABEL}>Revenue MTD</div>
            <div className="mt-1 text-[22px] font-semibold tracking-tight">{currency(wonMTD)}</div>
            <div className="mt-0.5 text-[11px] text-status-won">+8.2% vs last mo</div>
            <div className="mt-2 flex h-7 items-end gap-[3px]">
              {SPARKLINE_DATA.map((pct, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-primary"
                  style={{ height: `${pct}%` }}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Row 2 — Activity feed + right column */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">

          {/* Recent Activity */}
          <div className={cn(CARD, "lg:col-span-2")}>
            <div className={cn(LABEL, "mb-3")}>Recent Activity</div>
            <ul>
              {activityItems.map((item, i) => {
                const Icon = item.Icon;
                const isLast = i === activityItems.length - 1;
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-3 py-2.5",
                      !isLast && "border-b border-border",
                    )}
                  >
                    <div className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted",
                      item.iconColor,
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium">{item.label}</div>
                      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{item.sub}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right column — stacked cards */}
          <div className="flex flex-col gap-3">

            {/* Closing Soon */}
            <div className={CARD}>
              <div className={cn(LABEL, "mb-1")}>Closing Soon</div>
              {closingSoon.length === 0 ? (
                <div className="py-3 text-[12.5px] text-muted-foreground">No deals closing soon</div>
              ) : (
                <ul>
                  {closingSoon.map((d, i) => {
                    const soon = daysUntil(d.closeDate) <= 30;
                    const isLast = i === closingSoon.length - 1;
                    return (
                      <li
                        key={d.id}
                        className={cn(
                          "flex items-start justify-between py-2.5",
                          !isLast && "border-b border-border",
                        )}
                      >
                        <div className="mr-2 min-w-0">
                          <div className="truncate text-[13px] font-medium">{d.title}</div>
                          <div className="text-[11.5px] text-muted-foreground">{d.company}</div>
                          <div className={cn(
                            "mt-0.5 flex items-center gap-1 text-[11px]",
                            soon ? "text-destructive" : "text-muted-foreground",
                          )}>
                            <Calendar className="h-2.5 w-2.5" />
                            {d.closeDate}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end">
                          <span className="text-[13px] font-medium tabular-nums">{currency(d.value)}</span>
                          <div className="mt-1"><StageChip stage={d.stage} /></div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* At-Risk Projects */}
            <div className={CARD}>
              <div className={cn(LABEL, "mb-1")}>At-Risk Projects</div>
              {atRisk.length === 0 ? (
                <div className="py-3 flex items-center gap-1.5 text-[12.5px] text-status-won">
                  <span>✓</span>
                  <span className="text-muted-foreground">All projects on track</span>
                </div>
              ) : (
                <ul>
                  {atRisk.map((p, i) => {
                    const overBudget = p.spent / p.budget > 0.85;
                    const pastDue = new Date(p.due) < new Date();
                    const isLast = i === atRisk.length - 1;
                    return (
                      <li
                        key={p.id}
                        className={cn(
                          "flex items-start justify-between py-2.5",
                          !isLast && "border-b border-border",
                        )}
                      >
                        <div className="mr-2 min-w-0">
                          <div className="truncate text-[13px] font-medium">{p.name}</div>
                          <div className="text-[11.5px] text-muted-foreground">{p.company}</div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                            {overBudget && (
                              <span className="flex items-center gap-1 text-[11px] text-destructive">
                                <AlertTriangle className="h-2.5 w-2.5" /> Over budget
                              </span>
                            )}
                            {pastDue && (
                              <span className="flex items-center gap-1 text-[11px] text-priority-high">
                                <Clock className="h-2.5 w-2.5" /> Past due
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-[13px] font-medium tabular-nums">
                          {currency(p.budget)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
