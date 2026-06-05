import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { deals, quotes, projects, invoices, currency, phaseLabels } from "@/lib/demo-data";
import type { Project } from "@/lib/demo-data";
import { PageHeader, StageChip } from "@/components/ui-bits";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Briefcase, Receipt, Target, FileText, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard · Port City Sound & Security" }] }),
  component: Dashboard,
});

const CARD = "rounded-lg border border-border bg-card p-4";
const SECTION_TITLE = "text-[11px] uppercase tracking-wide text-muted-foreground";

const revenueData = [
  { month: "Jan", revenue: 98000 },
  { month: "Feb", revenue: 112000 },
  { month: "Mar", revenue: 124000 },
  { month: "Apr", revenue: 108000 },
  { month: "May", revenue: 131000 },
  { month: "Jun", revenue: 142800 },
];

const phaseColor: Record<Project["phase"], string> = {
  commission:  "var(--color-status-won)",
  procurement: "var(--color-status-qualified)",
  design:      "var(--color-status-proposal)",
  closeout:    "var(--color-primary)",
  install:     "var(--color-priority-high)",
};

type ActivityIcon = typeof Briefcase;

const activityItems: { icon: ActivityIcon; label: string; sub: string; time: string; iconColor: string }[] = [
  { icon: Briefcase, label: "Project started",       sub: "Penthouse cinema build · Northbeam Architects",        time: "2h ago",    iconColor: "text-status-qualified" },
  { icon: Receipt,   label: "Invoice sent",           sub: "$84,500 · Vertex Capital Partners",                    time: "3h ago",    iconColor: "text-primary"          },
  { icon: Target,    label: "Deal moved to Proposal", sub: "Surgical center A/V overhaul · Helio Health Systems",  time: "5h ago",    iconColor: "text-status-proposal"  },
  { icon: FileText,  label: "Quote accepted",         sub: "Q-2026-0415 · $184,500 · Northbeam Architects",        time: "Yesterday", iconColor: "text-status-won"       },
  { icon: Package,   label: "Inventory low",          sub: "Crestron MX-150 — 2 units remaining",                  time: "Yesterday", iconColor: "text-priority-urgent"  },
];

function RevenueTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-border bg-card px-2.5 py-1.5 text-[12px] shadow-sm">
      {currency(payload[0].value)}
    </div>
  );
}

function Dashboard() {
  const [chartStyle, setChartStyle] = useState<"bar" | "area">("bar");

  const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const pipeline = open.reduce((s, d) => s + d.value, 0);
  const quotesTotal = quotes.reduce((s, q) => s + q.total, 0);
  const outstandingInvoices = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + i.amount, 0);
  const activeProjects = projects.length;

  const phaseCounts = projects.reduce<Partial<Record<Project["phase"], number>>>((acc, p) => {
    acc[p.phase] = (acc[p.phase] ?? 0) + 1;
    return acc;
  }, {});

  const donutData = (Object.entries(phaseCounts) as [Project["phase"], number][]).map(
    ([phase, count]) => ({ name: phaseLabels[phase], value: count, color: phaseColor[phase] }),
  );

  const topDeals = [...deals]
    .filter((d) => d.stage !== "lost")
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={today} />
      <div className="p-5 space-y-3">

        {/* Row 1 — KPI stat cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className={CARD}>
            <div className={SECTION_TITLE}>Pipeline Value</div>
            <div className="mt-1 text-[26px] font-semibold tracking-tight">{currency(pipeline)}</div>
            <div className="mt-0.5 text-[11px] text-status-won">+12.4%</div>
          </div>
          <div className={CARD}>
            <div className={SECTION_TITLE}>Active Projects</div>
            <div className="mt-1 text-[26px] font-semibold tracking-tight">{String(activeProjects)}</div>
            <div className="mt-0.5 text-[11px] text-status-won">+2</div>
          </div>
          <div className={CARD}>
            <div className={SECTION_TITLE}>Quotes Out</div>
            <div className="mt-1 text-[26px] font-semibold tracking-tight">{currency(quotesTotal)}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{quotes.length} open</div>
          </div>
          <div className={CARD}>
            <div className={SECTION_TITLE}>Outstanding</div>
            <div className="mt-1 text-[26px] font-semibold tracking-tight">{currency(outstandingInvoices)}</div>
            {outstandingInvoices > 0 && (
              <div className="mt-0.5 text-[11px] text-destructive">
                {invoices.filter((i) => i.status !== "paid").length} invoices
              </div>
            )}
          </div>
        </div>

        {/* Row 2 — Revenue trend + Job status */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">

          <div className={cn(CARD, "lg:col-span-2")}>
            <div className="mb-3 flex items-center justify-between">
              <span className={SECTION_TITLE}>Revenue Trend</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setChartStyle("bar")}
                  className={cn(
                    "rounded border border-border px-2 py-0.5 text-[11px]",
                    chartStyle === "bar"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Bar
                </button>
                <button
                  onClick={() => setChartStyle("area")}
                  className={cn(
                    "rounded border border-border px-2 py-0.5 text-[11px]",
                    chartStyle === "area"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Area
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              {chartStyle === "bar" ? (
                <BarChart data={revenueData}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", fontSize: 11 }}
                  />
                  <YAxis hide domain={["dataMin - 15000", "dataMax + 15000"]} />
                  <Tooltip content={<RevenueTooltip />} cursor={{ fill: "var(--color-muted-foreground)", opacity: 0.08 }} />
                  <Bar dataKey="revenue" fill="var(--color-primary)" radius={[3, 3, 0, 0]} barSize={32} />
                </BarChart>
              ) : (
                <AreaChart data={revenueData}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", fontSize: 11 }}
                  />
                  <YAxis hide domain={["dataMin - 15000", "dataMax + 15000"]} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-primary)"
                    strokeWidth={1.5}
                    fill="var(--color-primary)"
                    fillOpacity={0.12}
                    dot={false}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className={CARD}>
            <div className={cn(SECTION_TITLE, "mb-3")}>Job Status</div>
            <div className="relative">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[26px] font-semibold leading-none">{projects.length}</span>
                <span className="mt-1 text-[11px] text-muted-foreground">Projects</span>
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                  <span className="flex-1 text-muted-foreground">{d.name}</span>
                  <span className="font-medium tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3 — Activity feed + Top opportunities */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">

          <div className={cn(CARD, "lg:col-span-2")}>
            <div className={cn(SECTION_TITLE, "mb-3")}>Recent Activity</div>
            <ul>
              {activityItems.map((item, i) => {
                const Icon = item.icon;
                const isLast = i === activityItems.length - 1;
                return (
                  <li key={i} className={cn("flex gap-3", !isLast && "border-b border-border pb-3 mb-3")}>
                    <div className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted p-1.5",
                      item.iconColor,
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium">{item.label}</div>
                      <div className="text-[11.5px] text-muted-foreground">{item.sub} · {item.time}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={CARD}>
            <div className={cn(SECTION_TITLE, "mb-3")}>Top Opportunities</div>
            <ul>
              {topDeals.map((d, i) => (
                <li
                  key={d.id}
                  className={cn(
                    "flex items-start justify-between py-2.5",
                    i < topDeals.length - 1 && "border-b border-border",
                  )}
                >
                  <div className="mr-3 min-w-0">
                    <div className="truncate text-[13px] font-medium">{d.title}</div>
                    <div className="text-[11.5px] text-muted-foreground">{d.company}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-[13px] font-medium tabular-nums">{currency(d.value)}</span>
                    <div className="mt-1"><StageChip stage={d.stage} /></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
